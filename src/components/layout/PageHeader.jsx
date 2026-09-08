import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function PageHeader({ title, showBack = false, rightAction }) {
  const navigate = useNavigate();

  return (
    <div className="page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {showBack && (
          <button
            className="page-header-back"
            onClick={() => navigate(-1)}
            id="btn-back"
            aria-label="Go back"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <h1>{title}</h1>
      </div>
      {rightAction && rightAction}
    </div>
  );
}
