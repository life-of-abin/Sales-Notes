import { Minus, Plus } from 'lucide-react';

export default function QuantitySelector({ value, onChange, min = 1, max = 999 }) {
  return (
    <div className="qty-selector">
      <button
        className="qty-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        id="qty-decrease"
      >
        <Minus size={20} />
      </button>
      <span className="qty-value">{value}</span>
      <button
        className="qty-btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        id="qty-increase"
      >
        <Plus size={20} />
      </button>
    </div>
  );
}
