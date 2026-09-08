import { useBusiness } from '../../hooks/useBusiness';
import { getProductEmoji, getProductColor } from '../../utils/constants';
import { formatProductDisplayName } from '../../utils/transliterate';

export default function ProductCard({ product, onClick }) {
  const { language, t } = useBusiness();
  const emoji = getProductEmoji(product.name);
  const color = getProductColor(product.name);

  return (
    <div className="product-card" onClick={onClick} id={`product-${product.id}`}>
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
