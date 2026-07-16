import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { supabase } from '../supabaseClient';
import {
  HardHat, ChevronRight, Shield, Zap, MessageSquare,
  MapPin, Star, ArrowRight, Menu, X, CheckCircle
} from 'lucide-react';

const FEATURES = [
  {
    icon: <Shield size={28} />,
    title: 'Verified Suppliers',
    desc: 'Every equipment provider is audited by our admin team before listing. Zero unverified machinery on the platform.'
  },
  {
    icon: <Zap size={28} />,
    title: 'Instant Hire Requests',
    desc: 'Browse, select dates, and request equipment in under 2 minutes. Suppliers respond within 24 hours.'
  },
  {
    icon: <MessageSquare size={28} />,
    title: 'Real-Time Messaging',
    desc: 'Communicate directly with suppliers about specs, transport logistics, and pricing before committing.'
  },
  {
    icon: <MapPin size={28} />,
    title: 'All Major Mining Hubs',
    desc: 'Equipment available across Harare, Bulawayo, Gweru, Kwekwe, Mutare, Kadoma, and more.'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroHovered, setHeroHovered] = useState(false);

  // Dynamic state for landing page content
  const [showcaseEquipment, setShowcaseEquipment] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [stats, setStats] = useState([
    { value: '0', label: 'Mining Rigs Listed' },
    { value: '0', label: 'Verified Suppliers' },
    { value: '0', label: 'Hire Requests Fulfilled' },
    { value: '0', label: 'Provinces Covered' }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const fetchLandingPageData = async () => {
      try {
        // 1. Fetch showcase equipment (available, limit to 4)
        const { data: equipData } = await supabase
          .from('equipment')
          .select('*')
          .eq('status', 'available');

        if (equipData) {
          setShowcaseEquipment(equipData.slice(0, 4));
        }

        // 2. Fetch testimonials (ratings & join profiles in-memory)
        const { data: ratingsData } = await supabase
          .from('ratings')
          .select('*');

        if (ratingsData && ratingsData.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('*');

          const mappedTestimonials = ratingsData.map(r => {
            const profile = profilesData?.find(p => p.id === r.customer_id);
            return {
              name: profile?.full_name || 'Mining Operator',
              company: profile?.company_name || 'Great Dyke Resources',
              location: 'Zimbabwe',
              text: r.review || 'Excellent service and machine reliability.',
              rating: r.rating
            };
          });
          setTestimonials(mappedTestimonials.slice(0, 3));
        }

        // 3. Calculate live stats
        const { data: allEquip } = await supabase.from('equipment').select('location');
        const { data: suppliers } = await supabase.from('profiles').select('id').eq('user_type', 'supplier');
        const { data: bookings } = await supabase.from('bookings').select('id');

        const rigsCount = allEquip ? allEquip.length : 0;
        const suppliersCount = suppliers ? suppliers.length : 0;
        const bookingsCount = bookings ? bookings.length : 0;
        const uniqueLocations = allEquip ? new Set(allEquip.map(e => e.location)).size : 0;

        setStats([
          { value: `${rigsCount}`, label: 'Mining Rigs Listed' },
          { value: `${suppliersCount}`, label: 'Verified Suppliers' },
          { value: `${bookingsCount}`, label: 'Hire Requests Fulfilled' },
          { value: `${uniqueLocations}`, label: 'Locations Covered' }
        ]);

      } catch (err) {
        console.error('Error fetching dynamic landing page data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLandingPageData();
  }, []);

  return (
    <div style={{ background: '#0b0f19', color: '#f3f4f6', fontFamily: "'Plus Jakarta Sans', sans-serif", overflowX: 'hidden' }}>

      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(11, 15, 25, 0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s ease',
        padding: '1.25rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: "'Outfit', sans-serif", fontSize: '1.5rem', fontWeight: 800 }}>
          <HardHat size={28} color="#f59e0b" />
          <span>ZIM<span style={{ color: '#f59e0b' }}>RIGS</span></span>
        </div>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }} className="desktop-nav">
          <a href="#equipment" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}
            onClick={e => { e.preventDefault(); document.getElementById('equipment')?.scrollIntoView({ behavior: 'smooth' }); }}>
            Equipment
          </a>
          <a href="#how" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}
            onClick={e => { e.preventDefault(); document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }); }}>
            How It Works
          </a>
          <a href="#testimonials" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}
            onClick={e => { e.preventDefault(); document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' }); }}>
            Reviews
          </a>
          <button onClick={() => navigate('/login')} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
            Sign In
          </button>
          <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
            Get Started
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ThemeToggle />
          
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'none' }}
            className="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: '70px', left: 0, right: 0, zIndex: 99,
          background: '#0d1220', borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem'
        }}>
          <button onClick={() => navigate('/login')} className="btn btn-secondary" style={{ width: '100%' }}>Sign In</button>
          <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ width: '100%' }}>Get Started Free</button>
        </div>
      )}

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="hero-section"
        onMouseEnter={() => setHeroHovered(true)}
        onMouseLeave={() => setHeroHovered(false)}
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '8rem 2rem 4rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background excavator image — zooms on hover */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'url(/excavator-hero.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          backgroundRepeat: 'no-repeat',
          transition: 'transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          transform: heroHovered ? 'scale(1.08)' : 'scale(1)',
          willChange: 'transform'
        }} />

        {/* Dark gradient overlay — makes text readable */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: `
            linear-gradient(to bottom, rgba(11,15,25,0.75) 0%, rgba(11,15,25,0.55) 40%, rgba(11,15,25,0.70) 70%, #0b0f19 100%),
            linear-gradient(to right, rgba(11,15,25,0.6) 0%, transparent 50%, rgba(11,15,25,0.6) 100%)
          `
        }} />

        {/* Amber tint */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,158,11,0.08) 0%, transparent 70%)'
        }} />

        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, opacity: 0.03, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Hero content — full width */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '900px', width: '100%' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '9999px', padding: '0.4rem 1rem', marginBottom: '1.75rem',
            fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600,
            backdropFilter: 'blur(8px)'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse-glow 2s infinite' }} />
            Zimbabwe's #1 Mining Equipment Platform
          </div>

          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: '1.5rem',
            color: '#ffffff',
            textShadow: '0 2px 40px rgba(0,0,0,0.5)'
          }}>
            Hire Mining Equipment<br />Across <span style={{ color: '#f59e0b' }}>Zimbabwe</span>
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: '#d1d5db',
            maxWidth: '640px', margin: '0 auto 2.5rem', lineHeight: 1.75,
            textShadow: '0 1px 12px rgba(0,0,0,0.4)'
          }}>
            Connect with verified suppliers of excavators, drill rigs, dump trucks and more.
            From Harare to Hwange — find the right rig, instantly.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/register')}
              className="btn btn-primary"
              style={{ padding: '0.95rem 2rem', fontSize: '1.05rem', gap: '0.6rem' }}
            >
              Start Hiring Equipment <ArrowRight size={20} />
            </button>
            <button
              onClick={() => navigate('/register?role=supplier')}
              className="btn btn-secondary"
              style={{ padding: '0.95rem 2rem', fontSize: '1.05rem', backdropFilter: 'blur(8px)' }}
            >
              List Your Fleet
            </button>
          </div>

          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '3rem' }}>
            {['No listing fees', 'Instant booking', 'Admin-verified suppliers'].map(tag => (
              <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
                <CheckCircle size={14} color="#10b981" /> {tag}
              </span>
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 860px) {
            .hero-grid { grid-template-columns: 1fr !important; }
            .hero-img-col { height: 280px !important; }
          }
        `}</style>
      </section>


      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <section style={{
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '2.5rem 2rem'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem', fontStyle: 'italic' }}>Loading active platform metrics...</div>
          ) : (
            stats.map(s => (
              <div key={s.label}>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.8rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{s.value}</p>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.35rem' }}>{s.label}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── EQUIPMENT SHOWCASE ────────────────────────────────────────────── */}
      <section id="equipment" style={{ padding: '6rem 2rem', maxWidth: '1300px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{ color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Available Fleet</p>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            World-Class Mining Equipment
          </h2>
          <p style={{ color: '#9ca3af', marginTop: '0.75rem', fontSize: '1.05rem' }}>
            Browse a growing inventory of verified, maintained heavy machinery from trusted Zimbabwean suppliers.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {loading ? (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'rgba(255,255,255,0.01)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.04)'
            }}>
              <div className="badge badge-warning" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', animation: 'pulse-glow 2s infinite', marginBottom: '0.5rem' }}>
                Connecting to Fleet Database...
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>Fetching live available mining equipment...</p>
            </div>
          ) : showcaseEquipment.length > 0 ? (
            showcaseEquipment.map((eq, i) => (
              <div
                key={eq.id || i}
                className="card"
                style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => navigate('/register')}
              >
                <div style={{ position: 'relative', height: '220px', overflow: 'hidden', background: '#1c2230' }}>
                  <img
                    src={eq.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=800'}
                    alt={eq.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  />
                  <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                    <span style={{
                      background: 'rgba(245,158,11,0.9)', color: '#111827',
                      padding: '0.25rem 0.75rem', borderRadius: '9999px',
                      fontSize: '0.75rem', fontWeight: 700, backdropFilter: 'blur(4px)'
                    }}>Verified</span>
                  </div>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,15,25,0.8) 0%, transparent 50%)' }} />
                </div>
                <div style={{ padding: '1.35rem' }}>
                  <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{eq.category}</span>
                  <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.15rem', fontWeight: 700, margin: '0.25rem 0 0.75rem', color: '#fff' }}>{eq.name}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                      <MapPin size={13} color="#f59e0b" /> {eq.location}
                    </span>
                    <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '1.15rem', fontFamily: "'Outfit', sans-serif" }}>${eq.daily_rate}/day</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              border: '1px dashed rgba(255,255,255,0.08)'
            }}>
              <HardHat size={44} color="#f59e0b" style={{ marginBottom: '1.25rem', opacity: 0.8 }} />
              <h4 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>No Heavy Equipment Listed Yet</h4>
              <p style={{ color: '#9ca3af', fontSize: '0.95rem', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
                Be the first supplier to list your excavator, drill rig, or dump truck. Sign up to publish your fleet!
              </p>
              <button onClick={() => navigate('/register?role=supplier')} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}>
                Join as Supplier
              </button>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <button onClick={() => navigate('/register')} className="btn btn-secondary" style={{ padding: '0.85rem 2rem', fontSize: '0.95rem' }}>
            View Full Equipment Catalog <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how" style={{
        padding: '6rem 2rem',
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(245,158,11,0.04) 0%, transparent 70%), rgba(255,255,255,0.01)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Simple Process</p>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Up and Running in Minutes
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {[
              { step: '01', title: 'Register Your Account', desc: 'Sign up as a Mining Customer or Equipment Supplier. No fees, no contracts.' },
              { step: '02', title: 'Browse or List Equipment', desc: 'Customers search verified fleets by location and category. Suppliers add their machinery in minutes.' },
              { step: '03', title: 'Send a Hire Request', desc: 'Choose your dates, review the rate, and submit. Use chat to clarify specs with the supplier directly.' },
              { step: '04', title: 'Confirm & Get to Work', desc: 'Once approved, the equipment is yours. All bookings are tracked in your dashboard.' }
            ].map((s, i) => (
              <div key={i} className="card" style={{ position: 'relative' }}>
                <span style={{
                  fontFamily: "'Outfit', sans-serif", fontSize: '3.5rem', fontWeight: 900,
                  color: 'rgba(245,158,11,0.12)', position: 'absolute', top: '1rem', right: '1.25rem',
                  lineHeight: 1
                }}>{s.step}</span>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '10px',
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#f59e0b', fontWeight: 800, fontFamily: "'Outfit', sans-serif",
                  marginBottom: '1rem'
                }}>{s.step}</div>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.6rem', color: '#fff' }}>{s.title}</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{ color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Platform Benefits</p>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Why Choose Zim Rigs?
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#f59e0b'
              }}>{f.icon}</div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{f.title}</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section id="testimonials" style={{
        padding: '6rem 2rem',
        background: 'rgba(255,255,255,0.01)',
        borderTop: '1px solid rgba(255,255,255,0.04)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Testimonials</p>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Trusted by Zimbabwe's Mining Sector
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {loading ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#9ca3af', fontSize: '0.95rem', fontStyle: 'italic' }}>Loading customer testimonials...</p>
              </div>
            ) : testimonials.length > 0 ? (
              testimonials.map((t, i) => (
                <div key={i} className="card">
                  <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
                    {Array.from({ length: t.rating }).map((_, si) => (
                      <Star key={si} size={16} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                  <p style={{ color: '#d1d5db', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                    "{t.text}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%',
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, color: '#f59e0b', fontFamily: "'Outfit', sans-serif"
                    }}>{t.name ? t.name.charAt(0) : 'M'}</div>
                    <div>
                      <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{t.name}</p>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{t.company} · {t.location}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '1px dashed rgba(255,255,255,0.08)'
              }}>
                <MessageSquare size={44} color="#f59e0b" style={{ marginBottom: '1.25rem', opacity: 0.8 }} />
                <h4 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>No Testimonials Yet</h4>
                <p style={{ color: '#9ca3af', fontSize: '0.95rem', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
                  Once operators rent equipment and leave feedback ratings, their testimonials will appear here!
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────────────── */}
      <section style={{
        padding: '6rem 2rem',
        background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(245,158,11,0.1) 0%, transparent 70%)',
        borderTop: '1px solid rgba(245,158,11,0.1)'
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Ready to Hire Your Next Rig?
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            Join hundreds of mining companies and equipment suppliers already using Zim Rigs to power Zimbabwe's mining industry.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/register')}
              className="btn btn-primary"
              style={{ padding: '1rem 2.25rem', fontSize: '1.05rem', gap: '0.6rem' }}
            >
              Create Free Account <ArrowRight size={20} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-secondary"
              style={{ padding: '1rem 2.25rem', fontSize: '1.05rem' }}
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        maxWidth: '1300px',
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '1.1rem' }}>
          <HardHat size={20} color="#f59e0b" />
          ZIM<span style={{ color: '#f59e0b' }}>RIGS</span>
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
          © {new Date().getFullYear()} Zim Rigs · Zimbabwe Mining Equipment Portal. All rights reserved.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {['Privacy', 'Terms', 'Contact'].map(link => (
            <span key={link} style={{ color: '#6b7280', fontSize: '0.85rem', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#f59e0b'}
              onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}>
              {link}
            </span>
          ))}
        </div>
      </footer>

      {/* Responsive styles injected inline */}
      <style>{`
        @media (max-width: 700px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}
