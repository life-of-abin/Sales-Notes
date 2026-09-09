import { useState, useEffect } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { formatCurrency } from '../utils/formatCurrency';
import { getBatchProfitData, getPeriodicSummary, getProductPerformance } from '../services/reportService';
import PageHeader from '../components/layout/PageHeader';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

export default function Reports() {
  const { batches, sales, expenses, products, t } = useBusiness();
  const [timeframe, setTimeframe] = useState('month'); // 'today' | 'week' | 'month' | 'all'
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [selectedBar, setSelectedBar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const [batchData, periodSummary, productStats] = await Promise.all([
          getBatchProfitData(),
          getPeriodicSummary(timeframe),
          getProductPerformance(),
        ]);
        if (isMounted) {
          setChartData(batchData);
          setSummary(periodSummary);
          setTopProducts(productStats);
        }
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [batches, sales, expenses, products, timeframe]);

  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      setSelectedBar(data.activePayload[0].payload);
    }
  };

  const hasAnyData = batches.length > 0 || sales.length > 0 || expenses.length > 0;

  if (!loading && !hasAnyData) {
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

      {/* Timeframe Filter Tabs */}
      <div className="tab-switcher" style={{ marginBottom: 'var(--space-xl)' }}>
        <button
          type="button"
          className={`tab-switcher-btn ${timeframe === 'today' ? 'active' : ''}`}
          onClick={() => setTimeframe('today')}
        >
          {t.today || 'Today'}
        </button>
        <button
          type="button"
          className={`tab-switcher-btn ${timeframe === 'week' ? 'active' : ''}`}
          onClick={() => setTimeframe('week')}
        >
          {t.thisWeek || 'This Week'}
        </button>
        <button
          type="button"
          className={`tab-switcher-btn ${timeframe === 'month' ? 'active' : ''}`}
          onClick={() => setTimeframe('month')}
        >
          {t.thisMonth || 'This Month'}
        </button>
        <button
          type="button"
          className={`tab-switcher-btn ${timeframe === 'all' ? 'active' : ''}`}
          onClick={() => setTimeframe('all')}
        >
          {t.allTime || 'All Time'}
        </button>
      </div>

      {/* Financial Overview Cards */}
      {summary && (
        <div style={{ marginBottom: 'var(--space-2xl)' }}>
          <div className="section-header">
            <div className="section-title">{t.financialOverview || 'Financial Overview'}</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-lg)' }}>
            <div className="summary-row">
              <span className="summary-row-label">{t.salesLabel}</span>
              <span className="summary-row-value">{formatCurrency(summary.totalSales)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">{t.profitLabel}</span>
              <span className="summary-row-value profit">{formatCurrency(summary.totalProfit)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">{t.expensesLabel}</span>
              <span className="summary-row-value loss">{formatCurrency(summary.totalExpenses)}</span>
            </div>
            <div className="summary-row" style={{ borderTop: '1px dashed var(--color-border)', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
              <span className="summary-row-label" style={{ fontWeight: 700, color: 'var(--color-text)' }}>{t.netProfitLabel}</span>
              <span className={`summary-row-value ${summary.netProfit >= 0 ? 'profit' : 'loss'}`} style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>
                {formatCurrency(summary.netProfit)}
              </span>
            </div>
            <div className="summary-row" style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
              <span className="summary-row-label">{t.stockLabel}</span>
              <span className="summary-row-value">{formatCurrency(summary.stockValue)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Batch Profit Chart */}
      <div className="section-header">
        <div className="section-title">{t.batchProfit}</div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-2xl)', padding: 'var(--space-lg) var(--space-sm)', minWidth: 0 }}>
        {chartData.length > 0 ? (
          <>
            <div style={{ width: '100%', height: 230, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} onClick={handleBarClick} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                        fill={entry.status === 'completed' ? '#22C55E' : '#5B1EE6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-xl)', marginTop: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#22C55E' }} />
                {t.completed}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#5B1EE6' }} />
                {t.stillSelling}
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
            📦 {t.noBatchesYet || 'No purchase batches recorded yet'}
          </div>
        )}
      </div>

      {/* Top Performing Clothes */}
      {topProducts.length > 0 && (
        <div style={{ marginBottom: 'var(--space-2xl)' }}>
          <div className="section-header">
            <div className="section-title">{t.topSelling || 'Top Selling Clothes'}</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
            {topProducts.slice(0, 5).map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-sm) 0',
                  borderBottom: idx < topProducts.slice(0, 5).length - 1 ? '1px solid var(--color-border-light)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 800, color: 'var(--color-primary)', width: 20 }}>
                    #{idx + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{item.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      {item.totalQty} {t.itemsSold || 'sold'}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--color-success-dark)', fontSize: 'var(--font-size-sm)' }}>
                  {formatCurrency(item.totalRevenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
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
