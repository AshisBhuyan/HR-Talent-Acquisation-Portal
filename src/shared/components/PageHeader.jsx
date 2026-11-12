export default function PageHeader({ eyebrow, title, subtitle, actions, children }) {
  return (
    <div className="page-header">
      <div className="page-header__text">
        {eyebrow && <span className="page-header__eyebrow">{eyebrow}</span>}
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
