import { useBusiness } from '../../hooks/useBusiness';
import { getProductEmoji, getProductColor } from '../../utils/constants';
import { formatProductDisplayName } from '../../utils/transliterate';
import { Trash2 } from 'lucide-react';

export default function ProductCard({ product, onClick, onDelete }) {
  const { language, t } = useBusiness();
  const emoji = getProductEmoji(product.name);
  const color = getProductColor(product.name);

  return (
    <div className="product-card" onClick={onClick} id={`product-${product.id}`} style={{ position: 'relative' }}>
      {onDelete && (
        <button
          className="product-card-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(product);
          }}
          title={language === 'ta' ? 'பொருளை நீக்கு' : 'Delete Stock'}
          aria-label="Delete product"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            background: 'rgba(239, 68, 68, 0.1)',
            border: 'none',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#EF4444',
            cursor: 'pointer',
            zIndex: 2,
          }}
        >
          <Trash2 size={14} />
        </button>
      )}
      <div
        className="product-card-icon"
        style={{ background: `${color}18` }}
      >
        {emoji}
      </div>
      <div className="product-card-name">{formatProductDisplayName(product.name, language)}</div>
      <div className="product-card-qty">
        {product.totalQty} {t.pieces}
      </div>
    </div>
  );
}
