import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import DashboardLayout from '../components/DashboardLayout';
import StarRating from '../components/StarRating';
import { Calendar, DollarSign, XCircle, AlertTriangle } from 'lucide-react';

export default function CustomerBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingsAndEquipment();
  }, []);

  const fetchBookingsAndEquipment = async () => {
    setLoading(true);
    try {
      // Fetch user's bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', user.id);

      if (bookingsError) throw bookingsError;

      // Fetch all equipment to map relationships (database-compatible join fallback)
      const { data: equipData, error: equipError } = await supabase
        .from('equipment')
        .select('*');

      if (equipError) throw equipError;

      setBookings(bookingsData || []);
      setEquipmentList(equipData || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking request?')) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;
      fetchBookingsAndEquipment();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert('Could not cancel booking. Please try again.');
    }
  };

  const getEquipmentName = (equipId) => {
    const equip = equipmentList.find(e => e.id === equipId);
    return equip ? equip.name : 'Unknown Equipment';
  };

  const getEquipmentLocation = (equipId) => {
    const equip = equipmentList.find(e => e.id === equipId);
    return equip ? equip.location : 'Unknown';
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
        return <span className="badge badge-secondary" style={{ border: '1px solid rgba(255, 255, 255, 0.2)' }}>Completed</span>;
    }
  };

  return (
    <DashboardLayout title="My Equipment Bookings">
      <div className="container">
        {loading ? (
          <div className="flex-center" style={{ minHeight: '300px' }}>
            <div className="badge badge-warning" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Loading Bookings...</div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="card flex-center" style={{ minHeight: '260px', flexDirection: 'column', gap: '1rem' }}>
            <Calendar size={48} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>You have not submitted any hire requests yet.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Equipment Name</th>
                    <th>Location</th>
                    <th>Hire Dates</th>
                    <th>Total Cost</th>
                    <th>Status</th>
                    <th>Submitted On</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td style={{ fontWeight: '600', color: '#fff' }}>
                        <div>{getEquipmentName(booking.equipment_id)}</div>
                        {(booking.status === 'approved' || booking.status === 'active' || booking.status === 'completed') && (
                          <div style={{ marginTop: '0.5rem', fontWeight: 'normal' }}>
                            <StarRating equipmentId={booking.equipment_id} userId={user.id} size={13} />
                          </div>
                        )}
                      </td>
                      <td>{getEquipmentLocation(booking.equipment_id)}, Zimbabwe</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Calendar size={14} style={{ color: 'var(--primary)' }} />
                          {booking.start_date} to {booking.end_date}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                        ${booking.total_price}
                      </td>
                      <td>{getStatusBadge(booking.status)}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(booking.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {booking.status === 'pending' && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="btn btn-danger"
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                          >
                            <XCircle size={14} style={{ marginRight: '4px' }} />
                            Cancel
                          </button>
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
