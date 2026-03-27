import '../App.css'
import { Link } from 'react-router-dom'

export default function EducatorsPage() {
  return (
    <div className="app-container">
      {/* Navigation */}
      <nav className="navbar">
        <Link to="/" className="nav-brand" style={{ textDecoration: 'none', color: 'var(--brand-primary)' }}>HANDOUT</Link>
        <div>
          <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>Student Join</Link>
        </div>
      </nav>

      {/* Story 1: Hero Section */}
      <section className="hero animate-slide-up">
        <div className="hero-content">
          <h1 className="hero-title">The Anti-SaaS Solution.</h1>
          <p className="hero-desc">
            Stop renting your classroom tools. Escape the lag, the login walls, and the recurring subscription fatigue.
            Handout is the local-first, pay-once platform that puts control back in your hands.
          </p>
          <button className="btn btn-primary" style={{ marginRight: '1.5rem', marginBottom: '1rem' }}>
            Download Handout
          </button>
        </div>
        
        <div className="hero-renders delay-100">
          <div className="render-cockpit">Cockpit UI</div>
          <div className="render-handout">Instant Join</div>
        </div>
      </section>

      {/* Story 1: Pain Point Section */}
      <section className="animate-slide-up delay-200">
        <h2 className="section-title">Own Your Room</h2>
        <p className="section-subtitle">Why educators are abandoning cloud-hosted polling platforms.</p>
        
        <div className="pain-points-grid">
          <div className="pain-card old-way">
            <h3 className="pain-title">The Old Way</h3>
            <ul className="pain-list">
              <li>Endless $15/month subscriptions.</li>
              <li>Laggy web sockets during critical lectures.</li>
              <li>Students blocked by mandatory login walls.</li>
              <li>Your learning data mined on external servers.</li>
            </ul>
          </div>
          <div className="pain-card new-way">
            <h3 className="pain-title">The Handout Way</h3>
            <ul className="pain-list">
              <li>Pay once. Own the software forever.</li>
              <li>Zero latency via local network routing.</li>
              <li>Instant join via QR code. No apps or accounts.</li>
              <li>Total data ownership on your machine.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Story 2: Product Anatomy */}
      <section>
        <h2 className="section-title">Built for the Modern Lecture</h2>
        <p className="section-subtitle">Tactile control for you. Frictionless engagement for them.</p>
        
        <div className="features-grid">
          <div className="feature-block">
            <h3 className="feature-title">Digital Stamp</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Instantly <strong>Cast a Handout</strong> to student devices. No refreshing, no waiting. The moment you click, the handout appears immediately on their screens.
            </p>
          </div>
          <div className="feature-block">
            <h3 className="feature-title">Live Pulse</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Stop running "surveys." Feel the room in real-time. Gather immediate, sub-second <strong>Pulse</strong> feedback without interrupting your flow. All data aggregated instantly in the <strong>Cockpit</strong>.
            </p>
          </div>
          <div className="feature-block">
            <h3 className="feature-title">Hybrid Relay</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Our smart network engine default-routes traffic locally for absolute zero latency. If the school network is restrictive, it seamlessly falls back to our lightning-fast cloud relay. Your class never stops.
            </p>
          </div>
        </div>
      </section>

      {/* Story 2: Spec Sheet */}
      <section>
        <div className="spec-sheet">
          <h3 style={{ color: 'var(--brand-primary)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>// SYSTEM_ARCHITECTURE</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>IT Administrator Verification Data</p>
          
          <div className="spec-grid">
            <div className="spec-item">
              <div className="label">Client Framework</div>
              <div className="value">Electron / React</div>
            </div>
            <div className="spec-item">
              <div className="label">Persistence Layer</div>
              <div className="value">SQLite (Local)</div>
            </div>
            <div className="spec-item">
              <div className="label">Primary Protocol</div>
              <div className="value">Local-First Socket</div>
            </div>
            <div className="spec-item">
              <div className="label">Fallback Infra</div>
              <div className="value">Google Cloud Run</div>
            </div>
          </div>
        </div>
      </section>

      {/* Story 3: Frictionless Conversion */}
      <section className="pricing">
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: 900 }}>No Subscriptions. No Tiers.</h2>
        <div className="price-tag">$49</div>
        <div className="price-sub">Pay once. Own it forever.</div>
        <button className="btn btn-primary" style={{ padding: '1.5rem 4rem', fontSize: '1.5rem' }}>
          Claim Your Room
        </button>
      </section>

      <footer>
        <p>&copy; {new Date().getFullYear()} Handout. All rights reserved. The Local-First Classroom.</p>
      </footer>
    </div>
  )
}
