const VARIANTS = {
  primary: 'btn--primary',
  secondary: 'btn--secondary',
  outline: 'btn--outline',
  ghost: 'btn--ghost',
  danger: 'btn--danger',
  'danger-ghost': 'btn--danger-ghost',
};

const SIZES = {
  sm: 'btn--sm',
  md: '',
  lg: 'btn--lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  icon: Icon = null,
  iconPosition = 'left',
  type = 'button',
  block = false,
  ...rest
}) {
  const classes = [
    'btn',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || '',
    block ? 'btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const iconNode = Icon ? <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" /> : null;

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading ? (
        <span className="btn__spinner" aria-hidden="true" />
      ) : (
        iconPosition === 'left' && iconNode
      )}
      {children}
      {!loading && iconPosition === 'right' && iconNode}
    </button>
  );
}
