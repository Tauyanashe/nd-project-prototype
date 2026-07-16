import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import DashboardLayout from '../components/DashboardLayout';
import { Plus, Trash2, Edit, AlertCircle, Hammer } from 'lucide-react';

export default function SupplierInventory() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Excavators');
  const [formDescription, setFormDescription] = useState('');
  const [formDailyRate, setFormDailyRate] = useState('');
  const [formLocation, setFormLocation] = useState('Harare');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formStatus, setFormStatus] = useState('available');

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const categories = ['Excavators', 'Dump Trucks', 'Drill Rigs', 'Generators', 'Compressors', 'Crushers', 'Other'];
  const locations = ['Harare', 'Bulawayo', 'Gweru', 'Kwekwe', 'Mutare', 'Zvishavane', 'Kadoma', 'Masvingo', 'Hwange', 'Other'];

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setFormError('');

    try {
      // 1. Create base64 Data URL for preview and fallback
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
      });
      reader.readAsDataURL(file);
      const base64Url = await base64Promise;

      // 2. Try uploading to Supabase Storage if the client is configured and active
      const isRealSupabase = supabase.storage && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('PLACEHOLDER');
      if (isRealSupabase) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('equipment-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from('equipment-images')
            .getPublicUrl(filePath);

          setFormImageUrl(publicUrlData.publicUrl);
        } else {
          console.warn('Supabase storage upload failed, falling back to base64.', error);
          setFormImageUrl(base64Url);
        }
      } else {
        // Fallback to base64 Data URL for offline mock client
        setFormImageUrl(base64Url);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      setFormError('Failed to process selected image file.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('supplier_id', user.id);

      if (error) throw error;
      setInventory(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('Excavators');
    setFormDescription('');
    setFormDailyRate('');
    setFormLocation('Harare');
    setFormImageUrl('');
    setFormStatus('available');
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormDescription(item.description || '');
    setFormDailyRate(item.daily_rate);
    setFormLocation(item.location);
    setFormImageUrl(item.image_url || '');
    setFormStatus(item.status);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    if (Number(formDailyRate) <= 0) {
      setFormError('Daily hire rate must be greater than 0.');
      setSubmitting(false);
      return;
    }

    const payload = {
      name: formName,
      category: formCategory,
      description: formDescription,
      daily_rate: Number(formDailyRate),
      location: formLocation,
      image_url: formImageUrl || 'https://images.unsplash.com/photo-1579294800821-2941910f8bc3?auto=format&fit=crop&q=80&w=600',
      supplier_id: user.id
    };

    try {
      if (editingItem) {
        // Editing existing listing. Retain status or set according to change
        const updates = { ...payload, status: formStatus };
        const { error } = await supabase
          .from('equipment')
          .update(updates)
          .eq('id', editingItem.id);
        
        if (error) throw error;
      } else {
        // New listing defaults to pending approval
        const newRecord = { ...payload, status: 'pending_approval' };
        const { error } = await supabase
          .from('equipment')
          .insert(newRecord);

        if (error) throw error;
      }

      setModalOpen(false);
      fetchInventory();
    } catch (err) {
      setFormError(err.message || 'Error processing request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to permanently delete this listing?')) return;

    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      fetchInventory();
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Could not delete item. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return <span className="badge badge-success">Active / Available</span>;
      case 'rented':
        return <span className="badge badge-secondary" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>Rented Out</span>;
      case 'maintenance':
        return <span className="badge badge-secondary" style={{ background: 'rgba(156, 163, 175, 0.15)', color: '#d1d5db', border: '1px solid rgba(156, 163, 175, 0.3)' }}>In Maintenance</span>;
      case 'pending_approval':
      default:
        return <span className="badge badge-warning">Pending Approval</span>;
    }
  };

  return (
    <DashboardLayout title="Manage Equipment Inventory">
      <div className="container">
        
        {/* Header Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={18} />
            Add New Rig
          </button>
        </div>

        {/* Inventory List */}
        {loading ? (
          <div className="flex-center" style={{ minHeight: '300px' }}>
            <div className="badge badge-warning" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Loading Inventory...</div>
          </div>
        ) : inventory.length === 0 ? (
          <div className="card flex-center" style={{ minHeight: '260px', flexDirection: 'column', gap: '1rem' }}>
            <Hammer size={48} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>You have no equipment listed. Click "Add New Rig" to get started.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Daily Rate</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '600', color: '#fff' }}>{item.name}</td>
                      <td>{item.category}</td>
                      <td>{item.location}, Zimbabwe</td>
                      <td style={{ color: 'var(--primary)', fontWeight: '700' }}>${item.daily_rate}/day</td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="btn btn-secondary"
                            style={{ padding: '0.45rem 0.65rem' }}
                            title="Edit Listing"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="btn btn-danger"
                            style={{ padding: '0.45rem 0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                            title="Delete Listing"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {modalOpen && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', animation: 'fadeIn 0.25s ease-out' }}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>
                  {editingItem ? 'Edit Listing Details' : 'List New Equipment'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {editingItem ? 'Updates will take effect immediately.' : 'All new listings must pass through admin audit approval.'}
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                {formError && (
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
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Equipment Name / Model</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Caterpillar 320 Excavator"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Category</label>
                    <select
                      className="form-input"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                    >
                      {categories.map((cat, i) => (
                        <option key={i} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Daily Hire Rate (USD)</label>
                    <input
                      type="number"
                      required
                      className="form-input"
                      placeholder="e.g. 450"
                      value={formDailyRate}
                      onChange={(e) => setFormDailyRate(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Location (Zimbabwe)</label>
                    <select
                      className="form-input"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                    >
                      {locations.map((loc, i) => (
                        <option key={i} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Listing Status</label>
                    <select
                      className="form-input"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      disabled={!editingItem} // new records are automatically 'pending_approval'
                    >
                      <option value="available">Available</option>
                      <option value="rented">Rented Out</option>
                      <option value="maintenance">Under Maintenance</option>
                      {editingItem && editingItem.status === 'pending_approval' && (
                        <option value="pending_approval">Pending Approval</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Equipment Image</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {formImageUrl && (
                      <div style={{ position: 'relative', width: '120px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={formImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => setFormImageUrl('')}
                          style={{
                            position: 'absolute', top: '4px', right: '4px',
                            background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none',
                            borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <label
                        className="btn btn-secondary"
                        style={{
                          padding: '0.6rem 1.25rem', fontSize: '0.85rem', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: 0
                        }}
                      >
                        {uploading ? 'Uploading...' : formImageUrl ? 'Change File' : 'Upload Image'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          style={{ display: 'none' }}
                        />
                      </label>
                      
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>or</span>
                      
                      <input
                        type="url"
                        className="form-input"
                        placeholder="Paste web image link..."
                        value={formImageUrl}
                        onChange={(e) => setFormImageUrl(e.target.value)}
                        style={{ flex: 1, padding: '0.55rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label className="form-label">Technical Description & Specifications</label>
                  <textarea
                    rows={3}
                    className="form-input"
                    placeholder="Include power details, bucket sizes, and operations conditions..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Submit Listing'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
