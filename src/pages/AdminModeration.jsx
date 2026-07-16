import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DashboardLayout from '../components/DashboardLayout';
import { ClipboardCheck, Check, X, MapPin, DollarSign } from 'lucide-react';

export default function AdminModeration() {
  const [pendingItems, setPendingItems] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingEquipment();
  }, []);

  const fetchPendingEquipment = async () => {
    setLoading(true);
    try {
      // 1. Fetch pending equipment
      const { data: equip, error: equipError } = await supabase
        .from('equipment')
        .select('*')
        .eq('status', 'pending_approval');

      if (equipError) throw equipError;
      setPendingItems(equip || []);

      // 2. Fetch profiles
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) throw usersError;
      setProfiles(users || []);
    } catch (err) {
      console.error('Error fetching moderation items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (itemId) => {
    if (!window.confirm('Approve this listing? It will immediately become viewable for customers to rent.')) return;
    try {
      const { error } = await supabase
        .from('equipment')
        .update({ status: 'available' })
        .eq('id', itemId);

      if (error) throw error;
      fetchPendingEquipment();
    } catch (err) {
      console.error('Error approving item:', err);
      alert('Failed to approve listing.');
    }
  };

  const handleReject = async (itemId) => {
    if (!window.confirm('Reject this listing? This will move it back to supplier maintenance.')) return;
    try {
      const { error } = await supabase
        .from('equipment')
        .update({ status: 'maintenance' })
        .eq('id', itemId);

      if (error) throw error;
      fetchPendingEquipment();
    } catch (err) {
      console.error('Error rejecting item:', err);
      alert('Failed to reject listing.');
    }
  };

  const getSupplierName = (supplierId) => {
    const s = profiles.find(p => p.id === supplierId);
    return s ? s.full_name : 'Unknown Supplier';
  };

  const getSupplierCompany = (supplierId) => {
    const s = profiles.find(p => p.id === supplierId);
    return s ? s.company_name : 'Independent Supplier';
  };

  return (
    <DashboardLayout title="Rig Auditing & Moderation Panel">
      <div className="container">
        {loading ? (
          <div className="flex-center" style={{ minHeight: '300px' }}>
            <div className="badge badge-warning" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Loading Pending Audits...</div>
          </div>
        ) : pendingItems.length === 0 ? (
          <div className="card flex-center" style={{ minHeight: '260px', flexDirection: 'column', gap: '1rem' }}>
            <ClipboardCheck size={48} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>No mining equipment is currently waiting for approval.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {pendingItems.map((item) => (
              <div key={item.id} className="card" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', padding: 0, overflow: 'hidden' }}>
                {/* Image */}
                <div style={{ height: '220px', overflow: 'hidden', background: '#1c2230' }}>
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1579294800821-2941910f8bc3?auto=format&fit=crop&q=80&w=600'}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                      <span className="badge badge-warning">Pending Audit</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase' }}>
                        {item.category}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.5rem', color: '#fff' }}>
                      {item.name}
                    </h3>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      {item.description || 'No description provided.'}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin size={14} style={{ color: 'var(--primary)' }} />
                        {item.location}, Zimbabwe
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <DollarSign size={14} style={{ color: 'var(--primary)' }} />
                        ${item.daily_rate} / day
                      </span>
                      <span>
                        Supplier: <strong>{getSupplierName(item.supplier_id)}</strong> ({getSupplierCompany(item.supplier_id)})
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <button
                      onClick={() => handleReject(item.id)}
                      className="btn btn-secondary"
                      style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '0.5rem 1rem' }}
                    >
                      <X size={16} />
                      Reject Listing
                    </button>
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 1.25rem' }}
                    >
                      <Check size={16} />
                      Approve & Publish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
