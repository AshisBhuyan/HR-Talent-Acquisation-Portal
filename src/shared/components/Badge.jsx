const VARIANTS = ['green', 'orange', 'blue', 'red', 'grey', 'purple'];

export default function Badge({ children, variant = 'grey', dot = false, className = '' }) {
  const safeVariant = VARIANTS.includes(variant) ? variant : 'grey';
  return (
    <span className={`badge badge--${safeVariant} ${className}`.trim()}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
