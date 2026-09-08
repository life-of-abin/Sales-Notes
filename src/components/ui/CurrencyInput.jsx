export default function CurrencyInput({ value, onChange, placeholder = '0', id, label }) {
  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    onChange(raw);
  };

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="currency-input-wrapper">
        <input
          type="text"
          inputMode="numeric"
          className="form-input form-input--currency"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          id={id}
        />
      </div>
    </div>
  );
}
