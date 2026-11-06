/** Original, decorative product illustrations. SVG + CSS only; no animation runtime. */
export function HeroSignal() {
  return (
    <div className="hero-signal" data-hero-signal aria-hidden="true">
      <svg className="signal-wires" viewBox="0 0 1440 640" fill="none">
        <path className="signal-track" d="M140 240V380Q140 420 190 420H270Q310 420 310 470V550H1130Q1170 550 1170 500V360Q1170 320 1220 320H1300V245" />
        <path className="signal-packet" d="M140 240V380Q140 420 190 420H270Q310 420 310 470V550H1130Q1170 550 1170 500V360Q1170 320 1220 320H1300V245" />
        <path className="signal-track" d="M70 475H160Q190 475 190 505V590H1250Q1280 590 1280 560V465H1370" />
        <circle cx="310" cy="470" r="5" fill="var(--color-primary-500)" opacity=".35" />
        <circle cx="1170" cy="360" r="5" fill="var(--color-primary-500)" opacity=".35" />
      </svg>
      <div className="signal-fragment signal-form">
        <div className="signal-card-label"><span className="signal-status-dot" /> Demo request</div>
        <span className="signal-field-label">Work email</span>
        <div className="signal-field">maya@company.com<span className="signal-cursor" /></div>
        <span className="signal-field-label">Company size</span>
        <div className="signal-field">51–200 employees</div>
        <div className="signal-form-action">Capture lead <span>↗</span></div>
      </div>
      <div className="signal-fragment signal-qualified"><span className="signal-check">✓</span><span><strong>Guard passed</strong><small>Ready for enrichment</small></span></div>
      <div className="signal-fragment signal-owner"><div className="signal-card-label">Route matched <span>↗</span></div><div className="signal-person"><span>JW</span><div><strong>Jonas Weber</strong><small>EMEA · Available</small></div></div><div className="signal-mini-route"><i /><i /><i /><span>Meeting booked</span></div></div>
      <div className="signal-fragment signal-enriched"><span className="signal-check">+</span><span><strong>Enrichment complete</strong><small>75 employees · ICP 82</small></span></div>
      <svg className="signal-mobile" viewBox="0 0 340 64" fill="none">
        <path d="M42 26H298" stroke="var(--line)" strokeWidth="1.5" />
        <path className="signal-packet" d="M42 26H298" />
        {[[42, "Capture"], [128, "Guard"], [212, "Enrich"], [298, "Route"]].map(([x, label], i) => <g key={label}><rect x={Number(x) - 14} y="12" width="28" height="28" rx="9" fill="var(--surface)" stroke="var(--line)" /><text x={x} y="31" textAnchor="middle" fill="var(--color-primary-500)" fontSize="12" fontWeight="600">{["+", "✓", "+", "↗"][i]}</text><text x={x} y="58" textAnchor="middle" fill="var(--muted)" fontSize="9">{label}</text></g>)}
      </svg>
    </div>
  );
}

export function RoutingIllustration() {
  return (
    <svg className="cta-routing-art" data-cta-graphic viewBox="0 0 500 300" fill="none" aria-hidden="true">
      <path d="M130 90H200Q225 90 225 120V150H300M225 150V220Q225 240 250 240H350" stroke="#4b525d" strokeWidth="2" />
      <path className="cta-route-packet" d="M130 90H200Q225 90 225 120V150H300M225 150V220Q225 240 250 240H350" stroke="#f7764c" strokeWidth="2" />
      <rect x="18" y="35" width="145" height="126" rx="14" fill="#24282f" stroke="#444b56" />
      <text x="34" y="61" fill="#f7f8fa" fontSize="12" fontWeight="600">Demo request</text>
      <rect x="34" y="75" width="112" height="25" rx="5" fill="#17191c" stroke="#444b56" /><text x="42" y="91" fill="#bac2ce" fontSize="9">maya@company.com</text>
      <rect x="34" y="109" width="75" height="6" rx="3" fill="#56606f" />
      <rect x="34" y="129" width="112" height="17" rx="8.5" fill="#cf3f16" /><text x="90" y="141" textAnchor="middle" fill="white" fontSize="8">New inbound lead ↗</text>
      <rect x="186" y="123" width="78" height="54" rx="12" fill="#cf3f16" /><text x="225" y="146" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Route</text><text x="225" y="163" textAnchor="middle" fill="white" fontSize="9">Rule matched</text>
      <rect x="300" y="102" width="174" height="92" rx="14" fill="#24282f" stroke="#444b56" />
      <circle cx="327" cy="133" r="14" fill="#454e5d" /><text x="327" y="137" textAnchor="middle" fill="white" fontSize="9">JW</text>
      <text x="351" y="131" fill="white" fontSize="12" fontWeight="600">Jonas Weber</text><text x="351" y="147" fill="#bac2ce" fontSize="10">EMEA · Available</text>
      <path d="M319 168H451" stroke="#444b56" /><circle cx="324" cy="180" r="3" fill="#f7764c" /><text x="334" y="183" fill="#e9edf2" fontSize="9">The right conversation, sooner.</text>
      <rect x="310" y="222" width="166" height="35" rx="17.5" fill="#24282f" stroke="#444b56" /><text x="393" y="244" textAnchor="middle" fill="#f7f8fa" fontSize="11">✓ Meeting booked</text>
      <rect x="63" y="212" width="113" height="30" rx="15" fill="#24282f" stroke="#444b56" /><text x="119" y="231" textAnchor="middle" fill="#bac2ce" fontSize="10">✓ Guard passed</text>
    </svg>
  );
}
