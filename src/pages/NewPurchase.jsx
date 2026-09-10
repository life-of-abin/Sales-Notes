import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { formatCurrency } from '../utils/formatCurrency';
import { generateId } from '../utils/generateId';
import PageHeader from '../components/layout/PageHeader';
import CurrencyInput from '../components/ui/CurrencyInput';
import SmartAmountText from '../components/ui/SmartAmountText';
import { Plus, X, Save, AlertTriangle } from 'lucide-react';

const emptyItem = () => ({
  key: generateId(),
  productName: '',
  quantity: '',
  purchasePrice: '',
  sellingPrice: '',
});

export default function NewPurchase() {
  const navigate = useNavigate();
  const { createPurchase, products, t } = useBusiness();
  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(null);
  const inputRefs = useRef({});

  const updateItem = (key, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const removeItem = (key) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const getItemTotal = (item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.purchasePrice) || 0;
    return qty * price;
  };

  const getItemExpectedSales = (item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.sellingPrice) || 0;
    return qty * price;
  };

  const totalInvestment = items.reduce((sum, item) => sum + getItemTotal(item), 0);
  const totalExpectedSales = items.reduce((sum, item) => sum + getItemExpectedSales(item), 0);
  const totalExpectedProfit = totalExpectedSales - totalInvestment;

  const isValid = items.every(
    (item) =>
      item.productName.trim() &&
      Number(item.quantity) > 0 &&
      Number(item.purchasePrice) > 0 &&
      Number(item.sellingPrice) > Number(item.purchasePrice)
  );

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const purchaseItems = items.map((item) => ({
        productName: item.productName.trim(),
        quantity: Number(item.quantity),
        purchasePrice: Number(item.purchasePrice),
        sellingPrice: Number(item.sellingPrice),
      }));
      await createPurchase(purchaseItems);
      navigate('/purchases');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Filter product suggestions
  const getSuggestions = (name) => {
    if (!name || name.length < 1) return [];
    const lower = name.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(lower))
      .slice(0, 5);
  };

  return (
    <div className="page-content">
      <PageHeader title={t.newPurchase} showBack />

      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)', fontSize: 'var(--font-size-sm)' }}>
        {t.todaysWholesale}
      </p>

      {items.map((item, index) => (
        <div key={item.key} className="item-row animate-pop">
          <div className="item-row-header">
            <span className="item-row-title">Item {index + 1}</span>
            {items.length > 1 && (
              <button
                className="item-row-remove"
                onClick={() => removeItem(item.key)}
                aria-label="Remove item"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Product Name */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">{t.product}</label>
            <input
              ref={(el) => (inputRefs.current[item.key] = el)}
              type="text"
              className="form-input"
              value={item.productName}
              onChange={(e) => {
                updateItem(item.key, 'productName', e.target.value);
                setShowSuggestions(item.key);
              }}
              onFocus={() => setShowSuggestions(item.key)}
              onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
              placeholder={t.productPlaceholder}
              id={`input-product-${index}`}
            />
            {showSuggestions === item.key && getSuggestions(item.productName).length > 0 && (
              <div className="autocomplete-dropdown">
                {getSuggestions(item.productName).map((p) => (
                  <div
                    key={p.id}
                    className="autocomplete-item"
                    onMouseDown={() => {
                      updateItem(item.key, 'productName', p.name);
                      setShowSuggestions(null);
                    }}
                  >
                    {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="item-row-grid">
            <div className="form-group">
              <label className="form-label">{t.quantity}</label>
              <input
                type="text"
                inputMode="numeric"
                className="form-input"
                value={item.quantity}
                onChange={(e) => updateItem(item.key, 'quantity', e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
                id={`input-qty-${index}`}
              />
            </div>
            <CurrencyInput
              label={t.buyingPrice}
              value={item.purchasePrice}
              onChange={(v) => updateItem(item.key, 'purchasePrice', v)}
              id={`input-buy-price-${index}`}
            />
          </div>

          <CurrencyInput
            label={t.sellingPrice}
            value={item.sellingPrice}
            onChange={(v) => updateItem(item.key, 'sellingPrice', v)}
            id={`input-sell-price-${index}`}
          />

          {/* Loss / Equal warning banner */}
          {Number(item.purchasePrice) > 0 &&
            Number(item.sellingPrice) > 0 &&
            Number(item.sellingPrice) <= Number(item.purchasePrice) && (
              <div
                className="warning-banner animate-pop"
                style={{
                  marginTop: 'var(--space-sm)',
                  background: '#FEF2F2',
                  border: '1.5px solid #F87171',
                  color: '#991B1B',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 700,
                }}
              >
                <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                <span>
                  {(t.sellingPriceMustBeHigher || 'Selling price must be greater than buying price ({price})').replace(
                    '{price}',
                    formatCurrency(Number(item.purchasePrice))
                  )}
                </span>
              </div>
            )}

          {/* Item totals */}
          {getItemTotal(item) > 0 && (
            <div style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
              <div className="summary-row" style={{ padding: 'var(--space-xs) 0' }}>
                <span className="summary-row-label">{t.totalCost}</span>
                <span className="summary-row-value"><SmartAmountText value={getItemTotal(item)} /></span>
              </div>
              {getItemExpectedSales(item) > 0 && (
                <>
                  <div className="summary-row" style={{ padding: 'var(--space-xs) 0' }}>
                    <span className="summary-row-label">{t.expectedSales}</span>
                    <span className="summary-row-value"><SmartAmountText value={getItemExpectedSales(item)} /></span>
                  </div>
                  <div className="summary-row" style={{ padding: 'var(--space-xs) 0' }}>
                    <span className="summary-row-label">{t.expectedProfit}</span>
                    <span className="summary-row-value profit">
                      <SmartAmountText value={getItemExpectedSales(item) - getItemTotal(item)} />
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add another item */}
      <button
        className="btn btn--outline"
        onClick={addItem}
        style={{ marginBottom: 'var(--space-2xl)' }}
        id="btn-add-item"
      >
        <Plus size={18} />
        {t.addAnotherItem}
      </button>

      {/* Purchase Summary */}
      {totalInvestment > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
          <div className="summary-row">
            <span className="summary-row-label">{t.totalInvestment}</span>
            <span className="summary-row-value"><SmartAmountText value={totalInvestment} /></span>
          </div>
          <div className="summary-row">
            <span className="summary-row-label">{t.expectedSales}</span>
            <span className="summary-row-value"><SmartAmountText value={totalExpectedSales} /></span>
          </div>
          <div className="summary-row">
            <span className="summary-row-label">{t.expectedProfit}</span>
            <span className="summary-row-value profit"><SmartAmountText value={totalExpectedProfit} /></span>
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        className="btn btn--primary btn--lg"
        onClick={handleSave}
        disabled={!isValid || saving}
        id="btn-save-purchase"
      >
        <Save size={20} />
        {saving ? t.saving : t.savePurchase}
      </button>
    </div>
  );
}
