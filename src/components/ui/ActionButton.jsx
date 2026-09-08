export default function ActionButton({ icon, label, variant = 'buy', onClick, id }) {
  return (
    <button
      className={`action-btn action-btn--${variant}`}
      onClick={onClick}
      id={id}
    >
      {icon}
      {label}
    </button>
  );
}
