import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { getProductStock } from '../services/inventoryService';
import { roundCurrency } from '../services/calculationService';
import SmartAmountText from '../components/ui/SmartAmountText';
import { getProductEmoji, getProductColor } from '../utils/constants';
import { formatProductDisplayName } from '../utils/transliterate';
import PageHeader from '../components/layout/PageHeader';
import Modal from '../components/ui/Modal';
import { HandCoins, Trash2, AlertTriangle } from 'lucide-react';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { productSummaries, deleteProduct, language, t } = useBusiness();
  const [lots, setLots] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const product = productSummaries.find((p) => p.id === id);

  useEffect(() => {
    if (id) {
      getProductStock(id).then(setLots);
    }
  }, [id, productSummaries]);

  if (!product) {
    return (
      <div className="page-content">
        <PageHeader title={t.product} showBack />
        <p>{t.productNotFound}</p>
      </div>
    );
  }

  const totalInvested = roundCurrency(lots.reduce((sum, l) => sum + (Number(l.remainingQty) || 0) * (Number(l.purchasePrice) || 0), 0));
  const potentialSales = roundCurrency(lots.reduce((sum, l) => sum + (Number(l.remainingQty) || 0) * (Number(l.sellingPrice) || 0), 0));
  const expectedProfit = roundCurrency(potentialSales - totalInvested);

  // Group lots by selling price
  const priceGroups = {};
  for (const lot of lots) {
    if (lot.remainingQty > 0) {
      const key = lot.sellingPrice;
      if (!priceGroups[key]) {
        priceGroups[key] = { price: key, qty: 0 };
      }
      priceGroups[key].qty += lot.remainingQty;
    }
  }
  const priceBreakdown = Object.values(priceGroups).sort((a, b) => a.price - b.price);

  const emoji = getProductEmoji(product.name);
  const color = getProductColor(product.name);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      setShowDeleteConfirm(false);
      navigate('/stock');
    } catch (err) {
      console.error('Failed to delete product:', err);
      setDeleting(false);
    }
  };

  return (
    <div className="page-content">
      <PageHeader
        title={formatProductDisplayName(product.name, language)}
        showBack
        rightAction={
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: '#FEE2E2',
              color: '#DC2626',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title={language === 'ta' ? 'பொருளை நீக்கு' : 'Delete Product / Stock'}
            id="btn-delete-product-header"
            aria-label="Delete product"
          >
            <Trash2 size={18} />
          </button>
        }
      />

      {/* Product Hero */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', position: 'relative' }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 'var(--radius-lg)',
            background: `${color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            margin: '0 auto var(--space-md)',
          }}
        >
          {emoji}
        </div>
        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>
          {product.totalQty}
        </div>
        <div style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          {t.available}
        </div>
      </div>

      {/* Price Breakdown */}
      {priceBreakdown.length > 0 && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="section-title" style={{ marginBottom: 'var(--space-md)' }}>
            {t.sellingPriceBreakdown}
          </div>
          {priceBreakdown.map((group) => (
            <div key={group.price} className="price-row">
              <span className="price-row-price"><SmartAmountText value={group.price} compact={true} /></span>
              <span className="price-row-qty">{group.qty} {t.pieces}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="summary-row">
          <span className="summary-row-label">{t.totalInvested}</span>
          <span className="summary-row-value"><SmartAmountText value={totalInvested} compact={true} /></span>
        </div>
        <div className="summary-row">
          <span className="summary-row-label">{t.potentialSales}</span>
          <span className="summary-row-value"><SmartAmountText value={potentialSales} compact={true} /></span>
        </div>
        <div className="summary-row">
          <span className="summary-row-label">{t.expectedProfit}</span>
          <span className="summary-row-value profit"><SmartAmountText value={expectedProfit} compact={true} /></span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {product.totalQty > 0 && (
          <button
            className="btn btn--success btn--lg"
            onClick={() => navigate(`/new-sale?productId=${product.id}`)}
            id="btn-sell-this"
          >
            <HandCoins size={20} />
            {t.sellThis}
          </button>
        )}

        <button
          className="btn btn--outline"
          style={{ borderColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
          onClick={() => setShowDeleteConfirm(true)}
          id="btn-delete-stock-full"
        >
          <Trash2 size={18} />
          {language === 'ta' ? 'இந்த பொருளை / ஸ்டாக்கை நீக்கு' : 'Delete this Stock / Product'}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={language === 'ta' ? 'பொருளை நீக்கவா?' : 'Delete Product?'}
      >
        <div style={{ textAlign: 'center', padding: 'var(--space-md) 0' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-md)',
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', marginBottom: 8 }}>
            {formatProductDisplayName(product.name, language)}
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-xl)' }}>
            {language === 'ta'
              ? 'இந்த பொருளையும் அதற்கான அனைத்து இருப்பு ஸ்டாக் விவரங்களையும் நீக்க நிச்சயமாக விரும்புகிறீர்களா? இந்த செயலை மாற்ற இயலாது.'
              : 'Are you sure you want to delete this product and its remaining inventory stock? This action cannot be undone.'}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <button
              className="btn btn--outline"
              style={{ flex: 1 }}
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              id="btn-cancel-delete-product"
            >
              {language === 'ta' ? 'ரத்து செய்' : 'Cancel'}
            </button>
            <button
              className="btn btn--danger"
              style={{ flex: 1 }}
              onClick={handleDelete}
              disabled={deleting}
              id="btn-confirm-delete-product"
            >
              {deleting ? (language === 'ta' ? 'நீக்குகிறது...' : 'Deleting...') : (language === 'ta' ? 'ஆம், நீக்கு' : 'Yes, Delete')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
