import { useState } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { formatCurrency } from '../utils/formatCurrency';
import PageHeader from '../components/layout/PageHeader';
import CurrencyInput from '../components/ui/CurrencyInput';

export default function Calculator() {
  const { t } = useBusiness();
  const [mode, setMode] = useState('standard'); // standard | business
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [lastOp, setLastOp] = useState(null);
  const [prevValue, setPrevValue] = useState(null);
  const [newNumber, setNewNumber] = useState(true);

  // Business mode
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [qty, setQty] = useState('1');

  // Standard calculator
  const handleNumber = (num) => {
    if (newNumber) {
      setDisplay(String(num));
      setNewNumber(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const handleDecimal = () => {
    if (newNumber) {
      setDisplay('0.');
      setNewNumber(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperator = (op) => {
    const current = parseFloat(display);
    if (prevValue !== null && !newNumber) {
      const result = calculate(prevValue, current, lastOp);
      setDisplay(String(result));
      setPrevValue(result);
      setExpression(`${result} ${op}`);
    } else {
      setPrevValue(current);
      setExpression(`${current} ${op}`);
    }
    setLastOp(op);
    setNewNumber(true);
  };

  const calculate = (a, b, op) => {
    switch (op) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      case '%': return a * (b / 100);
      default: return b;
    }
  };

  const handleEquals = () => {
    if (prevValue === null || lastOp === null) return;
    const current = parseFloat(display);
    const result = calculate(prevValue, current, lastOp);
    setExpression(`${prevValue} ${lastOp} ${current} =`);
    setDisplay(String(Math.round(result * 100) / 100));
    setPrevValue(null);
    setLastOp(null);
    setNewNumber(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    setPrevValue(null);
    setLastOp(null);
    setNewNumber(true);
  };

  const handleBackspace = () => {
    if (display.length <= 1 || newNumber) {
      setDisplay('0');
      setNewNumber(true);
    } else {
      setDisplay(display.slice(0, -1));
    }
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

  return (
    <div className="page-content">
      <PageHeader title={t.calculator} showBack />

      {/* Mode Switcher */}
      <div className="tab-switcher">
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
