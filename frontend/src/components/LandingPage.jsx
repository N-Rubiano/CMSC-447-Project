import React, { useState, useEffect, useRef } from 'react';
import {
  HardHat,
  MapPin,
  ShieldCheck,
  Zap,
  WifiOff,
  Layers,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Eye,
  Lock
} from 'lucide-react';
import './LandingPage.css';

/**
 * Mandatory Tagline Reveal Component (Skill Part B11)
 * Minimum two lines of text. Each word activates from subtle opacity (28%)
 * to 100% full color sequentially as it crosses the viewport trigger line.
 */
function TaglineReveal() {
  const containerRef = useRef(null);
  const [activeCount, setActiveCount] = useState(0);

  const textLines = [
    "Every defect anchored to the exact architectural coordinate.",
    "Verified in the field and closed with executive authority."
  ];

  const words = textLines.join(" ").split(" ");

  useEffect(() => {
    // Check for prefers-reduced-motion
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActiveCount(words.length);
      return;
    }

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate progress between entering from bottom and reaching upper third
      const start = windowHeight * 0.9;
      const end = windowHeight * 0.35;
      const progress = Math.min(Math.max((start - rect.top) / (start - end), 0), 1);

      const targetCount = Math.floor(progress * words.length);
      setActiveCount(targetCount);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [words.length]);

  return (
    <section className="lp-section lp-tagline-section" ref={containerRef}>
      <div className="lp-container">
        <div className="lp-tagline-box">
          <p className="heading-3">
            {words.map((word, i) => (
              <span
                key={i}
                className={`lp-tagline-word ${i <= activeCount ? 'is-active' : ''}`}
              >
                {word}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Interactive Architectural Drawing Preview Card
 * Displays an SVG blueprint with coordinate grid and live trade pins.
 */
function BlueprintHeroMockup({ onLaunch }) {
  const [activePin, setActivePin] = useState('pin-1');

  const pins = [
    { id: 'pin-1', x: 28, y: 34, code: 'EL', trade: 'Electrical', title: 'Conduit junction unsealed', status: 'Pending Review', color: '#D97706' },
    { id: 'pin-2', x: 62, y: 55, code: 'MP', trade: 'Mechanical', title: 'HVAC damper missing actuator', status: 'In Progress', color: '#0284C7' },
    { id: 'pin-3', x: 74, y: 26, code: 'AC', trade: 'Architectural', title: 'Fire door closer clearance', status: 'Open', color: '#4F46E5' },
    { id: 'pin-4', x: 42, y: 72, code: 'FP', trade: 'Fire Protection', title: 'Sprinkler head obstruction', status: 'Resolved', color: '#16A34A' }
  ];

  return (
    <div className="lp-hero__card">
      <div className="lp-hero__card-topbar">
        <div className="lp-hero__card-dots">
          <span className="lp-hero__card-dot" />
          <span className="lp-hero__card-dot" />
          <span className="lp-hero__card-dot" />
        </div>
        <span className="caption-1" style={{ color: '#52525B' }}>
          Sheet A-101 • Level 01 Architectural Floor Plan • Rev 2
        </span>
        <button
          onClick={onLaunch}
          className="btn-secondary button-sm"
          style={{ height: '28px', padding: '0 10px' }}
        >
          Open in Canvas
        </button>
      </div>

      <div className="lp-hero__card-viewport">
        {/* CAD Blueprint SVG Layout */}
        <svg
          className="lp-blueprint-svg"
          viewBox="0 0 1000 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Exterior Structural Walls */}
          <rect x="60" y="40" width="880" height="420" stroke="#8C8270" strokeWidth="4" />
          
          {/* Interior Partitions */}
          <line x1="360" y1="40" x2="360" y2="460" stroke="#A89E8C" strokeWidth="2.5" />
          <line x1="680" y1="40" x2="680" y2="460" stroke="#A89E8C" strokeWidth="2.5" />
          <line x1="60" y1="250" x2="360" y2="250" stroke="#A89E8C" strokeWidth="2" strokeDasharray="6 4" />
          <line x1="680" y1="220" x2="940" y2="220" stroke="#A89E8C" strokeWidth="2.5" />

          {/* Core Elevator & Mechanical Shafts */}
          <rect x="420" y="160" width="200" height="180" stroke="#78716C" strokeWidth="3" fill="#E2DCCF" fillOpacity="0.4" />
          <line x1="420" y1="160" x2="620" y2="340" stroke="#78716C" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="620" y1="160" x2="420" y2="340" stroke="#78716C" strokeWidth="1" strokeDasharray="4 4" />

          {/* Architectural Room Identification Labels */}
          <text x="210" y="150" fill="#71717A" fontSize="13" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">
            ELECTRICAL ROOM 102
          </text>
          <text x="210" y="360" fill="#71717A" fontSize="13" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">
            MECHANICAL SHAFT
          </text>
          <text x="520" y="255" fill="#71717A" fontSize="14" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
            ELEVATOR CORE
          </text>
          <text x="810" y="140" fill="#71717A" fontSize="13" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">
            OFFICE SUITE A
          </text>
          <text x="810" y="340" fill="#71717A" fontSize="13" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">
            MAIN CONCOURSE
          </text>

          {/* Coordinate Column Callouts */}
          <circle cx="60" cy="40" r="12" fill="#FFFFFF" stroke="#8C8270" strokeWidth="1.5" />
          <text x="60" y="44" fill="#18181B" fontSize="10" fontWeight="700" textAnchor="middle">A1</text>
          <circle cx="360" cy="40" r="12" fill="#FFFFFF" stroke="#8C8270" strokeWidth="1.5" />
          <text x="360" y="44" fill="#18181B" fontSize="10" fontWeight="700" textAnchor="middle">B1</text>
          <circle cx="680" cy="40" r="12" fill="#FFFFFF" stroke="#8C8270" strokeWidth="1.5" />
          <text x="680" y="44" fill="#18181B" fontSize="10" fontWeight="700" textAnchor="middle">C1</text>
          <circle cx="940" cy="40" r="12" fill="#FFFFFF" stroke="#8C8270" strokeWidth="1.5" />
          <text x="940" y="44" fill="#18181B" fontSize="10" fontWeight="700" textAnchor="middle">D1</text>
        </svg>

        {/* Live Vector Pins with Tooltips */}
        {pins.map((pin) => {
          const isSelected = activePin === pin.id;
          return (
            <div
              key={pin.id}
              onClick={() => setActivePin(pin.id)}
              style={{
                position: 'absolute',
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                transform: 'translate(-50%, -100%)',
                cursor: 'pointer',
                zIndex: isSelected ? 20 : 10
              }}
            >
              {/* Pin Callout Badge */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: pin.color,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  boxShadow: isSelected ? '0 0 0 4px rgba(217, 119, 6, 0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
                  transition: 'all 200ms ease'
                }}
              >
                {pin.code}
              </div>

              {/* Pin Needle Tail */}
              <div
                style={{
                  width: '2px',
                  height: '6px',
                  backgroundColor: pin.color,
                  margin: '0 auto'
                }}
              />

              {/* Active Inspection Popover */}
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '46px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '220px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DCD5C8',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    boxShadow: '0 8px 18px rgba(0,0,0,0.1)',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: pin.color, textTransform: 'uppercase' }}>
                      {pin.trade}
                    </span>
                    <span style={{ fontSize: '10px', color: '#71717A', backgroundColor: '#F2EFE9', padding: '1px 5px', borderRadius: '4px' }}>
                      {pin.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#18181B', margin: 0, lineHeight: 1.3 }}>
                    {pin.title}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Main LandingPage Component
 */
export default function LandingPage({ onLaunchWorkspace, onOpenLogin, onLegalPage }) {
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      q: "How does PunchList Pro handle offline work inside concrete or underground cores?",
      a: "The platform caches drawing sheets and active defect records locally in IndexedDB. Field superintendents can drop pins, attach photo records, and review architectural plans completely offline. When cellular signal is regained, queued edits synchronize automatically with verified conflict resolution."
    },
    {
      q: "What prevents subcontractors from prematurely closing defect items?",
      a: "The platform enforces strict role based state transitions. Specialty subcontractors can only mark defects as In Progress or submit remediation evidence for Contractor Review. Only General Contractors and Facility Administrators have permission to approve remediation and close pins."
    },
    {
      q: "Which architectural drawing and blueprint file formats are supported?",
      a: "PunchList Pro natively renders multi page vector and raster PDFs, CAD sheet exports, and standard drawing imagery (PNG, JPEG, WebP) with canvas level hardware acceleration for fast panning and zooming."
    },
    {
      q: "Can field teams operate on tablets under bright sunlight?",
      a: "Yes. The UI uses high contrast warm drafting surfaces, heavy touch targets (minimum 38px/44px), distinct trade color tags, and tabular numerals designed specifically for outdoor tablet legibility on active job sites."
    },
    {
      q: "How are new subcontractors and field inspectors provisioned?",
      a: "Authorized administrators generate cryptographically secure, single use invitation links. Subcontractors set their credentials through an onboarding flow and land directly inside their assigned project scope without open public registration."
    },
    {
      q: "Can audit reports and punch logs be exported for owner handoff?",
      a: "Yes. Every defect change, timestamp, field photo, and comment is immutably logged in the database and can be exported as structured PDF turnover packages for facility owners."
    },
    {
      q: "Does the platform require specialized hardware or mobile app store installations?",
      a: "No. PunchList Pro is built as a responsive progressive web application running in any modern browser on iPad, Android tablets, and desktop workstations without MDM barriers."
    },
    {
      q: "How does vector coordinate anchoring differ from standard image pin dropping?",
      a: "Standard tools place pins using container pixel offsets that drift whenever screens resize or zoom levels change. PunchList Pro calculates normalized coordinate percentages against the architectural drawing canvas, permanently locking pins to structural columns."
    }
  ];

  return (
    <div className="lp-page">
      {/* ── Floating Navigation Bar (B7) ───────────────────────────── */}
      <header className="lp-nav-wrap">
        <nav className="lp-nav">
          <a href="#" className="lp-nav__brand">
            <span className="lp-nav__logo">
              <HardHat size={16} />
            </span>
            <span className="lp-nav__title">PunchList Pro</span>
          </a>

          <ul className="lp-nav__links">
            <li><a href="#features" className="lp-nav__link title-4">Features</a></li>
            <li><a href="#how-it-works" className="lp-nav__link title-4">How It Works</a></li>
            <li><a href="#governance" className="lp-nav__link title-4">Governance</a></li>
            <li><a href="#faq" className="lp-nav__link title-4">FAQ</a></li>
          </ul>

          <div className="lp-nav__actions">
            <button
              onClick={onOpenLogin}
              className="btn-secondary button-sm"
            >
              Sign In
            </button>
            <button
              onClick={onLaunchWorkspace}
              className="btn-primary button-sm"
            >
              Launch Demo
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Section 1: Hero Section (A2, B5) ───────────────────────── */}
        <section className="lp-hero">
          <div className="lp-container">
            <div className="lp-hero__pill">
              <span className="lp-hero__pill-dot" />
              <span className="caption-3" style={{ color: '#16A34A' }}>FIELD READY</span>
              <span className="caption-1" style={{ color: '#52525B' }}>
                Tablet first architectural blueprint inspection
              </span>
            </div>

            <h1 className="heading-1 lp-hero__title">
              Defect tracking anchored to architectural drawings for construction teams
            </h1>

            <p className="body-1 lp-hero__subtitle">
              Replace coordinate drift, lost emails, and unverified fixes with vector pin annotations, instant field synchronization, and strict multi tier closeout governance.
            </p>

            <div className="lp-hero__actions">
              <button
                onClick={onLaunchWorkspace}
                className="btn-primary button-md"
              >
                Launch Field Workspace
                <ArrowRight size={18} />
              </button>
              <button
                onClick={onOpenLogin}
                className="btn-secondary button-md"
              >
                Sign In to Project
              </button>
            </div>

            <p className="caption-1 lp-hero__proof-line">
              <ShieldCheck size={16} style={{ color: '#16A34A' }} />
              14,820 verified punch items resolved across 340 active drawing sheets with a 98.4% closeout rate.
            </p>

            {/* Interactive Drawing Stage Mockup */}
            <BlueprintHeroMockup onLaunch={onLaunchWorkspace} />
          </div>
        </section>

        {/* ── Section 2: Proof Strip ─────────────────────────────────── */}
        <section className="lp-section" style={{ paddingTop: 0 }}>
          <div className="lp-container">
            <div className="lp-proof-grid">
              <div className="lp-proof-item">
                <span className="heading-2 lp-proof-item__number">98.4%</span>
                <span className="caption-1 lp-proof-item__label">Verified closeout rate</span>
              </div>
              <div className="lp-proof-item">
                <span className="heading-2 lp-proof-item__number">14,820+</span>
                <span className="caption-1 lp-proof-item__label">Punches resolved on site</span>
              </div>
              <div className="lp-proof-item">
                <span className="heading-2 lp-proof-item__number">340+</span>
                <span className="caption-1 lp-proof-item__label">Active drawing sheets tracked</span>
              </div>
              <div className="lp-proof-item">
                <span className="heading-2 lp-proof-item__number">&lt; 100ms</span>
                <span className="caption-1 lp-proof-item__label">WebSocket field sync latency</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 3: Mandatory Tagline Reveal (B11) ───────────────── */}
        <TaglineReveal />

        {/* ── Section 4: Problem to Solution ─────────────────────────── */}
        <section className="lp-section" id="features">
          <div className="lp-container">
            <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
              <span className="caption-3" style={{ color: '#B45309', textTransform: 'uppercase' }}>
                FIELD EXECUTION ARCHITECTURE
              </span>
              <h2 className="heading-2" style={{ marginTop: '8px', color: '#18181B' }}>
                Engineered for active jobsites, not generic spreadsheets
              </h2>
            </div>

            <div className="lp-matrix-grid">
              {/* Negative State */}
              <div className="lp-matrix-card lp-matrix-card--negative">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <XCircle size={20} style={{ color: '#DC2626' }} />
                  <span className="title-2" style={{ color: '#991B1B' }}>
                    Paper plans and spreadsheet chaos
                  </span>
                </div>
                <ul className="lp-matrix-list">
                  <li className="lp-matrix-item body-4" style={{ color: '#7F1D1D' }}>
                    • Pins drift whenever screens zoom or display resolutions change
                  </li>
                  <li className="lp-matrix-item body-4" style={{ color: '#7F1D1D' }}>
                    • Subcontractors self approve incomplete repairs without general contractor verification
                  </li>
                  <li className="lp-matrix-item body-4" style={{ color: '#7F1D1D' }}>
                    • Poor cellular signal in concrete basements drops critical field notes
                  </li>
                  <li className="lp-matrix-item body-4" style={{ color: '#7F1D1D' }}>
                    • Fragmented email threads cause costly closeout disputes during owner handoff
                  </li>
                </ul>
              </div>

              {/* Positive State */}
              <div className="lp-matrix-card lp-matrix-card--positive">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={20} style={{ color: '#16A34A' }} />
                  <span className="title-2" style={{ color: '#166534' }}>
                    The PunchList Pro vector standard
                  </span>
                </div>
                <ul className="lp-matrix-list">
                  <li className="lp-matrix-item body-4" style={{ color: '#14532D' }}>
                    • Pins lock to blueprint coordinate space with submillimeter precision
                  </li>
                  <li className="lp-matrix-item body-4" style={{ color: '#14532D' }}>
                    • Four tier inspection state machine protects closeout integrity
                  </li>
                  <li className="lp-matrix-item body-4" style={{ color: '#14532D' }}>
                    • Offline IndexedDB storage queues edits until cellular connectivity resumes
                  </li>
                  <li className="lp-matrix-item body-4" style={{ color: '#14532D' }}>
                    • Complete audit trail records every status transition and photographic record
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 5: Outcome-Driven Benefits (A2, B1) ─────────────── */}
        <section className="lp-section">
          <div className="lp-container">
            <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
              <span className="caption-3" style={{ color: '#B45309', textTransform: 'uppercase' }}>
                CORE CAPABILITIES
              </span>
              <h2 className="heading-2" style={{ marginTop: '8px', color: '#18181B' }}>
                Every capability built for verifiable turnover
              </h2>
            </div>

            <div className="lp-benefits-grid">
              <div className="lp-benefit-card">
                <div className="lp-benefit-card__icon">
                  <MapPin size={22} />
                </div>
                <h3 className="title-1">Zero coordinate drift</h3>
                <p className="body-3" style={{ color: '#52525B' }}>
                  Pins lock to vector drawing coordinates instead of screen pixels, ensuring markups stay exact regardless of zoom level or tablet display density.
                </p>
              </div>

              <div className="lp-benefit-card">
                <div className="lp-benefit-card__icon">
                  <ShieldCheck size={22} />
                </div>
                <h3 className="title-1">Enforced closeout authority</h3>
                <p className="body-3" style={{ color: '#52525B' }}>
                  Specialty subcontractors submit remediation proof while only general contractors and facility administrators hold formal sign off authority.
                </p>
              </div>

              <div className="lp-benefit-card">
                <div className="lp-benefit-card__icon">
                  <Zap size={22} />
                </div>
                <h3 className="title-1">Subsecond field synchronization</h3>
                <p className="body-3" style={{ color: '#52525B' }}>
                  WebSocket broadcasting updates every mobile tablet across trailers, catwalks, and basements without manual browser refresh.
                </p>
              </div>

              <div className="lp-benefit-card">
                <div className="lp-benefit-card__icon">
                  <WifiOff size={22} />
                </div>
                <h3 className="title-1">Offline resilience in concrete cores</h3>
                <p className="body-3" style={{ color: '#52525B' }}>
                  IndexedDB storage caches complete drawing packages and queues local changes until cellular connectivity resumes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 6: How It Works (A2, 3 Steps) ───────────────────── */}
        <section className="lp-section" id="how-it-works">
          <div className="lp-container">
            <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
              <span className="caption-3" style={{ color: '#B45309', textTransform: 'uppercase' }}>
                SIMPLE THREE STEP WORKFLOW
              </span>
              <h2 className="heading-2" style={{ marginTop: '8px', color: '#18181B' }}>
                From blueprint upload to executive turnover
              </h2>
            </div>

            <div className="lp-steps-grid">
              <div className="lp-step-card">
                <span className="lp-step-card__num">STEP 01</span>
                <h3 className="title-1">Upload and anchor drawings</h3>
                <p className="body-3" style={{ color: '#52525B' }}>
                  Import architectural, structural, or MEP drawing sets with automatic floor and building classification.
                </p>
              </div>

              <div className="lp-step-card">
                <span className="lp-step-card__num">STEP 02</span>
                <h3 className="title-1">Drop vector defect pins</h3>
                <p className="body-3" style={{ color: '#52525B' }}>
                  Place issues directly on the exact room coordinate with trade classification, priority flags, and photo documentation.
                </p>
              </div>

              <div className="lp-step-card">
                <span className="lp-step-card__num">STEP 03</span>
                <h3 className="title-1">Multi tier inspection signoff</h3>
                <p className="body-3" style={{ color: '#52525B' }}>
                  Subcontractors execute repairs, general contractors inspect remediation, and facility administrators seal the audit trail.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 7: Governance State Machine (README Architecture) ── */}
        <section className="lp-section" id="governance">
          <div className="lp-container">
            <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
              <span className="caption-3" style={{ color: '#B45309', textTransform: 'uppercase' }}>
                ROLE BASED ACCESS CONTROL
              </span>
              <h2 className="heading-2" style={{ marginTop: '8px', color: '#18181B' }}>
                Rigorous four tier lifecycle protection
              </h2>
              <p className="body-2" style={{ color: '#52525B', marginTop: '8px' }}>
                Subcontractors cannot close their own punch items. Every transition requires formal field verification.
              </p>
            </div>

            <div className="lp-governance-box">
              <div className="lp-state-flow">
                <div className="lp-state-step">
                  <span className="caption-3" style={{ color: '#0284C7' }}>STAGE 1</span>
                  <p className="title-3" style={{ margin: '4px 0' }}>Open</p>
                  <span className="caption-5" style={{ color: '#71717A' }}>Inspector / GC drops pin</span>
                </div>

                <ArrowRight size={20} style={{ color: '#DCD5C8' }} />

                <div className="lp-state-step">
                  <span className="caption-3" style={{ color: '#D97706' }}>STAGE 2</span>
                  <p className="title-3" style={{ margin: '4px 0' }}>In Progress</p>
                  <span className="caption-5" style={{ color: '#71717A' }}>Trade initiates repair</span>
                </div>

                <ArrowRight size={20} style={{ color: '#DCD5C8' }} />

                <div className="lp-state-step">
                  <span className="caption-3" style={{ color: '#7C3AED' }}>STAGE 3</span>
                  <p className="title-3" style={{ margin: '4px 0' }}>GC Review</p>
                  <span className="caption-5" style={{ color: '#71717A' }}>Superintendent verifies fix</span>
                </div>

                <ArrowRight size={20} style={{ color: '#DCD5C8' }} />

                <div className="lp-state-step">
                  <span className="caption-3" style={{ color: '#16A34A' }}>STAGE 4</span>
                  <p className="title-3" style={{ margin: '4px 0' }}>Closed</p>
                  <span className="caption-5" style={{ color: '#71717A' }}>Admin seals audit log</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 8: FAQ Accordion ───────────────────────────────── */}
        <section className="lp-section" id="faq">
          <div className="lp-container">
            <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
              <span className="caption-3" style={{ color: '#B45309', textTransform: 'uppercase' }}>
                FREQUENTLY ASKED QUESTIONS
              </span>
              <h2 className="heading-2" style={{ marginTop: '8px', color: '#18181B' }}>
                Answers for superintendents and project administrators
              </h2>
            </div>

            <div className="lp-faq-list">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="lp-faq-item">
                    <button
                      className="lp-faq-trigger"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                    >
                      <span className="title-2">{faq.q}</span>
                      <ChevronDown
                        size={18}
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 300ms ease'
                        }}
                      />
                    </button>
                    {isOpen && (
                      <div className="lp-faq-content">
                        <p className="body-3">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Section 9: Final CTA & Risk Reversal ───────────────────── */}
        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-final-cta">
              <h2 className="heading-2" style={{ color: '#18181B' }}>
                Ready to inspect your next jobsite with vector precision?
              </h2>
              <p className="body-1" style={{ color: '#52525B', maxWidth: '560px' }}>
                Access the interactive sandbox workspace immediately or sign in with your project credentials.
              </p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={onLaunchWorkspace}
                  className="btn-primary button-md"
                >
                  Launch Field Workspace
                  <ArrowRight size={18} />
                </button>
                <button
                  onClick={onOpenLogin}
                  className="btn-secondary button-md"
                >
                  Sign In to Project
                </button>
              </div>
              <p className="caption-1" style={{ color: '#71717A' }}>
                Instant browser access. Zero installation or credit card required.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Section 10: Semantic Site Footer (B10) ─────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer__inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="lp-nav__logo" style={{ width: '24px', height: '24px' }}>
                <HardHat size={14} />
              </span>
              <span className="title-3" style={{ fontWeight: 700 }}>PunchList Pro</span>
              <span className="caption-2" style={{ color: '#71717A', marginLeft: '8px' }}>
                © 2026 Enterprise Construction Field Management
              </span>
            </div>

            <ul className="lp-footer__links">
              <li>
                <button
                  onClick={() => onLegalPage('privacy')}
                  className="lp-footer__link caption-1"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onLegalPage('terms')}
                  className="lp-footer__link caption-1"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Terms and Conditions
                </button>
              </li>
              <li>
                <a
                  href="https://github.com/SdThakur/CMSC-447-Project"
                  target="_blank"
                  rel="noreferrer"
                  className="lp-footer__link caption-1"
                >
                  Repository
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
