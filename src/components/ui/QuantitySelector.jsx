import { Minus, Plus } from 'lucide-react';

export default function QuantitySelector({ value, onChange, min = 1, max = 999 }) {
  const currentVal = Number(value) || 0;

  const handleInputChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      onChange('');
      return;
    }
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    if (value === '' || value < min) {
      onChange(min);
    } else if (max !== undefined && value > max) {
      onChange(max);
    }
  };

  return (
    <div className="qty-selector">
      <button
        type="button"
        className="qty-btn"
        onClick={() => onChange(Math.max(min, (currentVal || min) - 1))}
        disabled={currentVal <= min}
        aria-label="Decrease quantity"
        id="qty-decrease"
      >
        <Minus size={20} />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="qty-input"
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        aria-label="Enter quantity manually"
        id="qty-input-manual"
      />

      <button
        type="button"
        className="qty-btn"
        onClick={() => onChange(Math.min(max, (currentVal || 0) + 1))}
        disabled={max !== undefined && currentVal >= max}
        aria-label="Increase quantity"
        id="qty-increase"
      >
        <Plus size={20} />
      </button>
    </div>
  );
}
