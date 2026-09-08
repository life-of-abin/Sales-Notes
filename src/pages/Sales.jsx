import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, formatTime, isToday, isThisWeek, isThisMonth } from '../utils/formatDate';
import { formatProductDisplayName } from '../utils/transliterate';
import PageHeader from '../components/layout/PageHeader';
import EmptyState from '../components/ui/EmptyState';

export default function Sales() {
  const navigate = useNavigate();
  const { sales, saleItems, products, language, t } = useBusiness();
  const [filter, setFilter] = useState('today');

  const filterFns = {
    today: (s) => isToday(s.date),
    week: (s) => isThisWeek(s.date),
    month: (s) => isThisMonth(s.date),
    all: () => true,
  };

  const filtered = sales.filter(filterFns[filter] || filterFns.all);

  const totalSales = filtered.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalProfit = filtered.reduce((sum, s) => sum + s.totalProfit, 0);

  const getProductName = (saleId) => {
    const items = saleItems.filter((si) => si.saleId === saleId);
    if (items.length === 0) return t.sell || 'Sale';
    const product = products.find((p) => p.id === items[0].productId);
    return formatProductDisplayName(product?.name || 'Item', language);
  };

  const filters = [
    { key: 'today', label: t.today },
    { key: 'week', label: t.thisWeek },
    { key: 'month', label: t.thisMonth },
    { key: 'all', label: t.all },
  ];

  return (
    <div className="page-content">
      <PageHeader title={t.sales} />

      {/* Filters */}
      <div className="filter-row">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`filter-chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
            id={`filter-${f.key}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="summary-row">
            <span className="summary-row-label">{t.todaySales.replace("Today's", 'Total')}</span>
            <span className="summary-row-value">{formatCurrency(totalSales)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row-label">{t.profit}</span>
            <span className="summary-row-value profit">{formatCurrency(totalProfit)}</span>
          </div>
        </div>
      )}

      {/* Sales list */}
      {filtered.length === 0 ? (
        <EmptyState
          emoji="💵"
          title={t.noSales}
          description={t.noSalesDesc}
          actionLabel={t.sell}
          onAction={() => navigate('/new-sale')}
        />
      ) : (
        filtered.map((sale) => (
          <div key={sale.id} className="sale-card">
            <div className="sale-card-left">
              <div className="sale-card-product">{getProductName(sale.id)}</div>
              <div className="sale-card-time">
                {formatDate(sale.date, language)} · {formatTime(sale.date)}
              </div>
            </div>
            <div className="sale-card-right">
              <div className="sale-card-amount">{formatCurrency(sale.totalAmount)}</div>
              <div className={`sale-card-profit ${sale.totalProfit < 0 ? 'negative' : ''}`}>
                {sale.totalProfit >= 0 ? '+' : ''}{formatCurrency(sale.totalProfit)}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
