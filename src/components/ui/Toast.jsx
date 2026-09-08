import { useBusiness } from '../../hooks/useBusiness';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

const icons = {
  success: <CheckCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  error: <XCircle size={20} />,
  info: <Info size={20} />,
};

export default function ToastContainer() {
  const { toasts } = useBusiness();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <span className="toast-icon">{icons[toast.type] || icons.success}</span>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
