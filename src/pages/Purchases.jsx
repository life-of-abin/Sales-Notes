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
import SmartAmountText from '../components/ui/SmartAmountText';
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
          expectedProfit: metrics.expectedProfit || 0,
          profitWithoutDiscount: metrics.profitWithoutDiscount || 0,
          realizedProfit: metrics.realizedProfit || 0,
          totalItemProfit: metrics.totalItemProfit || 0,
          totalLoss: metrics.totalLoss || 0,
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
              <span className="batch-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {t.batch} #{batch.batchNumber}
                <span className={`status-badge ${isCompleted ? 'status-badge--completed' : 'status-badge--selling'}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                  {isCompleted ? `🟢 ${t.completed}` : `🟡 ${t.stillSelling}`}
                </span>
              </span>
              <span className="batch-card-date">{formatDate(batch.date, language)}</span>
            </div>
            <div className="batch-card-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {/* 1. Total Investment */}
              <div className="batch-card-stat">
                <span className="batch-card-stat-label">{t.totalInvestment || t.invested}</span>
                <span className="batch-card-stat-value"><SmartAmountText value={detail.totalInvestment ?? batch.totalInvestment} compact={true} /></span>
              </div>
              {/* 2. Total Sales */}
              <div className="batch-card-stat">
                <span className="batch-card-stat-label">{t.totalSales || 'Total Sales'}</span>
                <span className="batch-card-stat-value"><SmartAmountText value={detail.totalSales || 0} compact={true} /></span>
              </div>
              {/* 3. Expected Profit */}
              <div className="batch-card-stat">
                <span className="batch-card-stat-label">{t.expectedProfit || 'Expected Profit'}</span>
                <span className="batch-card-stat-value" style={{ color: 'var(--color-primary, #5B1EE6)' }}>
                  <SmartAmountText value={detail.expectedProfit ?? 0} compact={true} />
                </span>
              </div>
              {/* 4. Realized Profit (net result) */}
              <div className="batch-card-stat">
                <span className="batch-card-stat-label">{t.realizedProfit || 'Realized Profit'}</span>
                <span className="batch-card-stat-value" style={{ color: (detail.realizedProfit || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  <SmartAmountText value={detail.realizedProfit || 0} compact={true} />
                </span>
              </div>
              {/* 5. Discount (if present) */}
              {detail.discount > 0 && (
                <div className="batch-card-stat">
                  <span className="batch-card-stat-label">{t.discount || 'Discount'}</span>
                  <span className="batch-card-stat-value" style={{ color: '#EF4444' }}>
                    -<SmartAmountText value={detail.discount} compact={true} />
                  </span>
                </div>
              )}
              {/* 6. Extra (if present) */}
              {detail.extra > 0 && (
                <div className="batch-card-stat">
                  <span className="batch-card-stat-label">{t.extra || 'Extra'}</span>
                  <span className="batch-card-stat-value" style={{ color: '#10B981' }}>
                    +<SmartAmountText value={detail.extra} compact={true} />
                  </span>
                </div>
              )}
              {/* 7. Loss (if present) */}
              {detail.totalLoss > 0 && (
                <div className="batch-card-stat">
                  <span className="batch-card-stat-label">{t.lossLabel || t.loss || 'Loss'}</span>
                  <span className="batch-card-stat-value" style={{ color: '#EF4444' }}>
                    <SmartAmountText value={detail.totalLoss} compact={true} />
                  </span>
                </div>
              )}
            </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* 1. Top Metadata & Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                {formatDate(selectedBatch.date, language)}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 9px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: selectedBatchMetrics.status === 'completed' ? '#22C55E18' : '#3B82F618',
                  color: selectedBatchMetrics.status === 'completed' ? '#16A34A' : '#2563EB',
                  border: `1px solid ${selectedBatchMetrics.status === 'completed' ? '#22C55E40' : '#3B82F640'}`,
                }}
              >
                {selectedBatchMetrics.status === 'completed' ? (
                  <>
                    <CheckCircle2 size={11} strokeWidth={2.5} />
                    {t.soldOutTag || 'Sold Out'}
                  </>
                ) : (
                  <>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB' }} />
                    {t.sellingStatus || 'Selling'}
                  </>
                )}
              </span>
            </div>

            {/* 2. SCROLLABLE ITEMS LIST (ABOVE OVERALL VALUES) */}
            <div>
              <div style={{ marginBottom: 6, padding: '0 2px' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                  📦 {language === 'ta' ? 'பொருட்கள் பட்டியல்' : 'Items in Batch'} ({selectedBatchMetrics.lots.length})
                </span>
              </div>

              {/* Dedicated Scrollable List Container (Shows 3-4 items, visible slider at right) */}
              <div className="batch-items-scroll">
                {selectedBatchMetrics.lots.map((lot) => {
                  const isSoldOut = lot.remainingQty === 0;

                  return (
                    <div
                      key={lot.id}
                      className="card"
                      style={{
                        margin: 0,
                        padding: '10px 12px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface, #ffffff)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
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
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                          {lot.quantity} {t.pieces}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                        <span>{t.costPriceLabel || t.buyLabel}: <SmartAmountText value={lot.purchasePrice} compact={true} /></span>
                        <span>{t.sellingPriceLabel || t.sellLabel}: <SmartAmountText value={lot.sellingPrice} compact={true} /></span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
                        <span style={{ color: 'var(--color-text-tertiary)' }}>
                          {t.remaining}: {lot.remainingQty}/{lot.quantity}
                        </span>
                        <span style={{ color: lot.realizedProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                          {t.realizedProfit || t.earned}: <SmartAmountText value={lot.realizedProfit} compact={true} />
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
                            -<SmartAmountText value={lot.discount} compact={true} />
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
                            +<SmartAmountText value={lot.extra} compact={true} />
                          </span>
                        </div>
                      )}
                      {lot.totalLoss > 0 && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 'var(--font-size-xs)',
                          marginTop: 4,
                          paddingTop: 2,
                        }}>
                          <span style={{ color: 'var(--color-text-tertiary)' }}>
                            {t.lossLabel || t.loss || 'Loss'}:
                          </span>
                          <span style={{ color: '#EF4444', fontWeight: 700 }}>
                            <SmartAmountText value={lot.totalLoss} compact={true} />
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. OVERALL PARAMETERS SUMMARY (BELOW ITEMS LIST) */}
            <div
              className="card"
              style={{
                background: 'var(--color-surface-2, #F8FAFC)',
                border: '1px solid var(--color-border, #E2E8F0)',
                padding: 'var(--space-md) var(--space-lg)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                margin: 0,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                📊 {t.overallSummary || 'Overall Summary'}
              </div>

              <div className="summary-row" style={{ marginBottom: 4 }}>
                <span className="summary-row-label">{t.totalInvestment}</span>
                <span className="summary-row-value" style={{ fontWeight: 700 }}>
                  <SmartAmountText value={selectedBatchMetrics.totalInvestment} compact={true} />
                </span>
              </div>
              <div className="summary-row" style={{ marginBottom: 4 }}>
                <span className="summary-row-label">{t.totalSales}</span>
                <span className="summary-row-value" style={{ fontWeight: 700 }}>
                  <SmartAmountText value={selectedBatchMetrics.totalSales || selectedBatchMetrics.totalRevenue || 0} compact={true} />
                </span>
              </div>
              <div className="summary-row" style={{ marginBottom: 4 }}>
                <span className="summary-row-label">{t.expectedProfit || 'Expected Profit'}</span>
                <span className="summary-row-value" style={{ color: 'var(--color-primary, #5B1EE6)', fontWeight: 700 }}>
                  <SmartAmountText value={selectedBatchMetrics.expectedProfit ?? 0} compact={true} />
                </span>
              </div>
              <div className="summary-row" style={{ marginBottom: selectedBatchMetrics.totalDiscount > 0 || selectedBatchMetrics.totalExtra > 0 || selectedBatchMetrics.totalLoss > 0 ? 4 : 0 }}>
                <span className="summary-row-label">{t.realizedProfit}</span>
                <span className={`summary-row-value ${selectedBatchMetrics.realizedProfit >= 0 ? 'profit' : 'loss'}`} style={{ fontWeight: 700 }}>
                  <SmartAmountText value={selectedBatchMetrics.realizedProfit} compact={true} />
                </span>
              </div>

              {selectedBatchMetrics.totalDiscount > 0 && (
                <div className="summary-row" style={{ marginBottom: 4 }}>
                  <span className="summary-row-label">{t.discount}</span>
                  <span className="summary-row-value" style={{ color: '#EF4444', fontWeight: 700 }}>
                    -<SmartAmountText value={selectedBatchMetrics.totalDiscount} compact={true} />
                  </span>
                </div>
              )}

              {selectedBatchMetrics.totalExtra > 0 && (
                <div className="summary-row" style={{ marginBottom: 4 }}>
                  <span className="summary-row-label">{t.extra || 'Extra'}</span>
                  <span className="summary-row-value" style={{ color: '#10B981', fontWeight: 700 }}>
                    +<SmartAmountText value={selectedBatchMetrics.totalExtra} compact={true} />
                  </span>
                </div>
              )}

              {selectedBatchMetrics.totalLoss > 0 && (
                <div className="summary-row">
                  <span className="summary-row-label">{t.lossLabel || t.loss || 'Loss'}</span>
                  <span className="summary-row-value" style={{ color: '#EF4444', fontWeight: 700 }}>
                    <SmartAmountText value={selectedBatchMetrics.totalLoss} compact={true} />
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

