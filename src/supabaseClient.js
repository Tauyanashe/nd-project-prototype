import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ──────────────────────────────────────────────────────────────────────────────
// Mock database seed data (pre-loaded for offline / demo purposes)
// ──────────────────────────────────────────────────────────────────────────────
const defaultMockData = {
  profiles: [],
  equipment: [],
  bookings: [],
  chat_rooms: [],
  messages: [],
  ratings: []
};

// ──────────────────────────────────────────────────────────────────────────────
// LocalStorage helpers
// ──────────────────────────────────────────────────────────────────────────────
const DB_KEY = 'zim_mining_db';
const USER_KEY = 'zim_mining_user';

const initMockDB = () => {
  if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify(defaultMockData));
  }
};

const getDB = () => {
  initMockDB();
  return JSON.parse(localStorage.getItem(DB_KEY));
};

const saveDB = (data) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('mock_db_update', { detail: data }));
};

// ──────────────────────────────────────────────────────────────────────────────
// Query Builder (chainable, promise-based)
// ──────────────────────────────────────────────────────────────────────────────
class QueryBuilder {
  constructor(table) {
    this._table = table;
    this._filters = [];
    this._orderField = null;
    this._ascending = true;
    this._isInsert = false;
    this._insertData = null;
    this._isUpdate = false;
    this._updateData = null;
    this._isDelete = false;
  }

  // ─── Filter ─────────────────────────────────────────────────────────────────
  eq(field, value) {
    this._filters.push({ field, value });
    return this;
  }

  order(field, { ascending = true } = {}) {
    this._orderField = field;
    this._ascending = ascending;
    return this;
  }

  // ─── Terminal: resolve to { data, error } ───────────────────────────────────
  then(resolve, reject) {
    return Promise.resolve(this._execute()).then(resolve, reject);
  }

  _execute() {
    try {
      const db = getDB();
      let rows = [...(db[this._table] || [])];

      // apply filters
      for (const { field, value } of this._filters) {
        rows = rows.filter(r => r[field] === value);
      }

      // apply ordering
      if (this._orderField) {
        rows.sort((a, b) => {
          if (a[this._orderField] < b[this._orderField]) return this._ascending ? -1 : 1;
          if (a[this._orderField] > b[this._orderField]) return this._ascending ? 1 : -1;
          return 0;
        });
      }

      return { data: rows, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Mock Supabase Client
// ──────────────────────────────────────────────────────────────────────────────
class MockSupabaseClient {
  constructor() {
    initMockDB();
    this._authCallbacks = []; // unified callback list
    this.auth = this._buildAuth();
  }

  _buildAuth() {
    const self = this;

    return {
      async getSession() {
        const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
        return { data: { session: user ? { user } : null }, error: null };
      },

      onAuthStateChange(callback) {
        self._authCallbacks.push(callback);

        // Fire immediately with current state (synchronously)
        const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
        setTimeout(() => {
          callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null);
        }, 0);

        return {
          data: {
            subscription: {
              unsubscribe() {
                self._authCallbacks = self._authCallbacks.filter(cb => cb !== callback);
              }
            }
          }
        };
      },

      async signInWithPassword({ email }) {
        const db = getDB();
        const user = db.profiles.find(p => p.email === email);
        if (!user) return { data: null, error: { message: 'No account found with that email. Please check your credentials.' } };

        localStorage.setItem(USER_KEY, JSON.stringify(user));
        const session = { user };
        self._authCallbacks.forEach(cb => cb('SIGNED_IN', session));

        return { data: { user, session }, error: null };
      },

      async signUp({ email, options }) {
        const db = getDB();
        if (db.profiles.find(p => p.email === email)) {
          return { data: null, error: { message: 'An account with this email already exists.' } };
        }

        const id = 'usr-' + Math.random().toString(36).substr(2, 9);
        const newProfile = {
          id, email,
          full_name: options?.data?.full_name || 'Mining Operator',
          user_type: options?.data?.user_type || 'customer',
          company_name: options?.data?.company_name || '',
          phone: options?.data?.phone || '',
          created_at: new Date().toISOString()
        };

        db.profiles.push(newProfile);
        saveDB(db);

        localStorage.setItem(USER_KEY, JSON.stringify(newProfile));
        const session = { user: newProfile };
        self._authCallbacks.forEach(cb => cb('SIGNED_IN', session));

        return { data: { user: newProfile, session }, error: null };
      },

      async signOut() {
        localStorage.removeItem(USER_KEY);
        self._authCallbacks.forEach(cb => cb('SIGNED_OUT', null));
        return { error: null };
      }
    };
  }

  // ─── Table Access ─────────────────────────────────────────────────────────
  from(table) {
    return {
      select() {
        return new QueryBuilder(table);
      },

      insert(records) {
        const db = getDB();
        const items = Array.isArray(records) ? records : [records];
        const inserted = items.map(r => ({
          id: Math.random().toString(36).substr(2, 12),
          created_at: new Date().toISOString(),
          ...r
        }));
        db[table] = [...(db[table] || []), ...inserted];
        saveDB(db);
        return Promise.resolve({ data: inserted, error: null });
      },

      update(changes) {
        return {
          eq(field, value) {
            const db = getDB();
            db[table] = (db[table] || []).map(row =>
              row[field] === value ? { ...row, ...changes } : row
            );
            saveDB(db);
            return Promise.resolve({ data: null, error: null });
          }
        };
      },

      delete() {
        return {
          eq(field, value) {
            const db = getDB();
            db[table] = (db[table] || []).filter(row => row[field] !== value);
            saveDB(db);
            return Promise.resolve({ data: null, error: null });
          }
        };
      }
    };
  }

  // ─── Realtime channel mock ─────────────────────────────────────────────────
  channel(_name) {
    const handlers = [];

    const listen = () => {
      window.addEventListener('mock_db_update', (e) => {
        handlers.forEach(({ callback }) => {
          const db = e.detail;
          const latest = db?.messages?.[db.messages.length - 1];
          if (latest) callback({ new: latest });
        });
      });
    };

    return {
      on(event, filter, callback) {
        handlers.push({ event, filter, callback });
        return this;
      },
      subscribe() {
        listen();
        return { unsubscribe() { /* cleanup handled by page unmount */ } };
      }
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Export: real Supabase if configured, else mock
// ──────────────────────────────────────────────────────────────────────────────
export const supabase =
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('PLACEHOLDER')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : new MockSupabaseClient();
