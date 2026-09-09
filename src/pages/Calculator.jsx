import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { useCalculator } from '../context/CalculatorContext';
import { formatCurrency } from '../utils/formatCurrency';
import PageHeader from '../components/layout/PageHeader';
import CurrencyInput from '../components/ui/CurrencyInput';
import { Minimize2, History, Trash2, X } from 'lucide-react';

export default function Calculator() {
  const navigate = useNavigate();
  const { t } = useBusiness();
  const [showHistory, setShowHistory] = useState(false);

  const {
    mode,
    setMode,
    display,
    expression,
    buyPrice,
    setBuyPrice,
    sellPrice,
    setSellPrice,
    qty,
    setQty,
    history,
    clearHistory,
    restoreHistoryItem,
    minimizeCalculator,
    handleNumber,
    handleDecimal,
    handleOperator,
    handleEquals,
    handleClear,
    handleBackspace,
  } = useCalculator();

  const handleMinimize = () => {
    minimizeCalculator();
    navigate(-1);
  };

  // Business calculations
  const bPrice = Number(buyPrice) || 0;
  const sPrice = Number(sellPrice) || 0;
  const quantity = Number(qty) || 1;
  const profit = sPrice - bPrice;
  const profitPercent = bPrice > 0 ? ((profit / bPrice) * 100).toFixed(1) : '0';
  const totalBuy = bPrice * quantity;
  const totalSell = sPrice * quantity;
  const totalProfit = profit * quantity;

  const keys = [
    { label: 'C', action: handleClear, type: 'danger' },
    { label: '⌫', action: handleBackspace, type: 'op' },
    { label: '%', action: () => handleOperator('%'), type: 'op' },
    { label: '÷', action: () => handleOperator('÷'), type: 'op' },
    { label: '7', action: () => handleNumber('7') },
    { label: '8', action: () => handleNumber('8') },
    { label: '9', action: () => handleNumber('9') },
    { label: '×', action: () => handleOperator('×'), type: 'op' },
    { label: '4', action: () => handleNumber('4') },
    { label: '5', action: () => handleNumber('5') },
    { label: '6', action: () => handleNumber('6') },
    { label: '−', action: () => handleOperator('−'), type: 'op' },
    { label: '1', action: () => handleNumber('1') },
    { label: '2', action: () => handleNumber('2') },
    { label: '3', action: () => handleNumber('3') },
    { label: '+', action: () => handleOperator('+'), type: 'op' },
    { label: '0', action: () => handleNumber('0'), span: true },
    { label: '.', action: handleDecimal },
    { label: '=', action: handleEquals, type: 'action' },
  ];

  const headerRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {mode === 'standard' && (
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className={`privacy-btn ${showHistory ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            fontSize: 'var(--font-size-xs)',
          }}
          title={t.history || 'History'}
        >
          <History size={14} />
          <span>{history?.length || 0}</span>
        </button>
      )}
      <button
        type="button"
        onClick={handleMinimize}
        className="privacy-btn active"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          fontSize: 'var(--font-size-xs)',
        }}
        title={t.minimize || 'Minimize'}
      >
        <Minimize2 size={14} />
        <span>{t.minimize || 'Minimize'}</span>
      </button>
    </div>
  );

  return (
    <div className="page-content">
      <PageHeader title={t.calculator} showBack rightAction={headerRight} />

      {/* Mode Switcher */}
      <div className="tab-switcher" style={{ marginBottom: 'var(--space-lg)' }}>
        <button
          className={`tab-switcher-btn ${mode === 'standard' ? 'active' : ''}`}
          onClick={() => setMode('standard')}
          id="tab-standard"
        >
          {t.standardCalc}
        </button>
        <button
          className={`tab-switcher-btn ${mode === 'business' ? 'active' : ''}`}
          onClick={() => setMode('business')}
          id="tab-business"
        >
          {t.businessCalc}
        </button>
      </div>

      {mode === 'standard' ? (
        <>
          {/* History Drawer / Panel */}
          {showHistory && (
            <div
              className="card animate-pop"
              style={{
                marginBottom: 'var(--space-md)',
                padding: 'var(--space-md)',
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1.5px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                <span style={{ fontWeight: 800, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  {t.history || 'Calculation History'}
                </span>
                {history?.length > 0 && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--color-danger)',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 700,
                    }}
                  >
                    <Trash2 size={12} />
                    <span>{t.clearHistory || 'Clear'}</span>
                  </button>
                )}
              </div>

              {history?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        restoreHistoryItem(item);
                        setShowHistory(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: 'var(--color-bg)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {item.expression} =
                      </span>
                      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-primary)' }}>
                        {Number(item.result).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                  {t.noHistoryYet || 'No calculations yet'}
                </div>
              )}
            </div>
          )}

          {/* Display */}
          <div className="calc-display">
            <div className="calc-expression">{expression}</div>
            <div className="calc-result">
              {Number(display).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Keypad */}
          <div className="calc-grid">
            {keys.map((key) => (
              <button
                key={key.label}
                className={`calc-key ${key.type ? `calc-key--${key.type}` : ''} ${key.span ? 'calc-key--span2' : ''}`}
                onClick={key.action}
                id={`calc-key-${key.label}`}
              >
                {key.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Business Calculator */}
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <CurrencyInput
              label={t.buyPricePerPiece}
              value={buyPrice}
              onChange={setBuyPrice}
              id="biz-buy-price"
            />
            <CurrencyInput
              label={t.sellPricePerPiece}
              value={sellPrice}
              onChange={setSellPrice}
              id="biz-sell-price"
            />
            <div className="form-group">
              <label className="form-label">{t.quantity}</label>
              <input
                type="text"
                inputMode="numeric"
                className="form-input"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))}
                id="biz-qty"
              />
            </div>
          </div>

          {/* Results */}
          {bPrice > 0 && sPrice > 0 && (
            <div className="card animate-pop">
              <div className="summary-row">
                <span className="summary-row-label">{t.profitPerPiece}</span>
                <span className={`summary-row-value ${profit >= 0 ? 'profit' : 'loss'}`}>
                  {formatCurrency(profit)}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-row-label">{t.profitPercent}</span>
                <span className={`summary-row-value ${profit >= 0 ? 'profit' : 'loss'}`}>
                  {profitPercent}%
                </span>
              </div>
              {quantity > 1 && (
                <>
                  <div className="divider" />
                  <div className="summary-row">
                    <span className="summary-row-label">{t.totalBuyCalc} ({quantity} {t.pieces})</span>
                    <span className="summary-row-value">{formatCurrency(totalBuy)}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-row-label">{t.totalSellCalc} ({quantity} {t.pieces})</span>
                    <span className="summary-row-value">{formatCurrency(totalSell)}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-row-label">{t.expectedProfit || t.profit}</span>
                    <span className={`summary-row-value ${totalProfit >= 0 ? 'profit' : 'loss'}`}>
                      {formatCurrency(totalProfit)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
