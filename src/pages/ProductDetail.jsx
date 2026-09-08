import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { getProductStock } from '../services/inventoryService';
import { formatCurrency } from '../utils/formatCurrency';
import { getProductEmoji, getProductColor } from '../utils/constants';
import { formatProductDisplayName } from '../utils/transliterate';
import PageHeader from '../components/layout/PageHeader';
import { HandCoins } from 'lucide-react';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { productSummaries, language, t } = useBusiness();
  const [lots, setLots] = useState([]);

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

  const totalInvested = lots.reduce((sum, l) => sum + l.remainingQty * l.purchasePrice, 0);
  const potentialSales = lots.reduce((sum, l) => sum + l.remainingQty * l.sellingPrice, 0);
  const expectedProfit = potentialSales - totalInvested;

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

  return (
    <div className="page-content">
      <PageHeader title={formatProductDisplayName(product.name, language)} showBack />

      {/* Product Hero */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
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
              <span className="price-row-price">{formatCurrency(group.price)}</span>
              <span className="price-row-qty">{group.qty} {t.pieces}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="summary-row">
          <span className="summary-row-label">{t.totalInvested}</span>
          <span className="summary-row-value">{formatCurrency(totalInvested)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-row-label">{t.potentialSales}</span>
          <span className="summary-row-value">{formatCurrency(potentialSales)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-row-label">{t.expectedProfit}</span>
          <span className="summary-row-value profit">{formatCurrency(expectedProfit)}</span>
        </div>
      </div>

      {/* Sell Button */}
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
    </div>
  );
}
