import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import DashboardLayout from '../components/DashboardLayout';
import { Calendar, CheckCircle, XCircle, User, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SupplierRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [customerProfiles, setCustomerProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequestsData();
  }, []);

  const fetchRequestsData = async () => {
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
      const myRequests = (allBookings || []).filter(b => myEquipIds.includes(b.equipment_id));

      // Sort with 'pending' bookings first, then by date desc
      myRequests.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setRequests(myRequests);

      // 3. Fetch customer profiles for mapping names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;
      setCustomerProfiles(profiles || []);

    } catch (err) {
      console.error('Error fetching requests data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    if (!window.confirm(`Are you sure you want to ${newStatus} this booking request?`)) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;
      fetchRequestsData();
    } catch (err) {
      console.error('Error updating booking status:', err);
      alert('Could not update booking. Please try again.');
    }
  };

  const handleStartChat = async (booking) => {
    try {
      // Check if chat room already exists
      const { data: existingRooms } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('customer_id', booking.customer_id)
        .eq('supplier_id', user.id)
        .eq('equipment_id', booking.equipment_id);

      if (existingRooms && existingRooms.length > 0) {
        navigate('/chat', { state: { selectedChatId: existingRooms[0].id } });
      } else {
        // Create new room
        const { data: newRoom } = await supabase
          .from('chat_rooms')
          .insert({
            customer_id: booking.customer_id,
            supplier_id: user.id,
            equipment_id: booking.equipment_id
          });

        const roomId = newRoom ? newRoom[0]?.id : 'cr-1';
        
        // Find newly created room
        const { data: rooms } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('customer_id', booking.customer_id)
          .eq('supplier_id', user.id)
          .eq('equipment_id', booking.equipment_id);

        navigate('/chat', { state: { selectedChatId: rooms?.[0]?.id || 'cr-1' } });
      }
    } catch (err) {
      console.error('Error launching chat from request:', err);
    }
  };

  const getEquipmentName = (equipId) => {
    const equip = equipmentList.find(e => e.id === equipId);
    return equip ? equip.name : 'Unknown Equipment';
  };

  const getCustomerName = (custID) => {
    const prof = customerProfiles.find(p => p.id === custID);
    return prof ? prof.full_name : 'Unknown Customer';
  };

  const getCustomerCompany = (custID) => {
    const prof = customerProfiles.find(p => p.id === custID);
    return prof ? prof.company_name : 'Independent Operator';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
      case 'active':
        return <span className="badge badge-success">{status}</span>;
      case 'pending':
        return <span className="badge badge-warning">Pending Review</span>;
      case 'rejected':
      case 'cancelled':
        return <span className="badge badge-danger">{status}</span>;
      case 'completed':
      default:
        return <span className="badge badge-secondary">Completed</span>;
    }
  };

  return (
    <DashboardLayout title="Hiring Requests & Demands">
      <div className="container">
        
        {loading ? (
          <div className="flex-center" style={{ minHeight: '300px' }}>
            <div className="badge badge-warning" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Loading Requests...</div>
          </div>
        ) : requests.length === 0 ? (
          <div className="card flex-center" style={{ minHeight: '260px', flexDirection: 'column', gap: '1rem' }}>
            <Calendar size={48} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>You have no incoming equipment bookings yet.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Customer Name</th>
                    <th>Company</th>
                    <th>Hire Duration</th>
                    <th>Earnings</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: '600', color: '#fff' }}>
                        {getEquipmentName(b.equipment_id)}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <User size={14} style={{ color: 'var(--primary)' }} />
                          {getCustomerName(b.customer_id)}
                        </span>
                      </td>
                      <td>{getCustomerCompany(b.customer_id)}</td>
                      <td>{b.start_date} to {b.end_date}</td>
                      <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                        ${b.total_price}
                      </td>
                      <td>{getStatusBadge(b.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {b.status === 'pending' ? (
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleStartChat(b)}
                              className="btn btn-secondary"
                              style={{ padding: '0.45rem 0.65rem' }}
                              title="Chat with Customer"
                            >
                              <MessageSquare size={14} />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(b.id, 'approved')}
                              className="btn btn-primary"
                              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                            >
                              <CheckCircle size={14} style={{ marginRight: '4px' }} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(b.id, 'rejected')}
                              className="btn btn-danger"
                              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                            >
                              <XCircle size={14} style={{ marginRight: '4px' }} />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartChat(b)}
                            className="btn btn-secondary"
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                          >
                            <MessageSquare size={14} style={{ marginRight: '4px' }} />
                            Chat history
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
