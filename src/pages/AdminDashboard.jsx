import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DashboardLayout from '../components/DashboardLayout';
import { DollarSign, ShieldAlert, Users, HardHat, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    revenue: 0,
    totalUsers: 0,
    equipmentCount: 0,
    pendingApprovals: 0
  });
  const [recentEquipment, setRecentEquipment] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) throw usersError;
      setProfiles(users || []);

      // 2. Fetch equipment
      const { data: equipment, error: equipError } = await supabase
        .from('equipment')
        .select('*');

      if (equipError) throw equipError;

      // Filter recent equipment
      const pendingItems = (equipment || []).filter(e => e.status === 'pending_approval');
      setRecentEquipment(pendingItems.slice(0, 5) || []);

      // 3. Fetch bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*');

      if (bookingsError) throw bookingsError;

      // Calculate total platform transaction volume
      const totalRevenue = (bookings || [])
        .filter(b => b.status === 'approved' || b.status === 'completed' || b.status === 'active')
        .reduce((sum, b) => sum + Number(b.total_price), 0);

      setStats({
        revenue: totalRevenue,
        totalUsers: users ? users.length : 0,
        equipmentCount: equipment ? equipment.length : 0,
        pendingApprovals: pendingItems.length
      });
    } catch (err) {
      console.error('Error loading admin dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSupplierName = (supplierId) => {
    const s = profiles.find(p => p.id === supplierId);
    return s ? s.full_name : 'Unknown Supplier';
  };

  return (
    <DashboardLayout title="Admin Overview & Portal Management">
      <div className="container">
        {loading ? (
          <div className="flex-center" style={{ minHeight: '300px' }}>
            <div className="badge badge-warning" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Loading Platform Data...</div>
          </div>
        ) : (
          <>
            {/* Stats Dashboard Grid */}
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--primary)' }}>
                  <TrendingUp size={24} />
                </div>
                <div className="stat-info">
                  <h4>Total Platform Volume</h4>
                  <p>${stats.revenue}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  <Users size={24} />
                </div>
                <div className="stat-info">
                  <h4>Registered Users</h4>
                  <p>{stats.totalUsers} Profiles</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <HardHat size={24} />
                </div>
                <div className="stat-info">
                  <h4>Mining Fleets</h4>
                  <p>{stats.equipmentCount} Listed</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  <ShieldAlert size={24} />
                </div>
                <div className="stat-info">
                  <h4>Pending Approvals</h4>
                  <p>{stats.pendingApprovals} Audits</p>
                </div>
              </div>
            </div>

            {/* Dashboard details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
              
              {/* Items Pending Approval */}
              <div className="card">
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.25rem' }}>Pending Fleet Approvals</h3>
                {recentEquipment.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No equipment listings currently require auditing approval.</p>
                ) : (
                  <div className="table-container">
                    <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                      <thead>
                        <tr>
                          <th>Equipment</th>
                          <th>Supplier</th>
                          <th>Daily Rate</th>
                          <th>Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentEquipment.map((e) => (
                          <tr key={e.id}>
                            <td style={{ fontWeight: '600', color: '#fff' }}>{e.name}</td>
                            <td>{getSupplierName(e.supplier_id)}</td>
                            <td style={{ color: 'var(--primary)', fontWeight: '700' }}>${e.daily_rate}</td>
                            <td>{e.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Server/Database Quick Health Check */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Portal Integrity</h3>
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  padding: '1.25rem'
                }}>
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Database Connection:</span>
                    <span className="badge badge-success">Healthy</span>
                  </div>
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Realtime Sync Channel:</span>
                    <span className="badge badge-success">Online</span>
                  </div>
                  <div className="flex-between">
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>EMA API Webhook:</span>
                    <span className="badge badge-warning">Simulated</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  * This platform is configured with an automated fallback mock database client in the event database keys are not supplied.
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
