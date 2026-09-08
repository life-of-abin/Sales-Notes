import { formatCurrency } from '../../utils/formatCurrency';

export default function StatCard({
  icon,
  iconBg,
  label,
  value,
  isCurrency = true,
  isPrivate = false,
  onClick,
}) {
  const getMaskedValue = () => {
    const stars = '****';
    return isCurrency ? `₹ ${stars}` : stars;
  };

  return (
    <div
      className="stat-card"
      onClick={onClick}
      id={`stat-${label.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="stat-card-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="stat-card-content">
        <div className="stat-card-label">{label}</div>
        <div className={`stat-card-value ${isPrivate ? 'stat-card-value--masked' : ''}`}>
          {isPrivate ? getMaskedValue(value) : isCurrency ? formatCurrency(value) : value}
        </div>
      </div>
    </div>
  );
}

