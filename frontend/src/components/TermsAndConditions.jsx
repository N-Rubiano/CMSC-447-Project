import React from "react";
import { ArrowLeft, FileText, AlertTriangle, Scale, RefreshCw, HardHat } from "lucide-react";

const SECTIONS = [
  {
    icon: FileText, title: "Acceptance of Terms",
    body: `By accessing or using PunchList Pro you agree to be bound by these Terms of Service. If you do not agree, do not use the platform. These Terms apply to all users including administrators, general contractors, sub-contractors, and inspectors.`
  },
  {
    icon: HardHat, title: "Use of the Service",
    body: `PunchList Pro is licensed for professional construction field management. You may not use the service for any unlawful purpose, to harass other users, to upload malicious files, or to reverse-engineer proprietary features. You are responsible for all activity under your account.`
  },
  {
    icon: FileText, title: "Account Responsibilities",
    body: `You must provide accurate registration information and keep credentials confidential. You are responsible for all actions taken under your account. Notify us immediately of any unauthorized access at security@punchlistpro.com.`
  },
  {
    icon: AlertTriangle, title: "Limitation of Liability",
    body: `PunchList Pro is provided "as is." To the maximum extent permitted by law we disclaim all warranties. We are not liable for any indirect, incidental, or consequential damages arising from use of the platform, including data loss or project delays. Our total liability shall not exceed the fees paid in the 3 months prior to the claim.`
  },
  {
    icon: Scale, title: "Intellectual Property",
    body: `PunchList Pro and all its components are the intellectual property of PunchList Pro LLC. Your project data — blueprints, punch items, photos, and reports — remains your property. You grant us a limited license to store and process it solely to provide the service.`
  },
  {
    icon: RefreshCw, title: "Changes to Terms",
    body: `We may update these Terms with 14 days' notice via email or in-app notification. Continued use after the effective date constitutes acceptance of the updated Terms.`
  },
];

export default function TermsAndConditions({ onBack }) {
  return (
    <div style={{ minHeight:"100vh",backgroundColor:"var(--bg)",fontFamily:"var(--font-sans)",padding:"32px 16px" }}>
      <div style={{ maxWidth:760,margin:"0 auto" }}>
        {onBack && (
          <button onClick={onBack} style={{ display:"flex",alignItems:"center",gap:8,background:"none",border:"none",color:"var(--amber)",cursor:"pointer",fontWeight:600,fontSize:14,marginBottom:24,padding:0 }}>
            <ArrowLeft size={16}/> Back
          </button>
        )}
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:8 }}>
          <Scale size={28} color="var(--amber)"/>
          <h1 style={{ fontSize:28,fontWeight:800,color:"var(--ink)",margin:0 }}>Terms &amp; Conditions</h1>
        </div>
        <p style={{ color:"var(--text-secondary)",fontSize:14,marginBottom:36 }}>Effective: October 1, 2026 · Last updated: October 1, 2026</p>
        <p style={{ color:"var(--text-secondary)",lineHeight:1.7,marginBottom:32 }}>
          Please read these Terms of Service carefully before using PunchList Pro. These Terms govern your access to and use of our enterprise construction field management platform.
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
