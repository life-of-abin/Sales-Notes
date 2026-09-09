import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { formatProductDisplayName } from '../utils/transliterate';
import { getBatchStatus, calculateRealizedProfit, calculateExpectedProfit } from '../services/profitService';
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
  const [batchLots, setBatchLots] = useState([]);

  useEffect(() => {
    async function loadDetails() {
      const details = {};
      const allocations = await db.saleAllocations.toArray();
      const saleItems = await db.saleItems.toArray();
      const saleItemsMap = new Map(saleItems.map((si) => [si.id, si]));

      for (const batch of batches) {
        const status = await getBatchStatus(batch.id);
        const realized = await calculateRealizedProfit(batch.id);
        const expected = await calculateExpectedProfit(batch.id);
        const lots = await db.inventoryLots.where('batchId').equals(batch.id).toArray();
        const itemCount = lots.reduce((sum, l) => sum + l.quantity, 0);
        const remainingCount = lots.reduce((sum, l) => sum + l.remainingQty, 0);

        const lotIds = new Set(lots.map((l) => l.id));
        const batchAllocations = allocations.filter((a) => lotIds.has(a.lotId));
        const discount = batchAllocations.reduce((sum, a) => {
          const si = saleItemsMap.get(a.saleItemId);
          const d = a.discount ?? si?.discount ?? 0;
          return sum + (Number(a.quantity) || 0) * (Number(d) || 0);
        }, 0);

        details[batch.id] = { status, realized, expected, itemCount, remainingCount, discount };
      }
      setBatchDetails(details);
    }
    loadDetails();
  }, [batches]);

  const openBatchDetail = async (batch) => {
    const lots = await db.inventoryLots.where('batchId').equals(batch.id).toArray();
    const products = await db.products.toArray();
    const allocations = await db.saleAllocations.toArray();
    const saleItems = await db.saleItems.toArray();
    const saleItemsMap = new Map(saleItems.map((si) => [si.id, si]));

    const enrichedLots = lots.map((lot) => {
      const lotAllocations = allocations.filter((a) => a.lotId === lot.id);
      const lotRealizedProfit = lotAllocations.reduce(
        (sum, a) => sum + a.quantity * (a.sellingPrice - a.purchasePrice),
        0
      );
      const lotDiscount = lotAllocations.reduce((sum, a) => {
        const si = saleItemsMap.get(a.saleItemId);
        const d = a.discount ?? si?.discount ?? 0;
        return sum + (Number(a.quantity) || 0) * (Number(d) || 0);
      }, 0);

      return {
        ...lot,
        productName: products.find((p) => p.id === lot.productId)?.name || 'Item',
        realizedProfit: lotRealizedProfit,
        discount: lotDiscount,
      };
    });
    setBatchLots(enrichedLots);
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
                <span className="batch-card-stat-value">{formatCurrency(batch.totalInvestment)}</span>
              </div>
              <div className="batch-card-stat">
                <span className="batch-card-stat-label">{t.items}</span>
                <span className="batch-card-stat-value">{detail.itemCount || 0}</span>
              </div>
              <div className="batch-card-stat">
                <span className="batch-card-stat-label">{isCompleted ? t.finalProfit : t.profit}</span>
                <span className="batch-card-stat-value" style={{ color: 'var(--color-success)' }}>
                  {formatCurrency(detail.realized || 0)}
                </span>
                {detail.discount > 0 && (
                  <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: 2, display: 'block', fontWeight: 600 }}>
                    {t.actualProfitShort || 'Actual'}: {formatCurrency((detail.realized || 0) + detail.discount)}
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
        onClose={() => setSelectedBatch(null)}
        title={selectedBatch ? `${t.batch} #${selectedBatch.batchNumber}` : ''}
      >
        {selectedBatch && (
          <>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)', fontSize: 'var(--font-size-sm)' }}>
              {formatDate(selectedBatch.date, language)}
            </div>

            {/* Items in batch */}
            {batchLots.map((lot) => {
              const isMultiItem = batchLots.length > 1;
              const isSoldOut = lot.remainingQty === 0;
              const lotProfit = lot.realizedProfit ?? ((lot.sellingPrice - lot.purchasePrice) * (lot.quantity - lot.remainingQty));
              const lotExpectedReturn = lot.remainingQty * (lot.sellingPrice - lot.purchasePrice);

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
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                        {formatCurrency(lotProfit)} {t.earned}
                      </span>
                    ) : (
                      <span style={{ color: lot.remainingQty > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)', fontWeight: 600 }}>
                        {t.expectedReturn || 'Expected Return'}: <span style={{ color: lot.remainingQty > 0 ? 'var(--color-text)' : 'inherit', fontWeight: 700 }}>{formatCurrency(lotExpectedReturn)}</span>
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
                      <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '0.95rem' }}>
                        {formatCurrency(lotProfit)}
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
              <span className="summary-row-value">{formatCurrency(selectedBatch.totalInvestment)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">{t.realizedProfit}</span>
              <span className="summary-row-value profit">
                {formatCurrency(batchDetails[selectedBatch.id]?.realized || 0)}
              </span>
            </div>
            {batchDetails[selectedBatch.id]?.discount > 0 && (
              <div className="summary-row">
                <span className="summary-row-label">
                  {t.actualProfit || 'Actual Profit (without discounts)'}
                </span>
                <span className="summary-row-value" style={{ color: 'var(--color-primary, #6366f1)', fontWeight: 700 }}>
                  {formatCurrency((batchDetails[selectedBatch.id]?.realized || 0) + batchDetails[selectedBatch.id].discount)}
                </span>
              </div>
            )}
            {batchDetails[selectedBatch.id]?.status !== 'completed' && (
              <div className="summary-row">
                <span className="summary-row-label">{t.remainingProfit}</span>
                <span className="summary-row-value" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatCurrency(batchDetails[selectedBatch.id]?.expected || 0)}
                </span>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
