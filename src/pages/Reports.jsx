import { useState, useEffect } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { formatCurrency } from '../utils/formatCurrency';
import { getBatchProfitData, getMonthlySummary } from '../services/reportService';
import PageHeader from '../components/layout/PageHeader';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

export default function Reports() {
  const { batches, t } = useBusiness();
  const [chartData, setChartData] = useState([]);
  const [monthly, setMonthly] = useState(null);
  const [selectedBar, setSelectedBar] = useState(null);

  useEffect(() => {
    async function load() {
      const data = await getBatchProfitData();
      setChartData(data);

      const now = new Date();
      const summary = await getMonthlySummary(now.getMonth(), now.getFullYear());
      setMonthly(summary);
    }
    load();
  }, [batches]);

  const handleBarClick = (data) => {
    if (data && data.activePayload) {
      setSelectedBar(data.activePayload[0].payload);
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="page-content">
        <PageHeader title={t.reports} />
        <EmptyState
          emoji="📊"
          title={t.noDataYet}
          description={t.startReportsDesc}
        />
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader title={t.reports} />

      {/* Batch Profit Chart */}
      <div className="section-header">
        <div className="section-title">{t.batchProfit}</div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-2xl)', padding: 'var(--space-lg) var(--space-sm)' }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} onClick={handleBarClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
              width={45}
            />
            <Bar dataKey="realizedProfit" radius={[6, 6, 0, 0]} cursor="pointer">
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.status === 'completed' ? '#22C55E' : '#5B5FE6'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-xl)', marginTop: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#22C55E' }} />
            {t.completed}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#5B5FE6' }} />
            {t.stillSelling}
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      {monthly && (
        <>
          <div className="section-header">
            <div className="section-title">{t.monthlySummary}</div>
          </div>
          <div className="card">
            <div className="summary-row">
              <span className="summary-row-label">{t.salesLabel}</span>
              <span className="summary-row-value">{formatCurrency(monthly.totalSales)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">{t.profitLabel}</span>
              <span className="summary-row-value profit">{formatCurrency(monthly.totalProfit)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">{t.expensesLabel}</span>
              <span className="summary-row-value loss">{formatCurrency(monthly.totalExpenses)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">{t.netProfitLabel}</span>
              <span className={`summary-row-value ${monthly.netProfit >= 0 ? 'profit' : 'loss'}`}>
                {formatCurrency(monthly.netProfit)}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">{t.stockLabel}</span>
              <span className="summary-row-value">{formatCurrency(monthly.stockValue)}</span>
            </div>
          </div>
        </>
      )}

      {/* Batch Detail Modal */}
      <Modal
        isOpen={!!selectedBar}
        onClose={() => setSelectedBar(null)}
        title={selectedBar ? `${t.batch} #${selectedBar.batchNumber}` : ''}
      >
        {selectedBar && (
          <>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)', fontSize: 'var(--font-size-sm)' }}>
              {selectedBar.label}
            </div>
            <div className="summary-row">
              <span className="summary-row-label">{t.purchaseCost}</span>
              <span className="summary-row-value">{formatCurrency(selectedBar.totalInvestment)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">{t.realizedProfit}</span>
              <span className="summary-row-value profit">{formatCurrency(selectedBar.realizedProfit)}</span>
            </div>
            {selectedBar.status !== 'completed' && (
              <div className="summary-row">
                <span className="summary-row-label">{t.remainingProfit}</span>
                <span className="summary-row-value">{formatCurrency(selectedBar.expectedProfit)}</span>
              </div>
            )}
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <span className={`status-badge ${selectedBar.status === 'completed' ? 'status-badge--completed' : 'status-badge--selling'}`}>
                {selectedBar.status === 'completed' ? `🟢 ${t.completed}` : `🟡 ${t.stillSelling}`}
              </span>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
