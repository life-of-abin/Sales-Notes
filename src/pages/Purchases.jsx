import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { formatProductDisplayName } from '../utils/transliterate';
import { calculateBatchMetrics } from '../services/calculationService';
import PageHeader from '../components/layout/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { CheckCircle2 } from 'lucide-react';
import db from '../db/database';

export default function Purchases() {
  const navigate = useNavigate();
  const { batches, language, t } = useBusiness();
  const [batchDetails, setBatchDetails] = useState({});
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedBatchMetrics, setSelectedBatchMetrics] = useState(null);

  useEffect(() => {
    async function loadDetails() {
      const details = {};
      const [allocations, saleItems, allLots] = await Promise.all([
        db.saleAllocations.toArray(),
        db.saleItems.toArray(),
        db.inventoryLots.toArray(),
      ]);

      const saleItemsMap = new Map(saleItems.map((si) => [si.id, si]));
      const lotsByBatch = new Map();
      for (const lot of allLots) {
        if (!lotsByBatch.has(lot.batchId)) {
          lotsByBatch.set(lot.batchId, []);
        }
        lotsByBatch.get(lot.batchId).push(lot);
      }

      for (const batch of batches) {
        const batchLots = lotsByBatch.get(batch.id) || [];
        const metrics = calculateBatchMetrics(batchLots, allocations, saleItemsMap);

        details[batch.id] = {
          status: metrics.status,
          realized: metrics.realizedProfit,
          expected: metrics.totalExpectedReturn,
          expectedProfit: metrics.grossProfit,
          grossProfit: metrics.grossProfit,
          itemCount: metrics.totalPurchasedQty,
          remainingCount: metrics.totalRemainingQty,
          discount: metrics.totalDiscount,
          totalInvestment: metrics.totalInvestment || Number(batch.totalInvestment) || 0,
        };
      }
      setBatchDetails(details);
    }
    loadDetails();
  }, [batches]);

  const openBatchDetail = async (batch) => {
    const [lots, products, allocations, saleItems] = await Promise.all([
      db.inventoryLots.where('batchId').equals(batch.id).toArray(),
      db.products.toArray(),
      db.saleAllocations.toArray(),
      db.saleItems.toArray(),
    ]);

    const productsMap = new Map(products.map((p) => [p.id, p]));
    const saleItemsMap = new Map(saleItems.map((si) => [si.id, si]));

    const metrics = calculateBatchMetrics(lots, allocations, saleItemsMap);
    const enrichedLots = metrics.lots.map((lot) => ({
      ...lot,
      productName: productsMap.get(lot.productId)?.name || 'Item',
    }));

    setSelectedBatchMetrics({ ...metrics, lots: enrichedLots });
    setSelectedBatch(batch);
  };

  if (batches.length === 0) {
    return (
      <div className="page-content">
        <PageHeader title={t.purchases} />
        <EmptyState
          emoji="🛒"
          title={t.noPurchases}
          description={t.noPurchasesDesc}
          actionLabel={t.addPurchase}
          onAction={() => navigate('/new-purchase')}
        />
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader title={t.purchases} />

      {batches.map((batch) => {
        const detail = batchDetails[batch.id] || {};
        const isCompleted = detail.status === 'completed';

        return (
          <div
            key={batch.id}
            className="batch-card"
            onClick={() => openBatchDetail(batch)}
            id={`batch-${batch.batchNumber}`}
          >
            <div className="batch-card-header">
              <span className="batch-card-title">{t.batch} #{batch.batchNumber}</span>
              <span className="batch-card-date">{formatDate(batch.date, language)}</span>
            </div>
            <div className="batch-card-stats">
              <div className="batch-card-stat">
                <span className="batch-card-stat-label">{t.invested}</span>
                <span className="batch-card-stat-value">{formatCurrency(detail.totalInvestment ?? batch.totalInvestment)}</span>
              </div>
              <div className="batch-card-stat">
                <span className="batch-card-stat-label">{t.items}</span>
                <span className="batch-card-stat-value">{detail.itemCount || 0}</span>
              </div>
              <div className="batch-card-stat">
                <span className="batch-card-stat-label">{isCompleted ? t.finalProfit : t.profit}</span>
                <span className="batch-card-stat-value" style={{ color: (detail.realized || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {formatCurrency(detail.realized || 0)}
                </span>
                {detail.discount > 0 && (
                  <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: 2, display: 'block', fontWeight: 600 }}>
                    {t.actualProfitShort || 'Actual'}: {formatCurrency(detail.grossProfit || ((detail.realized || 0) + detail.discount))}
                  </span>
                )}
              </div>
            </div>
            <span className={`status-badge ${isCompleted ? 'status-badge--completed' : 'status-badge--selling'}`}>
              {isCompleted ? `🟢 ${t.completed}` : `🟡 ${t.stillSelling}`}
            </span>
          </div>
        );
      })}

      {/* Batch Detail Modal */}
      <Modal
        isOpen={!!selectedBatch}
        onClose={() => {
          setSelectedBatch(null);
          setSelectedBatchMetrics(null);
        }}
        title={selectedBatch ? `${t.batch} #${selectedBatch.batchNumber}` : ''}
      >
        {selectedBatch && selectedBatchMetrics && (
          <>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)', fontSize: 'var(--font-size-sm)' }}>
              {formatDate(selectedBatch.date, language)}
            </div>

            {/* Items in batch */}
            {selectedBatchMetrics.lots.map((lot) => {
              const isMultiItem = selectedBatchMetrics.lots.length > 1;
              const isSoldOut = lot.remainingQty === 0;

              return (
                <div key={lot.id} className="card" style={{ marginBottom: 'var(--space-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{formatProductDisplayName(lot.productName, language)}</span>
                      {isSoldOut && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 7px',
                          borderRadius: '12px',
                          background: '#22C55E18',
                          color: '#16A34A',
                          border: '1px solid #22C55E40',
                          fontSize: '11px',
                          fontWeight: 700,
                          lineHeight: 1,
                        }}>
                          <CheckCircle2 size={11} strokeWidth={2.5} />
                          {t.soldOutTag || 'Sold Out'}
                        </span>
                      )}
                    </div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                      {lot.quantity} {t.pieces}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    <span>{t.buyLabel}: {formatCurrency(lot.purchasePrice)}</span>
                    <span>{t.sellLabel}: {formatCurrency(lot.sellingPrice)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>
                      {t.remaining}: {lot.remainingQty}/{lot.quantity}
                    </span>
                    {!isMultiItem ? (
                      <span style={{ color: lot.realizedProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                        {formatCurrency(lot.realizedProfit)} {t.earned}
                      </span>
                    ) : (
                      <span style={{ color: lot.remainingQty > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)', fontWeight: 600 }}>
                        {t.expectedReturn || 'Expected Return'}: <span style={{ color: lot.remainingQty > 0 ? 'var(--color-text)' : 'inherit', fontWeight: 700 }}>{formatCurrency(lot.expectedReturn)}</span>
                      </span>
                    )}
                  </div>
                  {!isMultiItem && lot.discount > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 'var(--font-size-xs)',
                      marginTop: 4,
                      paddingTop: 2,
                    }}>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>
                        {t.discountGiven || 'Discount Given'}:
                      </span>
                      <span style={{ color: '#EF4444', fontWeight: 700 }}>
                        -{formatCurrency(lot.discount)}
                      </span>
                    </div>
                  )}
                  {isMultiItem && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 'var(--font-size-sm)',
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: '1px dashed var(--color-border, rgba(0,0,0,0.08))',
                    }}>
                      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                        {t.realizedProfit}
                      </span>
                      <span style={{ color: lot.realizedProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700, fontSize: '0.95rem' }}>
                        {formatCurrency(lot.realizedProfit)}
                      </span>
                    </div>
                  )}
                  {isMultiItem && lot.discount > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 'var(--font-size-xs)',
                      marginTop: 4,
                      paddingTop: 2,
                    }}>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>
                        {t.discountGiven || 'Discount Given'}:
                      </span>
                      <span style={{ color: '#EF4444', fontWeight: 700 }}>
                        -{formatCurrency(lot.discount)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="divider" />

            {/* Summary */}
            <div className="summary-row">
              <span className="summary-row-label">{t.totalInvestment}</span>
              <span className="summary-row-value">{formatCurrency(selectedBatchMetrics.totalInvestment)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">{t.realizedProfit}</span>
              <span className={`summary-row-value ${selectedBatchMetrics.realizedProfit >= 0 ? 'profit' : 'loss'}`}>
                {formatCurrency(selectedBatchMetrics.realizedProfit)}
              </span>
            </div>
            {selectedBatchMetrics.totalDiscount > 0 && (
              <div className="summary-row">
                <span className="summary-row-label">
                  {t.actualProfit || 'Actual Profit (without discounts)'}
                </span>
                <span className="summary-row-value" style={{ color: 'var(--color-primary, #5B1EE6)', fontWeight: 700 }}>
                  {formatCurrency(selectedBatchMetrics.grossProfit)}
                </span>
              </div>
            )}
            {selectedBatchMetrics.status !== 'completed' && (
              <div className="summary-row">
                <span className="summary-row-label">{t.expectedReturn || 'Expected Return'}</span>
                <span className="summary-row-value" style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                  {formatCurrency(selectedBatchMetrics.totalExpectedReturn)}
                </span>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
