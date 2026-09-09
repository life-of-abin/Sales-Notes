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
          totalInvestment: metrics.totalInvestment || Number(batch.totalInvestment) || 0,
          totalSales: metrics.totalSales || 0,
          profitWithoutDiscount: metrics.profitWithoutDiscount || 0,
          realizedProfit: metrics.realizedProfit || 0,
          itemCount: metrics.totalPurchasedQty,
          soldCount: metrics.totalSoldQty,
          remainingCount: metrics.totalRemainingQty,
          discount: metrics.totalDiscount,
          extra: metrics.totalExtra,
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
            <div className="batch-card-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {/* 1. Total Investment */}
              <div className="batch-card-stat">
                <span className="batch-card-stat-label">{t.totalInvestment || t.invested}</span>
                <span className="batch-card-stat-value">{formatCurrency(detail.totalInvestment ?? batch.totalInvestment)}</span>
              </div>
              {/* 2. Total Sales */}
              <div className="batch-card-stat">
                <span className="batch-card-stat-label">{t.totalSales || 'Total Sales'}</span>
                <span className="batch-card-stat-value">{formatCurrency(detail.totalSales || 0)}</span>
              </div>
              {/* 3. Profit Without Discount */}
              <div className="batch-card-stat">
                <span className="batch-card-stat-label">{t.profitWithoutDiscount || 'Profit Without Discount'}</span>
                <span className="batch-card-stat-value" style={{ color: 'var(--color-primary, #5B1EE6)' }}>
                  {formatCurrency(detail.profitWithoutDiscount || 0)}
                </span>
              </div>
              {/* 4. Realized Profit */}
              <div className="batch-card-stat">
                <span className="batch-card-stat-label">{t.realizedProfit || 'Realized Profit'}</span>
                <span className="batch-card-stat-value" style={{ color: (detail.realizedProfit || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {formatCurrency(detail.realizedProfit || 0)}
                </span>
              </div>
            </div>
            <span className={`status-badge ${isCompleted ? 'status-badge--completed' : 'status-badge--selling'}`} style={{ marginTop: 8 }}>
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
                    <span>{t.costPriceLabel || t.buyLabel}: {formatCurrency(lot.purchasePrice)}</span>
                    <span>{t.sellingPriceLabel || t.sellLabel}: {formatCurrency(lot.sellingPrice)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>
                      {t.remaining}: {lot.remainingQty}/{lot.quantity}
                    </span>
                    <span style={{ color: lot.realizedProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                      {t.realizedProfit || t.earned}: {formatCurrency(lot.realizedProfit)}
                    </span>
                  </div>
                  {lot.discount > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 'var(--font-size-xs)',
                      marginTop: 4,
                      paddingTop: 2,
                    }}>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>
                        {t.discount || t.discountGiven}:
                      </span>
                      <span style={{ color: '#EF4444', fontWeight: 700 }}>
                        -{formatCurrency(lot.discount)}
                      </span>
                    </div>
                  )}
                  {lot.extra > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 'var(--font-size-xs)',
                      marginTop: 4,
                      paddingTop: 2,
                    }}>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>
                        {t.extra || t.extraEarned || 'Extra'}:
                      </span>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>
                        +{formatCurrency(lot.extra)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="divider" />

            {/* Batch Summary in exact required order:
                1. Total Investment
                2. Total Sales
                3. Profit Without Discount
                4. Realized Profit */}
            <div className="summary-row">
              <span className="summary-row-label">{t.totalInvestment}</span>
              <span className="summary-row-value">{formatCurrency(selectedBatchMetrics.totalInvestment)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">{t.totalSales}</span>
              <span className="summary-row-value">{formatCurrency(selectedBatchMetrics.totalSales || selectedBatchMetrics.totalRevenue || 0)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">{t.profitWithoutDiscount || 'Profit Without Discount'}</span>
              <span className="summary-row-value" style={{ color: 'var(--color-primary, #5B1EE6)', fontWeight: 700 }}>
                {formatCurrency(selectedBatchMetrics.profitWithoutDiscount || selectedBatchMetrics.grossProfit || 0)}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">{t.realizedProfit}</span>
              <span className={`summary-row-value ${selectedBatchMetrics.realizedProfit >= 0 ? 'profit' : 'loss'}`}>
                {formatCurrency(selectedBatchMetrics.realizedProfit)}
              </span>
            </div>

            {selectedBatchMetrics.totalDiscount > 0 && (
              <div className="summary-row">
                <span className="summary-row-label">{t.discount}</span>
                <span className="summary-row-value" style={{ color: '#EF4444', fontWeight: 700 }}>
                  -{formatCurrency(selectedBatchMetrics.totalDiscount)}
                </span>
              </div>
            )}
            {selectedBatchMetrics.totalExtra > 0 && (
              <div className="summary-row">
                <span className="summary-row-label">{t.extra || 'Extra'}</span>
                <span className="summary-row-value" style={{ color: '#10B981', fontWeight: 700 }}>
                  +{formatCurrency(selectedBatchMetrics.totalExtra)}
                </span>
              </div>
            )}

            {selectedBatchMetrics.totalRemainingQty > 0 && (
              <>
                <div className="summary-row">
                  <span className="summary-row-label">{t.remainingStock || 'Remaining Stock'}</span>
                  <span className="summary-row-value">{selectedBatchMetrics.totalRemainingQty} {t.pieces}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-row-label">{t.expectedReturn || 'Expected Return'}</span>
                  <span className="summary-row-value" style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                    {formatCurrency(selectedBatchMetrics.totalExpectedReturn)}
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
