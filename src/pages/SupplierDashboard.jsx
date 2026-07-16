import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import DashboardLayout from '../components/DashboardLayout';
import { DollarSign, Database, CalendarClock, TrendingUp, Key } from 'lucide-react';

export default function SupplierDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    earnings: 0,
    totalEquipment: 0,
    activeRentals: 0,
    pendingBookings: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSupplierData();
  }, []);

  const fetchSupplierData = async () => {
    setLoading(true);
    try {
      // 1. Fetch supplier equipment
      const { data: myEquipment, error: equipError } = await supabase
        .from('equipment')
        .select('*')
        .eq('supplier_id', user.id);

      if (equipError) throw equipError;
      setEquipmentList(myEquipment || []);

      // 2. Fetch all bookings
      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*');

      if (bookingsError) throw bookingsError;

      // Filter bookings that belong to this supplier's equipment
      const myEquipIds = (myEquipment || []).map(e => e.id);
      const myBookings = (allBookings || []).filter(b => myEquipIds.includes(b.equipment_id));

      setRecentBookings(myBookings.slice(0, 5) || []); // recent 5 bookings

      // Calculate stats
      const approvedEarnings = myBookings
        .filter(b => b.status === 'approved' || b.status === 'completed' || b.status === 'active')
        .reduce((sum, b) => sum + Number(b.total_price), 0);

      const activeRents = myBookings.filter(b => b.status === 'active' || b.status === 'approved').length;
      const pendingBks = myBookings.filter(b => b.status === 'pending').length;

      setStats({
        earnings: approvedEarnings,
        totalEquipment: myEquipment ? myEquipment.length : 0,
        activeRentals: activeRents,
        pendingBookings: pendingBks
      });
    } catch (err) {
      console.error('Error fetching supplier stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEquipmentName = (equipId) => {
    const equip = equipmentList.find(e => e.id === equipId);
    return equip ? equip.name : 'Unknown Equipment';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
      case 'active':
        return <span className="badge badge-success">{status}</span>;
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'rejected':
      case 'cancelled':
        return <span className="badge badge-danger">{status}</span>;
      case 'completed':
      default:
        return <span className="badge badge-secondary">Completed</span>;
    }
  };

  return (
    <DashboardLayout title="Supplier Earnings & Overview">
      <div className="container">
        {loading ? (
          <div className="flex-center" style={{ minHeight: '300px' }}>
            <div className="badge badge-warning" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Loading Overview...</div>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <DollarSign size={24} />
                </div>
                <div className="stat-info">
                  <h4>Total Revenue</h4>
                  <p>${stats.earnings}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <Database size={24} />
                </div>
                <div className="stat-info">
                  <h4>Total Fleet</h4>
                  <p>{stats.totalEquipment} Rigs</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  <TrendingUp size={24} />
                </div>
                <div className="stat-info">
                  <h4>Active Hires</h4>
                  <p>{stats.activeRentals}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--primary)' }}>
                  <CalendarClock size={24} />
                </div>
                <div className="stat-info">
                  <h4>Pending Requests</h4>
                  <p>{stats.pendingBookings}</p>
                </div>
              </div>
            </div>

            {/* Main grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
              
              {/* Recent Bookings */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.25rem' }}>Recent Booking Activity</h3>
                {recentBookings.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No recent hire requests received.</p>
                ) : (
                  <div className="table-container">
                    <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                      <thead>
                        <tr>
                          <th>Equipment</th>
                          <th>Dates</th>
                          <th>Total Price</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentBookings.map((b) => (
                          <tr key={b.id}>
                            <td style={{ fontWeight: '600', color: '#fff' }}>{getEquipmentName(b.equipment_id)}</td>
                            <td>{b.start_date} to {b.end_date}</td>
                            <td style={{ color: 'var(--primary)', fontWeight: '700' }}>${b.total_price}</td>
                            <td>{getStatusBadge(b.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Tips & Platform State */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Platform Updates</h3>
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  padding: '1rem',
                  fontSize: '0.9rem'
                }}>
                  <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '0.25rem' }}>Mining Boom in Mashonaland</strong>
                  <p style={{ color: 'var(--text-muted)' }}>High demand for drill rigs and excavators reported around Bindura and Mazowe. Update your inventory pricing accordingly.</p>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  padding: '1rem',
                  fontSize: '0.9rem'
                }}>
                  <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '0.25rem' }}>Compliance Reminder</strong>
                  <p style={{ color: 'var(--text-muted)' }}>Ensure all listed heavy machinery contains valid EMA certificates. Admin audits are scheduled weekly.</p>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
