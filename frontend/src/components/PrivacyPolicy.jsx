import React from "react";
import { ArrowLeft, Shield, Lock, Eye, Server, Cookie, Mail } from "lucide-react";

const SECTIONS = [
  {
    icon: Eye, title: "Information We Collect",
    body: `We collect information you provide directly: name, work email, company name, and role when you register. We also collect project data you create — blueprints, punch pins, photos, field reports, and comments — solely to provide the PunchList Pro service. Usage data (page views, feature interactions, browser type, device class) is collected anonymously for product improvement.`
  },
  {
    icon: Server, title: "How We Use Your Information",
    body: `Your data is used exclusively to operate, maintain, and improve PunchList Pro. We do not sell, rent, or share your personal information with third parties for marketing. We may share data with service providers acting on our behalf (cloud hosting, error monitoring) under strict confidentiality agreements.`
  },
  {
    icon: Lock, title: "Data Security",
    body: `All data is transmitted over TLS 1.2+. Passwords are hashed with bcrypt (never stored in plain text). Access tokens use short-lived JWTs. We enforce connection pooling and rate limiting at the API layer. Sensitive credentials are managed via environment secrets and never committed to source control.`
  },
  {
    icon: Cookie, title: "Cookies & Local Storage",
    body: `PunchList Pro uses browser localStorage and sessionStorage to cache project data for offline-first operation. We do not use third-party advertising cookies. Analytics, if enabled, use privacy-preserving aggregation with no cross-site tracking.`
  },
  {
    icon: Shield, title: "Your Rights",
    body: `You may request access to, correction of, or deletion of your personal data at any time. Account deletion removes all personal information and associated project records within 30 days. To exercise these rights, contact privacy@punchlistpro.com.`
  },
  {
    icon: Mail, title: "Contact",
    body: `Questions about this policy? Contact our privacy team at privacy@punchlistpro.com. For general support, use the in-app feedback button or email support@punchlistpro.com.`
  },
];

export default function PrivacyPolicy({ onBack }) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", fontFamily: "var(--font-sans)", padding: "32px 16px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {onBack && (
          <button onClick={onBack} style={{ display:"flex",alignItems:"center",gap:8,background:"none",border:"none",color:"var(--amber)",cursor:"pointer",fontWeight:600,fontSize:14,marginBottom:24,padding:0 }}>
            <ArrowLeft size={16}/> Back
          </button>
        )}
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:8 }}>
          <Shield size={28} color="var(--amber)"/>
          <h1 style={{ fontSize:28,fontWeight:800,color:"var(--ink)",margin:0 }}>Privacy Policy</h1>
        </div>
        <p style={{ color:"var(--text-secondary)",fontSize:14,marginBottom:36 }}>Effective: October 1, 2026 · Last updated: October 1, 2026</p>
        <p style={{ color:"var(--text-secondary)",lineHeight:1.7,marginBottom:32 }}>
          PunchList Pro ("we", "us") takes your privacy seriously. This policy explains what data we collect, how we use it, and your rights as a user of our construction field management platform.
        </p>
        {SECTIONS.map(({ icon: Icon, title, body }) => (
          <div key={title} style={{ marginBottom:32,padding:"20px 24px",borderRadius:12,border:"1.5px solid var(--border)",background:"#fff" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
              <Icon size={20} color="var(--amber)"/>
              <h2 style={{ fontSize:17,fontWeight:700,color:"var(--ink)",margin:0 }}>{title}</h2>
            </div>
            <p style={{ color:"var(--text-secondary)",lineHeight:1.75,margin:0 }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
