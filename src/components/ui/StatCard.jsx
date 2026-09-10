import SmartAmountText from './SmartAmountText';

export default function StatCard({
  icon,
  iconBg,
  label,
  value,
  isCurrency = true,
  isPrivate = false,
  onClick,
}) {
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
          {isCurrency ? (
            <SmartAmountText
              value={value}
              isPrivate={isPrivate}
              compact={true}
            />
          ) : (
            isPrivate ? '****' : value
          )}
        </div>
      </div>
    </div>
  );
}

