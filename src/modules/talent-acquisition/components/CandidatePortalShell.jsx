import EcometrixLogo from '../../../shared/components/EcometrixLogo.jsx';
import '../styles/candidatePortal.css';

/**
 * Standalone candidate-facing shell. Deliberately free of the HR sidebar,
 * header and navigation: candidates only ever see this portal.
 */
export default function CandidatePortalShell({ eyebrow, title, subtitle, children }) {
  return (
    <div className="cp-portal">
      <header className="cp-portal__header">
        <div className="cp-portal__brand">
          <EcometrixLogo className="cp-portal__logo" />
          <div>
            <div className="cp-portal__brand-name">Ecometrix</div>
            <div className="cp-portal__brand-sub">Talent Acquisition · Candidate Self-Service</div>
          </div>
        </div>
        <span className="cp-portal__secure">Personal secure link</span>
      </header>

      <main className="cp-portal__main">
        <div className="cp-portal__intro">
          <p className="page-header__eyebrow cp-portal__eyebrow">{eyebrow}</p>
          <h1 className="cp-portal__title">{title}</h1>
          {subtitle && <p className="cp-portal__subtitle">{subtitle}</p>}
        </div>

        {children}
      </main>

      <p className="cp-portal__footer">
        This page is personal to you. Do not share the link. Responses and submissions are recorded
        against your application. Ecometrix never asks for passwords or payment details through
        these links.
      </p>
    </div>
  );
}
