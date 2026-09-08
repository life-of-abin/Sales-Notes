import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { formatProductDisplayName } from '../utils/transliterate';
import { Search } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import ProductCard from '../components/ui/ProductCard';
import EmptyState from '../components/ui/EmptyState';

export default function Stock() {
  const navigate = useNavigate();
  const { productSummaries, language, t } = useBusiness();
  const [search, setSearch] = useState('');

  const filtered = productSummaries.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Separate into in-stock and out-of-stock
  const inStock = filtered.filter((p) => p.totalQty > 0);
  const outOfStock = filtered.filter((p) => p.totalQty === 0);

  if (productSummaries.length === 0) {
    return (
      <div className="page-content">
        <PageHeader title={t.stock} />
        <EmptyState
          emoji="📦"
          title={t.noStock}
          description={t.noStockDesc}
          actionLabel={t.addPurchase}
          onAction={() => navigate('/new-purchase')}
        />
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader title={t.stock} />

      {/* Search */}
      <div className="search-bar">
        <Search size={18} className="search-bar-icon" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          id="stock-search"
        />
      </div>

      {/* Product Grid */}
      {inStock.length > 0 && (
        <div className="product-grid" style={{ marginBottom: 'var(--space-2xl)' }}>
          {inStock.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => navigate(`/stock/${product.id}`)}
            />
          ))}
        </div>
      )}

      {/* Out of stock */}
      {outOfStock.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 'var(--space-lg)' }}>
            <div className="section-title" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
              {t.outOfStock}
            </div>
          </div>
          <div className="product-grid">
            {outOfStock.map((product) => (
              <div
                key={product.id}
                className="product-card"
                style={{ opacity: 0.5 }}
                onClick={() => navigate(`/stock/${product.id}`)}
              >
                <div className="product-card-name">{formatProductDisplayName(product.name, language)}</div>
                <div className="product-card-qty" style={{ color: 'var(--color-danger)' }}>
                  0 {t.pieces}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
