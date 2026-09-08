import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { getProductStock } from '../services/inventoryService';
import { formatCurrency } from '../utils/formatCurrency';
import { getProductEmoji, getProductColor } from '../utils/constants';
import { formatProductDisplayName, formatCustomerDisplayName, toTamilName } from '../utils/transliterate';
import PageHeader from '../components/layout/PageHeader';
import QuantitySelector from '../components/ui/QuantitySelector';
import CurrencyInput from '../components/ui/CurrencyInput';
import { AlertTriangle } from 'lucide-react';

export default function NewSale() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProductId = searchParams.get('productId');
  const { productSummaries, recordSale, customers, addCustomer, language, t } = useBusiness();

  const [step, setStep] = useState(preselectedProductId ? 1 : 0); // 0 = pick product, 1 = details
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [lots, setLots] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [showCustomer, setShowCustomer] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [belowCost, setBelowCost] = useState(false);
  const [showBelowCostConfirm, setShowBelowCostConfirm] = useState(false);

  const activeProducts = productSummaries.filter((p) => p.totalQty > 0);

  // If preselected product
  useEffect(() => {
    if (preselectedProductId) {
      const product = productSummaries.find((p) => p.id === preselectedProductId);
      if (product) {
        selectProduct(product);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedProductId, productSummaries]);

  const selectProduct = async (product) => {
    setSelectedProduct(product);
    const productLots = await getProductStock(product.id);
    setLots(productLots);
    // Set default selling price from the first lot
    if (productLots.length > 0) {
      setSellingPrice(String(productLots[0].sellingPrice));
    }
    setStep(1);
  };

  const finalPrice = (Number(sellingPrice) || 0) - (Number(discount) || 0);
  const totalAmount = quantity * finalPrice;
  const maxQty = selectedProduct?.totalQty || 0;

  // Check below cost
  useEffect(() => {
    if (lots.length > 0 && finalPrice > 0) {
      const firstLotCost = lots[0].purchasePrice;
      setBelowCost(finalPrice < firstLotCost);
    }
  }, [finalPrice, lots]);

  const handleSale = async () => {
    if (belowCost && !showBelowCostConfirm) {
      setShowBelowCostConfirm(true);
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      let customerId = null;
      let paid = null;

      if (showCustomer && customerName.trim()) {
        // Find or create customer
        const trimmedName = customerName.trim();
        const finalName = language === 'ta' ? toTamilName(trimmedName) : trimmedName;
        const existing = customers.find(
          (c) => c.name.toLowerCase() === finalName.toLowerCase() || c.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (existing) {
          customerId = existing.id;
        } else {
          customerId = await addCustomer(finalName);
        }
        paid = Number(paidAmount) || 0;
      }

      await recordSale(
        selectedProduct.id,
        quantity,
        Number(sellingPrice) || 0,
        Number(discount) || 0,
        customerId,
        paid
      );
      navigate('/sales');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Step 0: Pick product
  if (step === 0) {
    return (
      <div className="page-content">
        <PageHeader title={t.sell} showBack />

        {activeProducts.length === 0 ? (
          <div className="empty-state animate-fade">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-title">{t.noStock}</div>
            <div className="empty-state-desc">{t.noStockDesc}</div>
            <button className="btn btn--primary" onClick={() => navigate('/new-purchase')} id="btn-go-purchase">
              {t.buy}
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {activeProducts.map((product) => (
              <div
                key={product.id}
                className="product-card"
                onClick={() => selectProduct(product)}
                id={`sale-product-${product.id}`}
              >
                <div
                  className="product-card-icon"
                  style={{ background: `${getProductColor(product.name)}18` }}
                >
                  {getProductEmoji(product.name)}
                </div>
                <div className="product-card-name">{formatProductDisplayName(product.name, language)}</div>
                <div className="product-card-qty">{product.totalQty} {t.pieces}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Step 1: Sale details
  return (
    <div className="page-content">
      <PageHeader title={formatProductDisplayName(selectedProduct?.name, language) || t.sell} showBack />

      {/* Product Info */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
        <div style={{ fontSize: 48, marginBottom: 'var(--space-sm)' }}>
          {getProductEmoji(selectedProduct?.name)}
        </div>
        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', marginBottom: 4 }}>
          {formatProductDisplayName(selectedProduct?.name, language)}
        </div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          {t.available}: {maxQty} {t.pieces}
        </div>
      </div>

      {/* Quantity */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
        <label className="form-label" style={{ marginBottom: 'var(--space-md)' }}>{t.quantity}</label>
        <QuantitySelector
          value={quantity}
          onChange={setQuantity}
          min={1}
          max={maxQty}
        />
        {quantity > maxQty && (
          <div className="form-error" style={{ justifyContent: 'center', marginTop: 'var(--space-sm)' }}>
            {t.onlyAvailable.replace('{n}', maxQty)}
          </div>
        )}
      </div>

      {/* Price */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <CurrencyInput
          label={t.sellingPrice}
          value={sellingPrice}
          onChange={setSellingPrice}
          id="input-sell-price"
        />
        <CurrencyInput
          label={`${t.discount} (optional)`}
          value={discount}
          onChange={setDiscount}
          id="input-discount"
        />
        {finalPrice > 0 && (
          <div className="summary-row">
            <span className="summary-row-label">{t.finalPrice}</span>
            <span className="summary-row-value">{formatCurrency(finalPrice)}</span>
          </div>
        )}
      </div>

      {/* Below cost warning */}
      {belowCost && (
        <div className="warning-banner">
          <AlertTriangle size={18} />
          {t.belowCostWarning}
        </div>
      )}

      {/* Customer credit */}
      {!showCustomer ? (
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => setShowCustomer(true)}
          style={{ marginBottom: 'var(--space-lg)' }}
          id="btn-add-customer"
        >
          {t.addCustomerCredit}
        </button>
      ) : (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="form-group">
            <label className="form-label">{t.customer}</label>
            <input
              type="text"
              className="form-input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t.customerNamePlaceholder}
              id="input-customer-name"
            />
            {language === 'ta' && customerName.trim() && (
              <div
                style={{
                  marginTop: '6px',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-primary, #4f46e5)',
                  fontWeight: 600,
                }}
              >
                தமிழ்: {toTamilName(customerName)}
              </div>
            )}
          </div>
          <CurrencyInput
            label={t.paidAmount}
            value={paidAmount}
            onChange={setPaidAmount}
            id="input-paid-amount"
          />
          {Number(paidAmount) < totalAmount && customerName.trim() && (
            <div style={{ color: 'var(--color-warning-dark)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
              {t.pending}: {formatCurrency(totalAmount - (Number(paidAmount) || 0))}
            </div>
          )}
        </div>
      )}

      {/* Total */}
      {totalAmount > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)', background: 'var(--color-success-bg)' }}>
          <div className="summary-row">
            <span className="summary-row-label" style={{ fontWeight: 600 }}>{t.total}</span>
            <span className="summary-row-value" style={{ fontSize: 'var(--font-size-2xl)' }}>
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      )}

      {/* Below cost confirmation */}
      {showBelowCostConfirm && (
        <div className="warning-banner" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <AlertTriangle size={18} />
            {t.sellingBelowPurchasePrice}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowBelowCostConfirm(false)} style={{ flex: 1 }}>
              {t.cancel}
            </button>
            <button className="btn btn--primary btn--sm" onClick={handleSale} style={{ flex: 1 }}>
              {t.confirm}
            </button>
          </div>
        </div>
      )}

      {/* Confirm Sale */}
      {!showBelowCostConfirm && (
        <button
          className="btn btn--success btn--lg"
          onClick={handleSale}
          disabled={saving || quantity > maxQty || finalPrice <= 0}
          id="btn-confirm-sale"
        >
          {saving ? t.recording : t.confirmSale}
        </button>
      )}
    </div>
  );
}
