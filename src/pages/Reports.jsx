import { useState, useEffect, useMemo } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { formatCurrency } from '../utils/formatCurrency';
import { formatProductDisplayName } from '../utils/transliterate';
import { getBatchProfitData, getPeriodicSummary, getProductPerformance } from '../services/reportService';
import PageHeader from '../components/layout/PageHeader';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Cell, Tooltip, Legend
} from 'recharts';

/* ─── Palette ─────────────────────────────────────────── */
const C = {
  sales:    '#6C63FF',
  profit:   '#22C55E',
  expense:  '#F97316',
  batch:    '#5B1EE6',
  completed:'#22C55E',
  stock:    '#0EA5E9',
};

/* ─── Custom Tooltip ─────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      minWidth: 120,
    }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{p.name}:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
            ₹{Number(p.value || 0).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Stat Card ───────────────────────────────────────── */
function StatCard({ emoji, label, value, color, sub }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}18, ${color}06)`,
      border: `1.5px solid ${color}30`,
      borderRadius: 16,
      padding: '14px 16px',
      flex: '1 1 calc(50% - 8px)',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

/* ─── Insight Card ────────────────────────────────────── */
function InsightCard({ emoji, text, color }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '12px 14px',
      borderRadius: 12,
      background: `${color}12`,
      border: `1px solid ${color}25`,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{emoji}</span>
      <span style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5, fontWeight: 500 }}>{text}</span>
    </div>
  );
}

/* ─── Section Title ───────────────────────────────────── */
function SectionTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 'var(--font-size-md)', color: 'var(--color-text)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

/* ─── Chart Card wrapper ──────────────────────────────── */
function ChartCard({ children }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 18,
      padding: 'var(--space-lg) var(--space-sm)',
      border: '1px solid var(--color-border)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    }}>
      {children}
    </div>
  );
}

/* ─── Tips generator ──────────────────────────────────── */
function buildInsights(summary, topProducts, batchData, language = 'en') {
  if (!summary) return [];
  const { totalSales, totalProfit, totalExpenses, netProfit, salesCount } = summary;
  const tips = [];
  const pm = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0;
  const er = totalSales > 0 ? ((totalExpenses / totalSales) * 100).toFixed(1) : 0;
  const isTa = language === 'ta';
  const fmt = (n) => Number(n).toLocaleString('en-IN');

  if (netProfit > 0) {
    tips.push({
      emoji: '🎉',
      text: isTa ? `அற்புதம்! இந்த காலகட்டத்தில் நிகர லாபம் ₹${fmt(netProfit)}. தொடர்ந்து விற்பனை செய்யுங்கள்!` : `Great! Net profit is ₹${fmt(netProfit)} this period. Keep selling!`,
      color: '#22C55E'
    });
  } else if (netProfit < 0) {
    tips.push({
      emoji: '⚠️',
      text: isTa ? `செலவுகள் (₹${fmt(totalExpenses)}) லாபத்தை விட அதிகம். செலவுகளைக் குறைக்க முயற்சிக்கவும்.` : `Expenses (₹${fmt(totalExpenses)}) are more than profit. Try to reduce costs.`,
      color: '#F97316'
    });
  }

  if (Number(pm) > 20) {
    tips.push({
      emoji: '📈',
      text: isTa ? `சிறந்த ${pm}% லாப சதவீதம்! உங்கள் விலை நிர்ணயம் மிக நன்று.` : `Excellent ${pm}% profit margin! Your pricing is working well.`,
      color: '#22C55E'
    });
  } else if (Number(pm) > 0 && Number(pm) <= 10) {
    tips.push({
      emoji: '💡',
      text: isTa ? `லாப சதவீதம் ${pm}% மட்டுமே. விற்பனை விலையை சற்று உயர்த்த முயற்சிக்கலாம்.` : `Profit margin is only ${pm}%. Try increasing your selling price a little.`,
      color: '#6C63FF'
    });
  }

  if (Number(er) > 30) {
    tips.push({
      emoji: '✂️',
      text: isTa ? `செலவுகள் விற்பனையில் ${er}% உள்ளது. தேவையற்ற செலவுகளைக் குறைக்கவும்.` : `Expenses are ${er}% of sales. Look for ways to cut costs.`,
      color: '#F97316'
    });
  }

  if ((salesCount || 0) === 0) {
    tips.push({
      emoji: '🛒',
      text: isTa ? 'இந்த காலகட்டத்தில் விற்பனை இன்னும் தொடங்கவில்லை. விற்பனையைத் தொடங்குங்கள்!' : 'No sales yet for this period. Start selling to see your report!',
      color: '#9CA3AF'
    });
  } else if ((salesCount || 0) < 5) {
    tips.push({
      emoji: '📦',
      text: isTa ? `${salesCount} விற்பனைகள் மட்டுமே நடந்துள்ளன. வாடிக்கையாளர்களுக்கு விளம்பரப்படுத்துங்கள்!` : `Made ${salesCount} sale${salesCount > 1 ? 's' : ''} this period. Try promoting more!`,
      color: '#6C63FF'
    });
  } else {
    tips.push({
      emoji: '🔥',
      text: isTa ? `இந்த காலகட்டத்தில் ${salesCount} விற்பனைகள் — அருமையான சுறுசுறுப்பு!` : `${salesCount} sales this period — great activity!`,
      color: '#F97316'
    });
  }

  if (topProducts.length > 0) {
    const pName = formatProductDisplayName(topProducts[0].name, language);
    tips.push({
      emoji: '⭐',
      text: isTa ? `"${pName}" அதிகளவில் விற்கிறது (${topProducts[0].totalQty} விற்றுள்ளது). ஸ்டாக் குறையாமல் பார்த்துக் கொள்ளுங்கள்!` : `"${pName}" is your best seller (${topProducts[0].totalQty} sold). Keep it stocked!`,
      color: '#0EA5E9'
    });
  }

  const done = batchData.filter(b => b.status === 'completed');
  if (done.length > 0) {
    const avg = done.reduce((s, b) => s + b.realizedProfit, 0) / done.length;
    tips.push({
      emoji: '💰',
      text: isTa ? `விற்று முடிந்த தொகுதியின் சராசரி லாபம்: ₹${Math.round(avg).toLocaleString('en-IN')}.` : `Average profit per completed batch: ₹${Math.round(avg).toLocaleString('en-IN')}.`,
      color: '#5B1EE6'
    });
  }

  if (summary.stockValue > 0) {
    tips.push({
      emoji: '🏪',
      text: isTa ? `₹${fmt(summary.stockValue)} மதிப்புள்ள ஸ்டாக் விற்க தயாராக உள்ளது. விரைவாக விற்று முடிக்கவும்!` : `₹${fmt(summary.stockValue)} worth of stock ready to sell. Push it out!`,
      color: '#0EA5E9'
    });
  }

  return tips.slice(0, 4);
}

export default function Reports() {
  const { batches, sales, expenses, products, language, t } = useBusiness();
  const [timeframe, setTimeframe] = useState('month');
  const [batchData, setBatchData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [selectedBar, setSelectedBar] = useState(null);
  const [loading, setLoading] = useState(true);

  const tabs = useMemo(() => [
    { key: 'today', label: t.today || 'Today' },
    { key: 'week',  label: t.week || 'Week' },
    { key: 'month', label: t.month || 'Month' },
    { key: 'year',  label: t.yearly || 'Yearly' },
    { key: 'all',   label: t.allTime || 'All Time' },
  ], [t]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const [bd, ps, pp] = await Promise.all([
          getBatchProfitData(),
          getPeriodicSummary(timeframe),
          getProductPerformance(),
        ]);
        if (isMounted) { setBatchData(bd); setSummary(ps); setTopProducts(pp); }
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [batches, sales, expenses, products, timeframe]);

  /* Sales vs Profit grouped chart data */
  const salesProfitData = useMemo(() => {
    if (!sales || sales.length === 0) return [];
    const now = new Date();
    const cutoff = new Date(now);
    if (timeframe === 'today') { cutoff.setHours(0,0,0,0); }
    else if (timeframe === 'week') { cutoff.setDate(now.getDate() - 6); }
    else if (timeframe === 'month') { cutoff.setDate(1); cutoff.setHours(0,0,0,0); }
    else if (timeframe === 'year') { cutoff.setMonth(0,1); cutoff.setHours(0,0,0,0); }
    else { cutoff.setFullYear(2000); }

    const filtered = sales.filter(s => new Date(s.date) >= cutoff);
    const grouped = {};
    filtered.forEach(s => {
      const d = new Date(s.date);
      let key;
      if (timeframe === 'today') key = d.toLocaleTimeString('en-IN', { hour: '2-digit', hour12: true });
      else if (timeframe === 'week' || timeframe === 'month') key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      else key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (!grouped[key]) grouped[key] = { label: key, sales: 0, profit: 0 };
      grouped[key].sales += Number(s.totalAmount) || 0;
      grouped[key].profit += Number(s.totalProfit) || 0;
    });
    return Object.values(grouped).slice(-10);
  }, [sales, timeframe]);

  const insights = useMemo(() => buildInsights(summary, topProducts, batchData, language), [summary, topProducts, batchData, language]);

  const hasAnyData = batches.length > 0 || sales.length > 0 || expenses.length > 0;

  if (!loading && !hasAnyData) {
    return (
      <div className="page-content">
        <PageHeader title={t.reports} />
        <EmptyState emoji="📊" title={t.noDataYet} description={t.startReportsDesc} />
      </div>
    );
  }

  const fmtK = (v) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`;

  return (
    <div className="page-content">
      <PageHeader title={t.reports} />

      {/* ── Timeframe Tabs ── */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
        marginBottom: 'var(--space-xl)', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        {tabs.map(tab => (
          <button key={tab.key} type="button" onClick={() => setTimeframe(tab.key)} style={{
            padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s',
            background: timeframe === tab.key ? 'var(--color-primary)' : 'var(--color-surface-2)',
            color: timeframe === tab.key ? '#fff' : 'var(--color-text-secondary)',
            boxShadow: timeframe === tab.key ? '0 2px 8px rgba(108,99,255,0.35)' : 'none',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-4xl)', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          ⏳ {t.loadingReports || 'Loading your reports...'}
        </div>
      ) : (
        <>
          {/* ── Stat Cards ── */}
          {summary && (
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <SectionTitle title={`📋 ${t.overview || 'Overview'}`} subtitle={t.overviewSub || 'Your numbers for this period'} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <StatCard
                  emoji="🛍️"
                  label={t.totalSales || t.salesLabel}
                  value={formatCurrency(summary.totalSales)}
                  color={C.sales}
                  sub={(t.transactionsCount || '{n} transactions').replace('{n}', summary.salesCount || 0)}
                />
                <StatCard
                  emoji="💰"
                  label={t.profitEarned || t.profitLabel}
                  value={formatCurrency(summary.totalProfit)}
                  color={C.profit}
                />
                <StatCard
                  emoji="💸"
                  label={t.totalExpenses || t.expensesLabel}
                  value={formatCurrency(summary.totalExpenses)}
                  color={C.expense}
                />
                <StatCard
                  emoji={summary.netProfit >= 0 ? '🚀' : '📉'}
                  label={t.netProfit || t.netProfitLabel}
                  value={formatCurrency(summary.netProfit)}
                  color={summary.netProfit >= 0 ? C.profit : '#EF4444'}
                  sub={summary.netProfit >= 0 ? (t.afterExpenses || 'After expenses') : (t.highExpensesLoss || 'Loss — expenses high')}
                />
              </div>
            </div>
          )}

          {/* ── Sales vs Profit Chart ── */}
          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <SectionTitle
              title={`📈 ${t.salesAndProfitChart || 'Sales & Profit Chart'}`}
              subtitle={t.salesAndProfitChartSub || 'How much you collected vs earned'}
            />
            <ChartCard>
              {salesProfitData.length > 0 ? (
                <>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesProfitData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={3}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={42} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Bar dataKey="sales" name={t.salesLabel || 'Sales'} fill={C.sales} radius={[5,5,0,0]} maxBarSize={32} />
                        <Bar dataKey="profit" name={t.profitLabel || 'Profit'} fill={C.profit} radius={[5,5,0,0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 10, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    💡 {t.salesProfitLegendHint || 'Purple = total collected | Green = your actual profit'}
                  </div>
                </>
              ) : (
                <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                  🛒 {t.noSalesDataPeriod || 'No sales data for this period'}
                </div>
              )}
            </ChartCard>
          </div>

          {/* ── Batch Profit Chart ── */}
          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <SectionTitle
              title={`📦 ${t.batchProfitChart || 'Batch Profit Chart'}`}
              subtitle={t.batchProfitChartSub || 'Profit earned from each purchase batch (tap a bar for details)'}
            />
            <ChartCard>
              {batchData.length > 0 ? (
                <>
                  <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={batchData.slice(-8)}
                        onClick={(d) => d?.activePayload?.length && setSelectedBar(d.activePayload[0].payload)}
                        margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={42} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="realizedProfit" name={t.profitLabel || 'Profit'} radius={[6,6,0,0]} cursor="pointer" maxBarSize={36}>
                          {batchData.slice(-8).map((entry, index) => (
                            <Cell key={index} fill={entry.status === 'completed' ? C.completed : C.batch} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 10 }}>
                    {[
                      { color: C.completed, label: `✅ ${t.batchSoldOut || 'Batch Sold Out'}` },
                      { color: C.batch, label: `🔄 ${t.stillSellingBadge || 'Still Selling'}` }
                    ].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 10, fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                    👆 {t.tapBarForDetails || 'Tap any bar to see batch details'}
                  </div>
                </>
              ) : (
                <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                  📦 {t.noBatchesYet || 'No purchase batches recorded yet'}
                </div>
              )}
            </ChartCard>
          </div>

          {/* ── Top Selling Items ── */}
          {topProducts.length > 0 && (
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <SectionTitle
                title={`⭐ ${t.topSellingTitle || 'Top Selling Items'}`}
                subtitle={t.topSellingSubtitle || 'Items that sell the most'}
              />
              <div style={{ background: 'var(--color-surface)', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                {topProducts.slice(0, 5).map((item, idx) => {
                  const maxRev = topProducts[0].totalRevenue || 1;
                  const pct = Math.max(6, (item.totalRevenue / maxRev) * 100);
                  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
                  return (
                    <div key={item.id || idx} style={{ padding: '14px 16px', borderBottom: idx < Math.min(topProducts.length,5)-1 ? '1px solid var(--color-border-light)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>{medals[idx]}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>
                              {formatProductDisplayName(item.name, language)}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                              {(t.piecesSoldText || '{n} pieces sold').replace('{n}', item.totalQty)}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, color: C.profit, fontSize: 15 }}>{formatCurrency(item.totalRevenue)}</div>
                      </div>
                      <div style={{ height: 5, background: 'var(--color-border-light)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${C.sales}, ${C.profit})`, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Smart Insights ── */}
          {insights.length > 0 && (
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <SectionTitle
                title={`🧠 ${t.smartInsightsTitle || 'Smart Insights'}`}
                subtitle={t.smartInsightsSubtitle || 'Tips to grow your business'}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {insights.map((ins, i) => (
                  <InsightCard key={i} emoji={ins.emoji} text={ins.text} color={ins.color} />
                ))}
              </div>
            </div>
          )}

          {/* ── Stock Overview ── */}
          {summary && summary.stockValue > 0 && (
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <SectionTitle
                title={`🏪 ${t.stockOverviewTitle || 'Stock Overview'}`}
                subtitle={t.stockOverviewSubtitle || 'Remaining inventory value'}
              />
              <ChartCard>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid var(--color-border-light)', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.stockSellingValueTitle || 'Stock (at selling price)'}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{t.stockSellingValueDesc || 'Revenue if you sell all stock now'}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.stock }}>{formatCurrency(summary.stockValue)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.stockCostValueTitle || 'Stock (at purchase price)'}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{t.stockCostValueDesc || 'Amount invested in unsold items'}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.expense }}>{formatCurrency(summary.stockCost)}</div>
                </div>
              </ChartCard>
            </div>
          )}
        </>
      )}

      {/* ── Batch Detail Modal ── */}
      <Modal isOpen={!!selectedBar} onClose={() => setSelectedBar(null)} title={selectedBar ? `${t.batch || 'Batch'} #${selectedBar.batchNumber}` : ''}>
        {selectedBar && (
          <>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)', fontSize: 13 }}>
              📅 {selectedBar.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: `💵 ${t.purchaseCost || 'Purchase Cost'}`, value: formatCurrency(selectedBar.totalInvestment), color: C.expense },
                { label: `✅ ${t.realizedProfit || 'Realized Profit'}`, value: formatCurrency(selectedBar.realizedProfit), color: C.profit },
                ...(selectedBar.status !== 'completed' ? [{ label: `⏳ ${t.remainingProfit || 'Remaining Profit'}`, value: formatCurrency(selectedBar.expectedProfit), color: C.sales }] : []),
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
              <span style={{
                display: 'inline-block', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                background: selectedBar.status === 'completed' ? '#22C55E20' : '#5B1EE620',
                color: selectedBar.status === 'completed' ? '#16A34A' : '#5B1EE6',
                border: `1px solid ${selectedBar.status === 'completed' ? '#22C55E40' : '#5B1EE640'}`,
              }}>
                {selectedBar.status === 'completed' ? `✅ ${t.batchSoldOut || 'Batch Sold Out'}` : `🔄 ${t.stillSellingBadge || 'Still Selling'}`}
              </span>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
