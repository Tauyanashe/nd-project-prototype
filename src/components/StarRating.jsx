import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function StarRating({ equipmentId, userId, readOnly = false, size = 18 }) {
  const [ratings, setRatings] = useState([]);
  const [userRating, setUserRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRatings();
  }, [equipmentId]);

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('equipment_id', equipmentId);

      if (error) throw error;
      setRatings(data || []);

      // Check if user has already rated
      if (userId) {
        const existing = (data || []).find(r => r.customer_id === userId);
        if (existing) {
          setUserRating(existing.rating);
          setReviewText(existing.review || '');
        }
      }
    } catch (err) {
      console.error('Error fetching ratings:', err);
    }
  };

  const averageRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : 0;

  const handleStarClick = (starValue) => {
    if (readOnly) return;
    setUserRating(starValue);
    setShowReviewInput(true);
  };

  const handleSubmitRating = async () => {
    if (!userId || userRating === 0) return;
    setSubmitting(true);

    try {
      // Check if user already rated
      const existing = ratings.find(r => r.customer_id === userId);

      if (existing) {
        // Update existing rating
        await supabase
          .from('ratings')
          .update({ rating: userRating, review: reviewText })
          .eq('id', existing.id);
      } else {
        // Insert new rating
        await supabase
          .from('ratings')
          .insert({
            equipment_id: equipmentId,
            customer_id: userId,
            rating: userRating,
            review: reviewText
          });
      }

      setShowReviewInput(false);
      fetchRatings();
    } catch (err) {
      console.error('Error submitting rating:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = readOnly ? parseFloat(averageRating) : (hoveredStar || userRating);

  return (
    <div>
      {/* Stars row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {[1, 2, 3, 4, 5].map(star => {
          const filled = star <= displayRating;
          return (
            <Star
              key={star}
              size={size}
              fill={filled ? '#f59e0b' : 'transparent'}
              color={filled ? '#f59e0b' : 'rgba(255,255,255,0.15)'}
              style={{
                cursor: readOnly ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
                transform: (!readOnly && hoveredStar >= star) ? 'scale(1.2)' : 'scale(1)'
              }}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => !readOnly && setHoveredStar(star)}
              onMouseLeave={() => !readOnly && setHoveredStar(0)}
            />
          );
        })}

        {/* Rating text */}
        <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>
          {ratings.length > 0 ? (
            <>
              <strong style={{ color: '#f59e0b' }}>{averageRating}</strong>
              <span> ({ratings.length} {ratings.length === 1 ? 'review' : 'reviews'})</span>
            </>
          ) : (
            <span style={{ fontStyle: 'italic' }}>No reviews yet</span>
          )}
        </span>
      </div>

      {/* Review input (shows after clicking a star) */}
      {showReviewInput && !readOnly && (
        <div style={{
          marginTop: '0.75rem',
          padding: '1rem',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--glass-border)',
          borderRadius: '10px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <textarea
            rows={2}
            className="form-input"
            placeholder="Write a short review (optional)..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            style={{ marginBottom: '0.75rem', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowReviewInput(false); setHoveredStar(0); }}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitRating}
              disabled={submitting}
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            >
              {submitting ? 'Saving...' : userRating > 0 ? `Submit ${userRating}★ Rating` : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {/* Show existing reviews (compact list) */}
      {ratings.length > 0 && readOnly && (
        <div style={{ marginTop: '0.5rem' }}>
          {ratings.slice(0, 2).map(r => (
            r.review && (
              <p key={r.id} style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.25rem' }}>
                "{r.review.length > 60 ? r.review.substring(0, 60) + '...' : r.review}"
              </p>
            )
          ))}
        </div>
      )}
    </div>
  );
}
