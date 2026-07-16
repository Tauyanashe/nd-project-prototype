import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DashboardLayout from '../components/DashboardLayout';
import { Users, Mail, Phone, Briefcase } from 'lucide-react';

export default function AdminUsers() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (profileId, newRole) => {
    if (!window.confirm(`Are you sure you want to change this user role to ${newRole}?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: newRole })
        .eq('id', profileId);

      if (error) throw error;
      fetchUsers();
    } catch (err) {
      console.error('Error updating user type:', err);
      alert('Could not update user role.');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="badge badge-danger">Admin</span>;
      case 'supplier':
        return <span className="badge badge-warning">Supplier</span>;
      case 'customer':
      default:
        return <span className="badge badge-success">Customer</span>;
    }
  };

  return (
    <DashboardLayout title="System Users & Accounts">
      <div className="container">
        
        {loading ? (
          <div className="flex-center" style={{ minHeight: '300px' }}>
            <div className="badge badge-warning" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Loading Users...</div>
          </div>
        ) : profiles.length === 0 ? (
          <div className="card flex-center" style={{ minHeight: '260px', flexDirection: 'column', gap: '1rem' }}>
            <Users size={48} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>No user profiles registered in database.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th>Company Name</th>
                    <th>Role</th>
                    <th>Registered Date</th>
                    <th style={{ textAlign: 'right' }}>Modify Role</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td style={{ fontWeight: '600', color: '#fff' }}>{profile.full_name}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                          {profile.email}
                        </span>
                      </td>
                      <td>
                        {profile.phone ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                            {profile.phone}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {profile.company_name ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Briefcase size={14} style={{ color: 'var(--text-muted)' }} />
                            {profile.company_name}
                          </span>
                        ) : '—'}
                      </td>
                      <td>{getRoleBadge(profile.user_type)}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(profile.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {profile.user_type !== 'admin' && (
                          <select
                            className="form-input"
                            value={profile.user_type}
                            onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                            style={{ width: '130px', padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                          >
                            <option value="customer">Customer</option>
                            <option value="supplier">Supplier</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
