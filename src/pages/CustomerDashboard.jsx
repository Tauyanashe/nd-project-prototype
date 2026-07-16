import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import DashboardLayout from '../components/DashboardLayout';
import StarRating from '../components/StarRating';
import { Search, MapPin, DollarSign, Calendar, MessageSquare, AlertCircle, HardHat } from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  
  // Booking Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  const navigate = useNavigate();

  const categories = ['All', 'Excavators', 'Dump Trucks', 'Drill Rigs', 'Generators', 'Compressors', 'Crushers', 'Other'];
  const locations = ['All', 'Harare', 'Bulawayo', 'Gweru', 'Kwekwe', 'Mutare', 'Zvishavane', 'Kadoma', 'Masvingo', 'Hwange', 'Other'];

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      // Get all approved & available equipment
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('status', 'available');

      if (error) throw error;
      setEquipmentList(data || []);
    } catch (err) {
      console.error('Error fetching equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (item) => {
    try {
      // Check if chat room already exists
      const { data: existingRooms, error: selectError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('customer_id', user.id)
        .eq('supplier_id', item.supplier_id)
        .eq('equipment_id', item.id);

      if (selectError) throw selectError;

      if (existingRooms && existingRooms.length > 0) {
        navigate('/chat', { state: { selectedChatId: existingRooms[0].id } });
      } else {
        // Create new room
        const { data: newRoom, error: insertError } = await supabase
          .from('chat_rooms')
          .insert({
            customer_id: user.id,
            supplier_id: item.supplier_id,
            equipment_id: item.id
          });

        if (insertError) throw insertError;
        
        // Wait briefly for storage syncing
        const roomId = newRoom ? newRoom[0]?.id : 'cr-1'; // fallback mock ID if return format differs
        
        // Find the newly created room ID by querying
        const { data: rooms } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('customer_id', user.id)
          .eq('supplier_id', item.supplier_id)
          .eq('equipment_id', item.id);
        
        navigate('/chat', { state: { selectedChatId: rooms?.[0]?.id || 'cr-1' } });
      }
    } catch (err) {
      console.error('Error starting chat:', err);
      alert('Could not open chat room. Please try again.');
    }
  };

  const handleOpenBooking = (item) => {
    setSelectedItem(item);
    setStartDate('');
    setEndDate('');
    setBookingError('');
    setBookingSuccess(false);
  };

  const calculateTotalCost = () => {
    if (!startDate || !endDate || !selectedItem) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
    return isNaN(diffDays) || diffDays < 0 ? 0 : diffDays * selectedItem.daily_rate;
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');
    setSubmittingBooking(true);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setBookingError('End date must be on or after the start date.');
      setSubmittingBooking(false);
      return;
    }

    try {
      const totalCost = calculateTotalCost();
      const { error } = await supabase
        .from('bookings')
        .insert({
          customer_id: user.id,
          equipment_id: selectedItem.id,
          start_date: startDate,
          end_date: endDate,
          total_price: totalCost,
          status: 'pending'
        });

      if (error) throw error;

      setBookingSuccess(true);
      setTimeout(() => {
        setSelectedItem(null);
        fetchEquipment();
      }, 1500);
    } catch (err) {
      setBookingError(err.message || 'Failed to submit booking request.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  const filteredEquipment = equipmentList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesLocation = selectedLocation === 'All' || item.location === selectedLocation;
    return matchesSearch && matchesCategory && matchesLocation;
  });

  return (
    <DashboardLayout title="Explore Mining Equipment">
      <div className="container">
        {/* Filters Panel */}
        <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
            
            {/* Search */}
            <div style={{ flex: 2, minWidth: '240px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search equipment (e.g. excavator, drill...)"
                className="form-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>

            {/* Category Filter */}
            <div style={{ flex: 1, minWidth: '160px' }}>
              <select
                className="form-input"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map((cat, i) => (
                  <option key={i} value={cat}>{cat} Category</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div style={{ flex: 1, minWidth: '160px' }}>
              <select
                className="form-input"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                {locations.map((loc, i) => (
                  <option key={i} value={loc}>{loc} Location</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Equipment Listings */}
        {loading ? (
          <div className="flex-center" style={{ minHeight: '300px' }}>
            <div className="badge badge-warning" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Loading Inventory...</div>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="card flex-center" style={{ minHeight: '260px', flexDirection: 'column', gap: '1rem' }}>
            <HardHat size={48} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>No equipment listings match your criteria.</p>
          </div>
        ) : (
          <div className="grid-cols-3">
            {filteredEquipment.map((item) => (
              <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                <div style={{ height: '200px', width: '100%', overflow: 'hidden', position: 'relative', background: '#1c2230' }}>
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1579294800821-2941910f8bc3?auto=format&fit=crop&q=80&w=600'}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px' }}>
                    <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.9)', backdropFilter: 'blur(4px)' }}>
                      Available
                    </span>
                  </div>
                </div>

                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {item.category}
                  </span>
                  <h3 style={{ fontSize: '1.25rem', margin: '0.25rem 0 0.5rem 0', fontWeight: '700', lineHeight: '1.3' }}>{item.name}</h3>
                  <div style={{ marginBottom: '0.85rem' }}>
                    <StarRating equipmentId={item.id} readOnly={true} size={15} />
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1, marginBottom: '1.25rem' }}>
                    {item.description ? item.description.substring(0, 100) + (item.description.length > 100 ? '...' : '') : 'No description provided.'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <MapPin size={16} style={{ color: 'var(--primary)' }} />
                    <span>Location: <strong>{item.location}, Zimbabwe</strong></span>
                  </div>

                  <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Daily Hire Rate</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center' }}>
                        <DollarSign size={20} style={{ color: 'var(--primary)', marginRight: '-2px' }} />
                        {item.daily_rate}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleStartChat(item)}
                        className="btn btn-secondary"
                        title="Chat with Supplier"
                        style={{ padding: '0.65rem 0.75rem' }}
                      >
                        <MessageSquare size={18} />
                      </button>
                      <button
                        onClick={() => handleOpenBooking(item)}
                        className="btn btn-primary"
                        style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
                      >
                        Hire Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Booking Modal */}
        {selectedItem && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ animation: 'fadeIn 0.25s ease-out' }}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Hire Equipment</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{selectedItem.name}</p>
              </div>

              {bookingSuccess ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ fontSize: '3rem', color: 'var(--secondary)', marginBottom: '1rem' }}>✓</div>
                  <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Booking Request Sent!</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>The supplier has been notified to review your hire request.</p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit}>
                  {bookingError && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      marginBottom: '1.25rem',
                      color: '#f87171',
                      fontSize: '0.9rem'
                    }}>
                      <AlertCircle size={18} />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Start Date</label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={startDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">End Date</label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={endDate}
                        min={startDate || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Daily Rate:</span>
                      <span>${selectedItem.daily_rate} / day</span>
                    </div>
                    <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <span style={{ fontWeight: '700' }}>Estimated Total:</span>
                      <span style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '1.25rem' }}>
                        ${calculateTotalCost()}
                      </span>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedItem(null)}
                      disabled={submittingBooking}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submittingBooking || !startDate || !endDate}
                    >
                      {submittingBooking ? 'Submitting...' : 'Confirm Hire Request'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
