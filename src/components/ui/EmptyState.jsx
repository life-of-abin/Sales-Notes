export default function EmptyState({ emoji, title, description, actionLabel, onAction }) {
  return (
    <div className="empty-state animate-fade">
      <div className="empty-state-icon">{emoji}</div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-desc">{description}</div>
      {actionLabel && onAction && (
        <button className="btn btn--primary" onClick={onAction} id="empty-state-action">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
