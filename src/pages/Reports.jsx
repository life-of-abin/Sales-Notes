import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBusiness } from '../hooks/useBusiness';
import { formatCurrency, formatExactCurrency, formatCompactCurrency } from '../utils/formatCurrency';
import { formatProductDisplayName } from '../utils/transliterate';
import { getBatchProfitData, getPeriodicSummary, getProductPerformance } from '../services/reportService';
import { exportReportToExcel } from '../utils/exportExcel';
import SmartAmountText from '../components/ui/SmartAmountText';
import PageHeader from '../components/layout/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { FileSpreadsheet, Maximize2, Minimize2, X } from 'lucide-react';
import db from '../db/database';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  ReferenceLine
} from 'recharts';

/* ─── Palette ─────────────────────────────────────────── */
const C = {
  sales:    '#5B1EE6',
  profit:   '#10B981',
  loss:     '#EF4444',
  expense:  '#F97316',
  batch:    '#5B1EE6',
  completed:'#10B981',
  stock:    '#0EA5E9',
};

/* ─── Smart Rupee Chart Axis Formatter ─────────────────── */
function createChartAxisFormatter(maxVal = 0) {
  const absMax = Math.abs(Number(maxVal) || 0);

  if (absMax >= 1000000) {
    return (val) => {
      const num = Number(val) || 0;
      if (num === 0) return '₹0';
      const mVal = num / 1000000;
      const formatted = mVal % 1 === 0 ? mVal.toFixed(0) : mVal.toFixed(1).replace(/\.0$/, '');
      return `${num < 0 ? '-' : ''}₹${Math.abs(Number(formatted))}M`;
    };
  }

  if (absMax >= 1000) {
    return (val) => {
      const num = Number(val) || 0;
      if (num === 0) return '₹0';
      const kVal = num / 1000;
      const formatted = kVal % 1 === 0 ? kVal.toFixed(0) : kVal.toFixed(1).replace(/\.0$/, '');
      return `${num < 0 ? '-' : ''}₹${Math.abs(Number(formatted))}K`;
    };
  }

  return (val) => {
    const num = Number(val) || 0;
    return `${num < 0 ? '-' : ''}₹${Math.abs(num)}`;
  };
}

/* ─── Axis Config Generator ───────────────────────────── */
function calcYAxisConfig(data = [], keys = []) {
  let min = 0;
  let max = 0;
  data.forEach((item) => {
    keys.forEach((k) => {
      const val = Number(item[k] || 0);
      if (val > max) max = val;
      if (val < min) min = val;
    });
  });

  const absMax = Math.max(Math.abs(min), Math.abs(max));
  const effectiveMax = absMax <= 0 ? 100 : absMax;

  // Compute a clean step
  const roughStep = effectiveMax / 4;
  let step;
  if (roughStep <= 15) step = 15;
  else if (roughStep <= 25) step = 25;
  else if (roughStep <= 50) step = 50;
  else if (roughStep <= 100) step = 100;
  else if (roughStep <= 250) step = 250;
  else if (roughStep <= 500) step = 500;
  else if (roughStep <= 1000) step = 1000;
  else if (roughStep <= 2500) step = 2500;
  else if (roughStep <= 5000) step = 5000;
  else {
    const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
    step = Math.ceil(roughStep / power) * power;
  }

  let yMin = 0;
  let yMax = 0;
  const ticks = [];

  if (min < 0 && max > 0) {
    const posSteps = Math.max(1, Math.ceil(max / step));
    const negSteps = Math.max(1, Math.ceil(Math.abs(min) / step));
    yMax = posSteps * step;
    yMin = -(negSteps * step);
    for (let t = yMin; t <= yMax; t += step) {
      ticks.push(t);
    }
  } else if (min < 0 && max <= 0) {
    const negSteps = Math.max(1, Math.ceil(Math.abs(min) / step));
    yMin = -(negSteps * step);
    yMax = 0;
    for (let t = yMin; t <= 0; t += step) {
      ticks.push(t);
    }
  } else {
    // Only positive or zero
    const posSteps = Math.max(1, Math.ceil(effectiveMax / step));
    yMax = posSteps >= 4 ? posSteps * step : step * 4;
    yMin = 0;
    for (let t = 0; t <= yMax; t += step) {
      ticks.push(t);
    }
  }

  const axisLimit = Math.max(Math.abs(yMin), Math.abs(yMax));
  const tickFormatter = createChartAxisFormatter(axisLimit);

  return {
    yMin,
    yMax,
    ticks,
    tickFormatter,
    dummyData: [{ dummy: yMax }, { dummy: yMin }],
  };
}

/* ─── Custom Tooltip ─────────────────────────────────── */
function ChartTooltip({ active, payload, label, t }) {
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
      {payload.map((p, i) => {
        const val = Number(p.value || 0);
        const isLoss = (p.dataKey === 'profit' || p.dataKey === 'realizedProfit') && val < 0;
        let displayName = p.name;
        if (p.dataKey === 'profit' || p.dataKey === 'realizedProfit') {
          displayName = isLoss ? (t?.loss || 'Loss') : (t?.profitLabel || 'Profit');
        }
        const color = isLoss ? '#EF4444' : (p.color || p.fill);
        const formattedVal = `₹${Math.abs(val).toLocaleString('en-IN')}`;

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{displayName}:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: isLoss ? '#EF4444' : 'var(--color-text)' }}>
              {formattedVal}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Stat Card ───────────────────────────────────────── */
function StatCard({ emoji, label, value, rawValue, color, sub }) {
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
      <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1.1 }}>
        <SmartAmountText value={rawValue !== undefined ? rawValue : value} compact={true} />
      </div>
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
function buildInsights(summary, topProducts, batchData, language, t) {
  if (!summary) return [];
  const tips = [];
  const isTa = language === 'ta';
  const { netProfit, profitMargin, expenseRatio, totalExpenses, salesCount } = summary;
  const pm = ((profitMargin || 0) * 100).toFixed(0);
  const er = ((expenseRatio || 0) * 100).toFixed(0);
  const fmt = (n) => formatExactCurrency(n);

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
      color: '#5B1EE6'
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
      color: '#5B1EE6'
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
      text: isTa ? `விற்று முடிந்த தொகுதியின் சராசரி லாபம்: ${fmt(Math.round(avg))}.` : `Average profit per completed batch: ${fmt(Math.round(avg))}.`,
      color: '#5B1EE6'
    });
  }

  if (summary.stockValue > 0) {
    tips.push({
      emoji: '🏪',
      text: isTa ? `${fmt(summary.stockValue)} மதிப்புள்ள ஸ்டாக் விற்க தயாராக உள்ளது. விரைவாக விற்று முடிக்கவும்!` : `${fmt(summary.stockValue)} worth of stock ready to sell. Push it out!`,
      color: '#0EA5E9'
    });
  }

  return tips.slice(0, 4);
}

export default function Reports() {
  const { batches, sales, saleItems, expenses, products, customers, language, showToast, t } = useBusiness();
  const [timeframe, setTimeframe] = useState('today');
  const [batchData, setBatchData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [selectedSalesGroup, setSelectedSalesGroup] = useState(null);
  const [maximizedChart, setMaximizedChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const tabs = useMemo(() => [
    { key: 'today', label: t.today || 'Today' },
    { key: 'week',  label: t.week || 'Week' },
    { key: 'month', label: t.month || 'Month' },
    { key: 'year',  label: t.yearly || 'Yearly' },
    { key: 'all',   label: t.allTime || 'All Time' },
  ], [t]);

  useEffect(() => {
    setSelectedSalesGroup(null);
    setSelectedBatchId(null);
  }, [timeframe]);

  // Click anywhere outside the bars to normalize back to normal (remove black border and hide tooltip)
  useEffect(() => {
    if (selectedSalesGroup === null && selectedBatchId === null) return;
    const handleOutsideClick = () => {
      setSelectedSalesGroup(null);
      setSelectedBatchId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [selectedSalesGroup, selectedBatchId]);

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

  /* Sales vs Profit grouped chart data (Most recent days / hours first) */
  const salesProfitData = useMemo(() => {
    if (!sales || sales.length === 0) return [];
    const now = new Date();
    const cutoff = new Date(now);
    if (timeframe === 'today') { cutoff.setHours(0,0,0,0); }
    else if (timeframe === 'week') { cutoff.setDate(now.getDate() - 6); cutoff.setHours(0,0,0,0); }
    else if (timeframe === 'month') { cutoff.setDate(1); cutoff.setHours(0,0,0,0); }
    else if (timeframe === 'year') { cutoff.setMonth(0,1); cutoff.setHours(0,0,0,0); }
    else { cutoff.setFullYear(2000); }

    const filtered = sales.filter(s => new Date(s.date) >= cutoff);
    // Sort descending: recent sales first, followed by previous/older sales
    const sortedSales = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    const grouped = {};
    sortedSales.forEach(s => {
      const d = new Date(s.date);
      let key;
      if (timeframe === 'today') key = d.toLocaleTimeString('en-IN', { hour: '2-digit', hour12: true });
      else if (timeframe === 'week' || timeframe === 'month') key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      else key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (!grouped[key]) grouped[key] = { label: key, sales: 0, profit: 0 };
      grouped[key].sales += Number(s.totalAmount) || 0;
      const p = s.realizedProfit !== undefined ? Number(s.realizedProfit) : (Number(s.totalProfit) || 0);
      grouped[key].profit += p;
    });
    return Object.values(grouped);
  }, [sales, timeframe]);

  const salesAxisConfig = useMemo(
    () => calcYAxisConfig(salesProfitData, ['sales', 'profit']),
    [salesProfitData]
  );

  const batchAxisConfig = useMemo(
    () => calcYAxisConfig(batchData, ['realizedProfit']),
    [batchData]
  );

  const insights = useMemo(() => buildInsights(summary, topProducts, batchData, language), [summary, topProducts, batchData, language]);

  // Chart scroll refs: start at left (0) to view recent items immediately
  const salesScrollRef = useRef(null);
  const batchScrollRef = useRef(null);

  useEffect(() => {
    if (salesScrollRef.current) {
      salesScrollRef.current.scrollLeft = 0;
    }
  }, [salesProfitData]);

  useEffect(() => {
    if (batchScrollRef.current) {
      batchScrollRef.current.scrollLeft = 0;
    }
  }, [batchData]);

  const handleExport = async () => {
    if (exporting) return;

    // Check if data is present for the selected timeframe
    const now = new Date();
    const cutoff = new Date(now);
    if (timeframe === 'today') {
      cutoff.setHours(0, 0, 0, 0);
    } else if (timeframe === 'week') {
      cutoff.setDate(now.getDate() - 6);
      cutoff.setHours(0, 0, 0, 0);
    } else if (timeframe === 'month') {
      cutoff.setDate(1);
      cutoff.setHours(0, 0, 0, 0);
    } else if (timeframe === 'year') {
      cutoff.setMonth(0, 1);
      cutoff.setHours(0, 0, 0, 0);
    } else {
      cutoff.setFullYear(2000);
    }

    const hasPeriodSales = sales && sales.some((s) => new Date(s.date) >= cutoff);
    const hasPeriodExpenses = expenses && expenses.some((e) => new Date(e.date) >= cutoff);
    const hasProducts = products && products.length > 0;

    const hasData = hasPeriodSales || hasPeriodExpenses || (timeframe === 'all' && hasProducts);

    if (!hasData) {
      showToast(
        language === 'ta'
          ? 'இந்த காலகட்டத்தில் அறிக்கை தரவுகள் எதுவும் இல்லை (No report data)'
          : 'No report data is available for this period!',
        'warning'
      );
      return;
    }

    setExporting(true);
    try {
      const allLots = await db.inventoryLots.toArray();
      const currentTab = tabs.find((tb) => tb.key === timeframe);
      const res = await exportReportToExcel({
        timeframe,
        timeframeLabel: currentTab ? currentTab.label : timeframe,
        summary: summary || {},
        sales,
        saleItems: saleItems || [],
        products,
        customers: customers || [],
        expenses,
        inventoryLots: allLots,
        language,
        t,
      });

      if (res && res.noData) {
        showToast(
          language === 'ta'
            ? 'அறிக்கை தரவுகள் எதுவும் இல்லை (No report data available)'
            : 'No report data is available to download!',
          'warning'
        );
      } else {
        showToast(
          t.exportSuccess ||
            (language === 'ta'
              ? 'எக்செல் அறிக்கை வெற்றிகரமாக பதிவிறக்கம் செய்யப்பட்டது!'
              : 'Excel report downloaded successfully!')
        );
      }
    } catch (err) {
      console.error('Export error:', err);
      showToast(
        language === 'ta'
          ? 'பதிவிறக்கம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.'
          : 'Export failed. Please try again.',
        'error'
      );
    } finally {
      setExporting(false);
    }
  };

  const exportButton = (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting}
      className="privacy-btn"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 700,
        background: 'rgba(34, 197, 94, 0.12)',
        color: '#16A34A',
        border: '1.5px solid rgba(34, 197, 94, 0.35)',
        cursor: exporting ? 'not-allowed' : 'pointer',
      }}
      title={t.exportExcel || 'Export to Excel'}
    >
      <FileSpreadsheet size={15} />
      <span>{exporting ? (t.exporting || 'Exporting...') : (t.exportExcel || 'Excel')}</span>
    </button>
  );

  const hasAnyData = batches.length > 0 || sales.length > 0 || expenses.length > 0;

  if (!loading && !hasAnyData) {
    return (
      <div className="page-content">
        <PageHeader title={t.reports} rightAction={exportButton} />
        <EmptyState emoji="📊" title={t.noDataYet} description={t.startReportsDesc} />
      </div>
    );
  }

  const fmtK = (v) => {
    if (v === 0) return '₹0';
    const isNeg = v < 0;
    const abs = Math.abs(v);
    let str = `₹${abs}`;
    if (abs >= 100000) str = `₹${(abs / 100000).toFixed(1)}L`;
    else if (abs >= 1000) str = `₹${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}k`;
    return isNeg ? `-${str}` : str;
  };

  return (
    <div className="page-content">
      <PageHeader title={t.reports} rightAction={exportButton} />

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
            boxShadow: timeframe === tab.key ? '0 2px 8px rgba(91, 30, 230, 0.35)' : 'none',
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
                  value={summary.totalSales}
                  rawValue={summary.totalSales}
                  color={C.sales}
                  sub={(t.transactionsCount || '{n} transactions').replace('{n}', summary.salesCount || 0)}
                />
                <StatCard
                  emoji="💰"
                  label={t.profitEarned || t.profitLabel}
                  value={summary.totalProfit}
                  rawValue={summary.totalProfit}
                  color={C.profit}
                />
                <StatCard
                  emoji="💸"
                  label={t.totalExpenses || t.expensesLabel}
                  value={summary.totalExpenses}
                  rawValue={summary.totalExpenses}
                  color={C.expense}
                />
                <StatCard
                  emoji={summary.netProfit >= 0 ? '🚀' : '📉'}
                  label={t.netProfit || t.netProfitLabel}
                  value={summary.netProfit}
                  rawValue={summary.netProfit}
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
                  <div style={{ display: 'flex', width: '100%', height: 235, position: 'relative' }}>
                    {/* Fixed Left Y-Axis: Stays pinned and never moves on scroll, no borders */}
                    <div className="chart-y-axis-fixed" style={{ width: 48, height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={salesAxisConfig.dummyData}
                          margin={{ top: 8, right: 0, left: -6, bottom: 24 }}
                        >
                          <YAxis
                            domain={[salesAxisConfig.yMin, salesAxisConfig.yMax]}
                            ticks={salesAxisConfig.ticks}
                            tick={{
                              fontSize: 12,
                              fontWeight: 700,
                              fill: 'var(--color-text-secondary, #475569)',
                            }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={salesAxisConfig.tickFormatter}
                            width={48}
                          />
                          <Bar dataKey="dummy" fill="transparent" isAnimationActive={false} stroke="none" strokeWidth={0} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Scrollable Right Bar Chart Area */}
                    <div
                      ref={salesScrollRef}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        scrollbarWidth: 'thin',
                        WebkitOverflowScrolling: 'touch',
                        paddingBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width:
                            salesProfitData.length > 5
                              ? `${Math.max(280, salesProfitData.length * 58)}px`
                              : '100%',
                          minWidth: '100%',
                          height: 235,
                        }}
                      >
                        {/* Persistent Synchronized Tooltip for Sales & Profit */}
                        {(() => {
                          if (!selectedSalesGroup) return null;
                          const activeItem = salesProfitData.find((d) => d.label === selectedSalesGroup);
                          if (!activeItem) return null;
                          const idx = salesProfitData.findIndex((d) => d.label === selectedSalesGroup);
                          const total = salesProfitData.length;
                          const pct = total > 0 ? ((idx + 0.5) / total) * 100 : 50;
                          const posStyle =
                            pct < 20
                              ? { left: `${Math.max(4, pct)}%`, transform: 'translateX(0)' }
                              : pct > 80
                              ? { left: `${Math.min(96, pct)}%`, transform: 'translateX(-100%)' }
                              : { left: `${pct}%`, transform: 'translateX(-50%)' };

                          const isLoss = Number(activeItem.profit || 0) < 0;

                          return (
                            <div
                              style={{
                                position: 'absolute',
                                ...posStyle,
                                top: 6,
                                background: 'var(--color-surface, #ffffff)',
                                border: '1px solid var(--color-border, #e2e8f0)',
                                borderRadius: 10,
                                padding: '8px 12px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                                minWidth: 125,
                                zIndex: 20,
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, fontWeight: 700 }}>
                                {activeItem.label}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.sales }} />
                                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{t.salesLabel || 'Sales'}:</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
                                  ₹{Number(activeItem.sales || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isLoss ? C.loss : C.profit }} />
                                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                                  {isLoss ? (t.lossLabel || t.loss || 'Loss') : (t.profitLabel || 'Profit')}:
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: isLoss ? C.loss : 'var(--color-text)' }}>
                                  ₹{Math.abs(Number(activeItem.profit || 0)).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={salesProfitData}
                            margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
                            barGap={4}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="var(--color-border)"
                              vertical={false}
                            />
                            <ReferenceLine y={0} stroke="var(--color-border-dark, #94A3B8)" strokeWidth={1.5} />
                            <XAxis
                              dataKey="label"
                              tick={{
                                fontSize: 11,
                                fontWeight: 600,
                                fill: 'var(--color-text-tertiary)',
                              }}
                              axisLine={false}
                              tickLine={false}
                              interval={0}
                              height={24}
                            />
                            <YAxis
                              domain={[salesAxisConfig.yMin, salesAxisConfig.yMax]}
                              ticks={salesAxisConfig.ticks}
                              hide={true}
                            />
                            <Bar
                              dataKey="sales"
                              name={t.salesLabel || 'Sales'}
                              fill={C.sales}
                              maxBarSize={26}
                              isAnimationActive={false}
                              shape={(props) => {
                                const { x, y, width, height, payload } = props;
                                if (!width || width <= 0) return null;
                                const barHeight = Math.abs(height || 0);
                                if (barHeight <= 0) return null;
                                const isSelected = selectedSalesGroup === payload?.label;
                                const r = Math.min(5, Math.max(0, width / 2), barHeight);
                                const d = `M ${x},${y + barHeight} L ${x},${y + r} Q ${x},${y} ${x + r},${y} L ${x + width - r},${y} Q ${x + width},${y} ${x + width},${y + r} L ${x + width},${y + barHeight} Z`;
                                return (
                                  <path
                                    d={d}
                                    fill={C.sales}
                                    stroke={isSelected ? '#000000' : 'none'}
                                    strokeWidth={isSelected ? 2 : 0}
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                      if (e && e.stopPropagation) e.stopPropagation();
                                      if (payload?.label) {
                                        setSelectedSalesGroup((prev) => (prev === payload.label ? null : payload.label));
                                        setSelectedBatchId(null);
                                      }
                                    }}
                                  />
                                );
                              }}
                            />
                            <Bar
                              dataKey="profit"
                              name={t.profitLabel || 'Profit'}
                              fill={C.profit}
                              maxBarSize={26}
                              isAnimationActive={false}
                              shape={(props) => {
                                const { x, y, width, height, payload } = props;
                                if (!width || width <= 0) return null;
                                const barHeight = Math.abs(height || 0);
                                if (barHeight <= 0) return null;
                                const isSelected = selectedSalesGroup === payload?.label;
                                const isNegative = Number(payload?.profit || 0) < 0;
                                const fill = isNegative ? C.loss : C.profit;
                                const r = Math.min(5, Math.max(0, width / 2), barHeight);

                                let d;
                                if (isNegative) {
                                  // Bar extends downwards from y (zero line) to y + barHeight with rounded bottom corners
                                  d = `M ${x},${y} L ${x + width},${y} L ${x + width},${y + barHeight - r} Q ${x + width},${y + barHeight} ${x + width - r},${y + barHeight} L ${x + r},${y + barHeight} Q ${x},${y + barHeight} ${x},${y + barHeight - r} Z`;
                                } else {
                                  // Bar extends upwards from zero line (y + barHeight) to y with rounded top corners
                                  d = `M ${x},${y + barHeight} L ${x},${y + r} Q ${x},${y} ${x + r},${y} L ${x + width - r},${y} Q ${x + width},${y} ${x + width},${y + r} L ${x + width},${y + barHeight} Z`;
                                }

                                return (
                                  <path
                                    d={d}
                                    fill={fill}
                                    stroke={isSelected ? '#000000' : 'none'}
                                    strokeWidth={isSelected ? 2 : 0}
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                      if (e && e.stopPropagation) e.stopPropagation();
                                      if (payload?.label) {
                                        setSelectedSalesGroup((prev) => (prev === payload.label ? null : payload.label));
                                        setSelectedBatchId(null);
                                      }
                                    }}
                                  />
                                );
                              }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {salesProfitData.length > 5 && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'right', marginTop: 4, paddingRight: 4 }}>
                      👉 {language === 'ta' ? 'அனைத்து விவரங்களையும் பார்க்க நகர்த்தவும்' : 'Scroll horizontally to view all'}
                    </div>
                  )}
                  {/* Compact circular dot legend outside/below chart with Maximize Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.profit }} />
                        <span>{t.profitLabel || 'Profit'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.sales }} />
                        <span>{t.salesLabel || 'Sales'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.loss }} />
                        <span>{t.lossLabel || t.loss || 'Loss'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setMaximizedChart('salesProfit')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '6px 12px',
                        background: 'var(--color-primary-bg, #F2ECFE)',
                        border: '1px solid var(--color-primary-light, #7E47FA)',
                        borderRadius: 'var(--radius-md, 12px)',
                        color: 'var(--color-primary, #5B1EE6)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        marginLeft: 'auto',
                      }}
                      title={language === 'ta' ? 'பெரிதாக்கு (முழுத்திரை)' : 'Maximize View'}
                      id="btn-maximize-sales-chart"
                    >
                      <Maximize2 size={14} />
                      <span>{language === 'ta' ? 'பெரிதாக்கு' : 'Maximize'}</span>
                    </button>
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
              subtitle={t.batchProfitChartSub || 'Profit earned from each purchase batch'}
            />
            <ChartCard>
              {batchData.length > 0 ? (
                <>
                  <div style={{ display: 'flex', width: '100%', height: 260, position: 'relative' }}>
                    {/* Fixed Left Y-Axis: Stays pinned and never moves on scroll, no borders */}
                    <div className="chart-y-axis-fixed" style={{ width: 48, height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={batchAxisConfig.dummyData}
                          margin={{ top: 8, right: 0, left: -6, bottom: 65 }}
                        >
                          <YAxis
                            domain={[batchAxisConfig.yMin, batchAxisConfig.yMax]}
                            ticks={batchAxisConfig.ticks}
                            tick={{
                              fontSize: 12,
                              fontWeight: 700,
                              fill: 'var(--color-text-secondary, #475569)',
                            }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={batchAxisConfig.tickFormatter}
                            width={48}
                          />
                          <Bar dataKey="dummy" fill="transparent" isAnimationActive={false} stroke="none" strokeWidth={0} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Scrollable Right Bar Chart Area */}
                    <div
                      ref={batchScrollRef}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        scrollbarWidth: 'thin',
                        WebkitOverflowScrolling: 'touch',
                        paddingBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width:
                            batchData.length > 4
                              ? `${Math.max(280, batchData.length * 64)}px`
                              : '100%',
                          minWidth: '100%',
                          height: 260,
                        }}
                      >
                        {/* Persistent Synchronized Tooltip for Batch Profit */}
                        {(() => {
                          if (selectedBatchId === null || selectedBatchId === undefined) return null;
                          const activeBatch = batchData.find((b) => (b.id ?? b.batchId) === selectedBatchId);
                          if (!activeBatch) return null;
                          const idx = batchData.findIndex((b) => (b.id ?? b.batchId) === selectedBatchId);
                          const total = batchData.length;
                          const pct = total > 0 ? ((idx + 0.5) / total) * 100 : 50;
                          const posStyle =
                            pct < 20
                              ? { left: `${Math.max(4, pct)}%`, transform: 'translateX(0)' }
                              : pct > 80
                              ? { left: `${Math.min(96, pct)}%`, transform: 'translateX(-100%)' }
                              : { left: `${pct}%`, transform: 'translateX(-50%)' };

                          const netVal = Number(activeBatch.realizedProfit || 0);
                          const isNegative = netVal < 0;
                          const dotColor = isNegative ? C.loss : (activeBatch.status === 'completed' ? C.completed : C.batch);

                          return (
                            <div
                              style={{
                                position: 'absolute',
                                ...posStyle,
                                top: 6,
                                background: 'var(--color-surface, #ffffff)',
                                border: '1px solid var(--color-border, #e2e8f0)',
                                borderRadius: 10,
                                padding: '8px 12px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                                minWidth: 120,
                                zIndex: 20,
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, fontWeight: 700 }}>
                                {activeBatch.label}
                              </div>
                              {activeBatch.isAllStockDeleted ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>
                                    🗑️ {language === 'ta' ? 'சரக்கு நீக்கப்பட்டது' : 'Stock Deleted'}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
                                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                                      {isNegative ? (t.lossLabel || t.loss || 'Loss') : (t.profitLabel || 'Profit')}:
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: isNegative ? C.loss : 'var(--color-text)' }}>
                                      {isNegative ? '-' : ''}₹{Math.abs(netVal).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  {activeBatch.hasDeletedStock && (
                                    <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 600, marginTop: 2 }}>
                                      🗑️ {language === 'ta' ? 'நீக்கப்பட்ட சரக்கு உள்ளது' : 'Has Deleted Stock'}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })()}

                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={batchData}
                            margin={{ top: 8, right: 16, left: 0, bottom: 65 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="var(--color-border)"
                              vertical={false}
                            />
                            <ReferenceLine y={0} stroke="var(--color-border-dark, #94A3B8)" strokeWidth={1.5} />
                            <XAxis
                              dataKey="label"
                              tick={(props) => {
                                const { x, y, payload } = props;
                                return (
                                  <g transform={`translate(${x},${y + 4})`}>
                                    <text
                                      x={0}
                                      y={0}
                                      dy={4}
                                      textAnchor="end"
                                      fill="var(--color-text-secondary, #64748B)"
                                      fontSize={10.5}
                                      fontWeight={700}
                                      transform="rotate(-90)"
                                    >
                                      {payload?.value || ''}
                                    </text>
                                  </g>
                                );
                              }}
                              axisLine={false}
                              tickLine={false}
                              interval={0}
                              height={65}
                            />
                            <YAxis
                              domain={[batchAxisConfig.yMin, batchAxisConfig.yMax]}
                              ticks={batchAxisConfig.ticks}
                              hide={true}
                            />
                            {/* Batch Profit / Loss Bar */}
                            <Bar
                              dataKey="realizedProfit"
                              name={t.profitLabel || 'Profit'}
                              maxBarSize={32}
                              isAnimationActive={false}
                              shape={(props) => {
                                const { x, y, width, height, payload } = props;
                                if (!width || width <= 0) return null;
                                const itemKey = payload?.id ?? payload?.batchId;
                                const isSelected = selectedBatchId !== null && selectedBatchId !== undefined && selectedBatchId === itemKey;

                                if (payload?.isAllStockDeleted) {
                                  const pillW = Math.min(width, 26);
                                  const pillH = 14;
                                  const pillX = x + (width - pillW) / 2;
                                  const pillY = y - pillH / 2;
                                  return (
                                    <g
                                      style={{ cursor: 'pointer' }}
                                      onClick={(e) => {
                                        if (e && e.stopPropagation) e.stopPropagation();
                                        if (itemKey !== undefined && itemKey !== null) {
                                          setSelectedBatchId((prev) => (prev === itemKey ? null : itemKey));
                                          setSelectedSalesGroup(null);
                                        }
                                      }}
                                    >
                                      <rect
                                        x={pillX}
                                        y={pillY}
                                        width={pillW}
                                        height={pillH}
                                        rx={4}
                                        fill="#FEE2E2"
                                        stroke={isSelected ? '#000000' : '#EF4444'}
                                        strokeWidth={isSelected ? 1.5 : 1}
                                      />
                                      <text
                                        x={pillX + pillW / 2}
                                        y={pillY + 10}
                                        textAnchor="middle"
                                        fontSize={8.5}
                                        fontWeight={800}
                                        fill="#DC2626"
                                      >
                                        DEL
                                      </text>
                                    </g>
                                  );
                                }

                                const barHeight = Math.abs(height || 0);
                                if (barHeight <= 0) return null;
                                const isNegative = Number(payload?.realizedProfit || 0) < 0;
                                const fill = isNegative ? C.loss : (payload?.status === 'completed' ? C.completed : C.batch);
                                const r = Math.min(6, Math.max(0, width / 2), barHeight);

                                let d;
                                if (isNegative) {
                                  // Bar extends downwards from baseline 0 (props.y) to (props.y + barHeight)
                                  d = `M ${x},${y} L ${x + width},${y} L ${x + width},${y + barHeight - r} Q ${x + width},${y + barHeight} ${x + width - r},${y + barHeight} L ${x + r},${y + barHeight} Q ${x},${y + barHeight} ${x},${y + barHeight - r} Z`;
                                } else {
                                  // Bar extends upwards from baseline 0 (props.y + barHeight) to (props.y)
                                  d = `M ${x},${y + barHeight} L ${x},${y + r} Q ${x},${y} ${x + r},${y} L ${x + width - r},${y} Q ${x + width},${y} ${x + width},${y + r} L ${x + width},${y + barHeight} Z`;
                                }

                                return (
                                  <path
                                    d={d}
                                    fill={fill}
                                    stroke={isSelected ? '#000000' : 'none'}
                                    strokeWidth={isSelected ? 2 : 0}
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                      if (e && e.stopPropagation) e.stopPropagation();
                                      if (itemKey !== undefined && itemKey !== null) {
                                        setSelectedBatchId((prev) => (prev === itemKey ? null : itemKey));
                                        setSelectedSalesGroup(null);
                                      }
                                    }}
                                  />
                                );
                              }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {batchData.length > 4 && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'right', marginTop: 4, paddingRight: 4 }}>
                      👉 {language === 'ta' ? 'அனைத்து தொகுதிகளையும் பார்க்க நகர்த்தவும்' : 'Scroll horizontally to view all'}
                    </div>
                  )}
                  {/* Left-aligned one-by-one legend with Maximize Button */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, paddingLeft: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: C.completed }} />
                        <span>{t.completedProfitLegend || 'Completed Batch with Profit'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: C.batch }} />
                        <span>{t.stillSellingBadge || 'Still Selling'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: C.loss }} />
                        <span>{t.completedLossLegend || 'Completed Batch with Loss'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setMaximizedChart('batchProfit')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '6px 12px',
                        background: 'var(--color-primary-bg, #F2ECFE)',
                        border: '1px solid var(--color-primary-light, #7E47FA)',
                        borderRadius: 'var(--radius-md, 12px)',
                        color: 'var(--color-primary, #5B1EE6)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        marginLeft: 'auto',
                      }}
                      title={language === 'ta' ? 'பெரிதாக்கு (முழுத்திரை)' : 'Maximize View'}
                      id="btn-maximize-batch-chart"
                    >
                      <Maximize2 size={14} />
                      <span>{language === 'ta' ? 'பெரிதாக்கு' : 'Maximize'}</span>
                    </button>
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
                        <div style={{ fontWeight: 800, color: C.profit, fontSize: 15 }}>
                          <SmartAmountText value={item.totalRevenue} compact={true} />
                        </div>
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
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.stock }}>
                    <SmartAmountText value={summary.stockValue} compact={true} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.stockCostValueTitle || 'Stock (at purchase price)'}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{t.stockCostValueDesc || 'Amount invested in unsold items'}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.expense }}>
                    <SmartAmountText value={summary.stockCost} compact={true} />
                  </div>
                </div>
              </ChartCard>
            </div>
          )}
        </>
      )}

      {/* ── Maximized Chart Fullscreen Modal with Blurred Backdrop ── */}
      {maximizedChart && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
          onClick={() => setMaximizedChart(null)}
          id="modal-maximized-chart-backdrop"
        >
          <div
            style={{
              background: 'var(--color-surface, #ffffff)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-2xl, 24px)',
              width: '100%',
              maxWidth: 760,
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
              padding: '20px',
              boxSizing: 'border-box',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
            id="modal-maximized-chart-content"
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-text)' }}>
                  {maximizedChart === 'salesProfit'
                    ? `📊 ${t.salesProfitTrend || 'Sales & Profit'}`
                    : `📦 ${t.batchProfitChart || 'Batch Profit Analytics'}`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {maximizedChart === 'salesProfit'
                    ? (t.salesProfitSub || 'Tap any bar to inspect sales & profit/loss details')
                    : (t.batchProfitChartSub || 'Profit earned from each purchase batch')}
                </div>
              </div>
              <button
                onClick={() => setMaximizedChart(null)}
                style={{
                  background: 'var(--color-bg, #f1f5f9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  transition: 'all 0.2s',
                }}
                aria-label="Close"
                id="btn-close-maximized-chart"
              >
                <X size={20} />
              </button>
            </div>

            {/* Maximized Sales & Profit Chart */}
            {maximizedChart === 'salesProfit' && (
              <div>
                <div style={{ display: 'flex', width: '100%', height: 320, position: 'relative' }}>
                  {/* Fixed Left Y-Axis */}
                  <div className="chart-y-axis-fixed" style={{ width: 52, height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={salesAxisConfig.dummyData}
                        margin={{ top: 8, right: 0, left: -6, bottom: 24 }}
                      >
                        <YAxis
                          domain={[salesAxisConfig.yMin, salesAxisConfig.yMax]}
                          ticks={salesAxisConfig.ticks}
                          tick={{
                            fontSize: 12,
                            fontWeight: 700,
                            fill: 'var(--color-text-secondary, #475569)',
                          }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={salesAxisConfig.tickFormatter}
                          width={52}
                        />
                        <Bar dataKey="dummy" fill="transparent" isAnimationActive={false} stroke="none" strokeWidth={0} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Scrollable Right Bar Chart Area */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      scrollbarWidth: 'thin',
                      WebkitOverflowScrolling: 'touch',
                      paddingBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width:
                          salesProfitData.length > 5
                            ? `${Math.max(340, salesProfitData.length * 68)}px`
                            : '100%',
                        minWidth: '100%',
                        height: 320,
                      }}
                    >
                      {/* Tooltip */}
                      {(() => {
                        if (!selectedSalesGroup) return null;
                        const activeItem = salesProfitData.find((d) => d.label === selectedSalesGroup);
                        if (!activeItem) return null;
                        const idx = salesProfitData.findIndex((d) => d.label === selectedSalesGroup);
                        const total = salesProfitData.length;
                        const pct = total > 0 ? ((idx + 0.5) / total) * 100 : 50;
                        const posStyle =
                          pct < 20
                            ? { left: `${Math.max(4, pct)}%`, transform: 'translateX(0)' }
                            : pct > 80
                            ? { left: `${Math.min(96, pct)}%`, transform: 'translateX(-100%)' }
                            : { left: `${pct}%`, transform: 'translateX(-50%)' };

                        const isLoss = Number(activeItem.profit || 0) < 0;

                        return (
                          <div
                            style={{
                              position: 'absolute',
                              ...posStyle,
                              top: 6,
                              background: 'var(--color-surface, #ffffff)',
                              border: '1px solid var(--color-border, #e2e8f0)',
                              borderRadius: 10,
                              padding: '8px 12px',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                              minWidth: 125,
                              zIndex: 20,
                              pointerEvents: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, fontWeight: 700 }}>
                              {activeItem.label}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.sales }} />
                              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{t.salesLabel || 'Sales'}:</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
                                ₹{Number(activeItem.sales || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isLoss ? C.loss : C.profit }} />
                              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                                {isLoss ? (t.lossLabel || t.loss || 'Loss') : (t.profitLabel || 'Profit')}:
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: isLoss ? C.loss : 'var(--color-text)' }}>
                                ₹{Math.abs(Number(activeItem.profit || 0)).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={salesProfitData}
                          margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
                          barGap={6}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--color-border)"
                            vertical={false}
                          />
                          <ReferenceLine y={0} stroke="var(--color-border-dark, #94A3B8)" strokeWidth={1.5} />
                          <XAxis
                            dataKey="label"
                            tick={{
                              fontSize: 12,
                              fontWeight: 600,
                              fill: 'var(--color-text-tertiary)',
                            }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            height={24}
                          />
                          <YAxis
                            domain={[salesAxisConfig.yMin, salesAxisConfig.yMax]}
                            ticks={salesAxisConfig.ticks}
                            hide={true}
                          />
                          <Bar
                            dataKey="sales"
                            name={t.salesLabel || 'Sales'}
                            fill={C.sales}
                            maxBarSize={32}
                            isAnimationActive={false}
                            shape={(props) => {
                              const { x, y, width, height, payload } = props;
                              if (!width || width <= 0) return null;
                              const barHeight = Math.abs(height || 0);
                              if (barHeight <= 0) return null;
                              const isSelected = selectedSalesGroup === payload?.label;
                              const r = Math.min(6, Math.max(0, width / 2), barHeight);
                              const d = `M ${x},${y + barHeight} L ${x},${y + r} Q ${x},${y} ${x + r},${y} L ${x + width - r},${y} Q ${x + width},${y} ${x + width},${y + r} L ${x + width},${y + barHeight} Z`;
                              return (
                                <path
                                  d={d}
                                  fill={C.sales}
                                  stroke={isSelected ? '#000000' : 'none'}
                                  strokeWidth={isSelected ? 2 : 0}
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                  style={{ cursor: 'pointer' }}
                                  onClick={(e) => {
                                    if (e && e.stopPropagation) e.stopPropagation();
                                    if (payload?.label) {
                                      setSelectedSalesGroup((prev) => (prev === payload.label ? null : payload.label));
                                    }
                                  }}
                                />
                              );
                            }}
                          />
                          <Bar
                            dataKey="profit"
                            name={t.profitLabel || 'Profit'}
                            fill={C.profit}
                            maxBarSize={32}
                            isAnimationActive={false}
                            shape={(props) => {
                              const { x, y, width, height, payload } = props;
                              if (!width || width <= 0) return null;
                              const barHeight = Math.abs(height || 0);
                              if (barHeight <= 0) return null;
                              const isSelected = selectedSalesGroup === payload?.label;
                              const isNegative = Number(payload?.profit || 0) < 0;
                              const fill = isNegative ? C.loss : C.profit;
                              const r = Math.min(6, Math.max(0, width / 2), barHeight);

                              let d;
                              if (isNegative) {
                                d = `M ${x},${y} L ${x + width},${y} L ${x + width},${y + barHeight - r} Q ${x + width},${y + barHeight} ${x + width - r},${y + barHeight} L ${x + r},${y + barHeight} Q ${x},${y + barHeight} ${x},${y + barHeight - r} Z`;
                              } else {
                                d = `M ${x},${y + barHeight} L ${x},${y + r} Q ${x},${y} ${x + r},${y} L ${x + width - r},${y} Q ${x + width},${y} ${x + width},${y + r} L ${x + width},${y + barHeight} Z`;
                              }

                              return (
                                <path
                                  d={d}
                                  fill={fill}
                                  stroke={isSelected ? '#000000' : 'none'}
                                  strokeWidth={isSelected ? 2 : 0}
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                  style={{ cursor: 'pointer' }}
                                  onClick={(e) => {
                                    if (e && e.stopPropagation) e.stopPropagation();
                                    if (payload?.label) {
                                      setSelectedSalesGroup((prev) => (prev === payload.label ? null : payload.label));
                                    }
                                  }}
                                />
                              );
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.profit }} />
                    <span>{t.profitLabel || 'Profit'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.sales }} />
                    <span>{t.salesLabel || 'Sales'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.loss }} />
                    <span>{t.lossLabel || t.loss || 'Loss'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Maximized Batch Profit Chart */}
            {maximizedChart === 'batchProfit' && (
              <div>
                <div style={{ display: 'flex', width: '100%', height: 340, position: 'relative' }}>
                  {/* Fixed Left Y-Axis */}
                  <div className="chart-y-axis-fixed" style={{ width: 52, height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={batchAxisConfig.dummyData}
                        margin={{ top: 8, right: 0, left: -6, bottom: 70 }}
                      >
                        <YAxis
                          domain={[batchAxisConfig.yMin, batchAxisConfig.yMax]}
                          ticks={batchAxisConfig.ticks}
                          tick={{
                            fontSize: 12,
                            fontWeight: 700,
                            fill: 'var(--color-text-secondary, #475569)',
                          }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={batchAxisConfig.tickFormatter}
                          width={52}
                        />
                        <Bar dataKey="dummy" fill="transparent" isAnimationActive={false} stroke="none" strokeWidth={0} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Scrollable Right Bar Chart Area */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      scrollbarWidth: 'thin',
                      WebkitOverflowScrolling: 'touch',
                      paddingBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width:
                          batchData.length > 4
                            ? `${Math.max(340, batchData.length * 72)}px`
                            : '100%',
                        minWidth: '100%',
                        height: 340,
                      }}
                    >
                      {/* Tooltip */}
                      {(() => {
                        if (selectedBatchId === null || selectedBatchId === undefined) return null;
                        const activeBatch = batchData.find((b) => (b.id ?? b.batchId) === selectedBatchId);
                        if (!activeBatch) return null;
                        const idx = batchData.findIndex((b) => (b.id ?? b.batchId) === selectedBatchId);
                        const total = batchData.length;
                        const pct = total > 0 ? ((idx + 0.5) / total) * 100 : 50;
                        const posStyle =
                          pct < 20
                            ? { left: `${Math.max(4, pct)}%`, transform: 'translateX(0)' }
                            : pct > 80
                            ? { left: `${Math.min(96, pct)}%`, transform: 'translateX(-100%)' }
                            : { left: `${pct}%`, transform: 'translateX(-50%)' };

                        const netVal = Number(activeBatch.realizedProfit || 0);
                        const isNegative = netVal < 0;
                        const dotColor = isNegative ? C.loss : (activeBatch.status === 'completed' ? C.completed : C.batch);

                        return (
                          <div
                            style={{
                              position: 'absolute',
                              ...posStyle,
                              top: 6,
                              background: 'var(--color-surface, #ffffff)',
                              border: '1px solid var(--color-border, #e2e8f0)',
                              borderRadius: 10,
                              padding: '8px 12px',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                              minWidth: 120,
                              zIndex: 20,
                              pointerEvents: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, fontWeight: 700 }}>
                              {activeBatch.label}
                            </div>
                            {activeBatch.isAllStockDeleted ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>
                                  🗑️ {language === 'ta' ? 'சரக்கு நீக்கப்பட்டது' : 'Stock Deleted'}
                                </span>
                              </div>
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
                                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                                    {isNegative ? (t.lossLabel || t.loss || 'Loss') : (t.profitLabel || 'Profit')}:
                                  </span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: isNegative ? C.loss : 'var(--color-text)' }}>
                                    {isNegative ? '-' : ''}₹{Math.abs(netVal).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                {activeBatch.hasDeletedStock && (
                                  <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 600, marginTop: 2 }}>
                                    🗑️ {language === 'ta' ? 'நீக்கப்பட்ட சரக்கு உள்ளது' : 'Has Deleted Stock'}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}

                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={batchData}
                          margin={{ top: 8, right: 16, left: 0, bottom: 70 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--color-border)"
                            vertical={false}
                          />
                          <ReferenceLine y={0} stroke="var(--color-border-dark, #94A3B8)" strokeWidth={1.5} />
                          <XAxis
                            dataKey="label"
                            tick={(props) => {
                              const { x, y, payload } = props;
                              return (
                                <g transform={`translate(${x},${y + 4})`}>
                                  <text
                                    x={0}
                                    y={0}
                                    dy={4}
                                    textAnchor="end"
                                    fill="var(--color-text-secondary, #64748B)"
                                    fontSize={11}
                                    fontWeight={700}
                                    transform="rotate(-90)"
                                  >
                                    {payload?.value || ''}
                                  </text>
                                </g>
                              );
                            }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            height={70}
                          />
                          <YAxis
                            domain={[batchAxisConfig.yMin, batchAxisConfig.yMax]}
                            ticks={batchAxisConfig.ticks}
                            hide={true}
                          />
                          <Bar
                            dataKey="realizedProfit"
                            name={t.profitLabel || 'Profit'}
                            maxBarSize={36}
                            isAnimationActive={false}
                            shape={(props) => {
                              const { x, y, width, height, payload } = props;
                              if (!width || width <= 0) return null;
                              const itemKey = payload?.id ?? payload?.batchId;
                              const isSelected = selectedBatchId !== null && selectedBatchId !== undefined && selectedBatchId === itemKey;

                              if (payload?.isAllStockDeleted) {
                                const pillW = Math.min(width, 30);
                                const pillH = 16;
                                const pillX = x + (width - pillW) / 2;
                                const pillY = y - pillH / 2;
                                return (
                                  <g
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                      if (e && e.stopPropagation) e.stopPropagation();
                                      if (itemKey !== undefined && itemKey !== null) {
                                        setSelectedBatchId((prev) => (prev === itemKey ? null : itemKey));
                                      }
                                    }}
                                  >
                                    <rect
                                      x={pillX}
                                      y={pillY}
                                      width={pillW}
                                      height={pillH}
                                      rx={4}
                                      fill="#FEE2E2"
                                      stroke={isSelected ? '#000000' : '#EF4444'}
                                      strokeWidth={isSelected ? 1.5 : 1}
                                    />
                                    <text
                                      x={pillX + pillW / 2}
                                      y={pillY + 11}
                                      textAnchor="middle"
                                      fontSize={9}
                                      fontWeight={800}
                                      fill="#DC2626"
                                    >
                                      DEL
                                    </text>
                                  </g>
                                );
                              }

                              const barHeight = Math.abs(height || 0);
                              if (barHeight <= 0) return null;
                              const isNegative = Number(payload?.realizedProfit || 0) < 0;
                              const fill = isNegative ? C.loss : (payload?.status === 'completed' ? C.completed : C.batch);
                              const r = Math.min(6, Math.max(0, width / 2), barHeight);

                              let d;
                              if (isNegative) {
                                d = `M ${x},${y} L ${x + width},${y} L ${x + width},${y + barHeight - r} Q ${x + width},${y + barHeight} ${x + width - r},${y + barHeight} L ${x + r},${y + barHeight} Q ${x},${y + barHeight} ${x},${y + barHeight - r} Z`;
                              } else {
                                d = `M ${x},${y + barHeight} L ${x},${y + r} Q ${x},${y} ${x + r},${y} L ${x + width - r},${y} Q ${x + width},${y} ${x + width},${y + r} L ${x + width},${y + barHeight} Z`;
                              }

                              return (
                                <path
                                  d={d}
                                  fill={fill}
                                  stroke={isSelected ? '#000000' : 'none'}
                                  strokeWidth={isSelected ? 2 : 0}
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                  style={{ cursor: 'pointer' }}
                                  onClick={(e) => {
                                    if (e && e.stopPropagation) e.stopPropagation();
                                    if (itemKey !== undefined && itemKey !== null) {
                                      setSelectedBatchId((prev) => (prev === itemKey ? null : itemKey));
                                    }
                                  }}
                                />
                              );
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Left-aligned one-by-one legend */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginTop: 16, paddingLeft: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: C.completed }} />
                    <span>{t.completedProfitLegend || 'Completed Batch with Profit'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: C.batch }} />
                    <span>{t.stillSellingBadge || 'Still Selling'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: C.loss }} />
                    <span>{t.completedLossLegend || 'Completed Batch with Loss'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
