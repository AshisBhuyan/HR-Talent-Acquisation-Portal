export default function EcometrixLogo({ className = '' }) {
  return (
    <span className={`ecometrix-logo ${className}`.trim()}>
      <img src="/assets/ecometrix-logo.png" alt="Ecometrix" />
    </span>
  );
}
