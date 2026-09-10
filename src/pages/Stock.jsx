import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { formatProductDisplayName } from '../utils/transliterate';
import { Search, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import ProductCard from '../components/ui/ProductCard';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';

export default function Stock() {
  const navigate = useNavigate();
  const { productSummaries, deleteProduct, language, t } = useBusiness();
  const [search, setSearch] = useState('');
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
    } catch (err) {
      console.error('Failed to delete product from stock:', err);
    } finally {
      setDeleting(false);
    }
  };

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
              onDelete={(p) => setProductToDelete(p)}
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
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => navigate(`/stock/${product.id}`)}
                onDelete={(p) => setProductToDelete(p)}
              />
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        title={language === 'ta' ? 'பொருளை நீக்கவா?' : 'Delete Stock / Product?'}
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
            {productToDelete && formatProductDisplayName(productToDelete.name, language)}
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-xl)' }}>
            {language === 'ta'
              ? 'இந்த பொருளையும் அதற்கான இருப்பு ஸ்டாக் விவரங்களையும் நீக்க நிச்சயமாக விரும்புகிறீர்களா?'
              : 'Are you sure you want to delete this product and its remaining inventory stock?'}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <button
              className="btn btn--outline"
              style={{ flex: 1 }}
              onClick={() => setProductToDelete(null)}
              disabled={deleting}
              id="btn-cancel-delete-stock"
            >
              {language === 'ta' ? 'ரத்து செய்' : 'Cancel'}
            </button>
            <button
              className="btn btn--danger"
              style={{ flex: 1 }}
              onClick={handleConfirmDelete}
              disabled={deleting}
              id="btn-confirm-delete-stock"
            >
              {deleting ? (language === 'ta' ? 'நீக்குகிறது...' : 'Deleting...') : (language === 'ta' ? 'ஆம், நீக்கு' : 'Yes, Delete')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
