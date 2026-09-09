import { useLocation, useNavigate } from 'react-router-dom';
import { useCalculator } from '../../context/CalculatorContext';
import { useBusiness } from '../../hooks/useBusiness';
import { Maximize2, X, RotateCcw } from 'lucide-react';

export default function FloatingCalculator() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useBusiness();
  const {
    display,
    expression,
    isMinimized,
    isFloatingOpen,
    toggleFloatingCalc,
    closeFloatingCalc,
    dismissFloatingBubble,
    handleNumber,
    handleDecimal,
    handleOperator,
    handleEquals,
    handleClear,
    handleBackspace,
  } = useCalculator();

  // Do not render floating bubble when already on the full calculator page
  if (!isMinimized || location.pathname === '/calculator') {
    return null;
  }

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
    <>
      {/* Floating Pill Dock */}
      <div
        className="floating-calc-pill animate-pop"
        style={{
          position: 'fixed',
          bottom: 'calc(var(--bottom-nav-height) + 16px + env(safe-area-inset-bottom, 0px))',
          right: '16px',
          zIndex: 140,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, #5B1EE6 0%, #410DB8 100%)',
          color: '#FFFFFF',
          padding: '8px 14px',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 8px 24px rgba(91, 30, 230, 0.45)',
          border: '1.5px solid rgba(255, 255, 255, 0.3)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div
          onClick={toggleFloatingCalc}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span style={{ fontSize: '16px' }}>🧮</span>
          <span style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {display !== '0' ? display : (t.calculator || 'Calc')}
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/calculator')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            color: '#FFFFFF',
            marginLeft: '2px',
          }}
          title={t.openCalculator || 'Full screen'}
        >
          <Maximize2 size={12} />
        </button>

        <button
          type="button"
          onClick={dismissFloatingBubble}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            color: '#FFFFFF',
          }}
          title={t.close || 'Close'}
        >
          <X size={13} />
        </button>
      </div>

      {/* Floating Mini Calculator Modal Sheet */}
      {isFloatingOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 180 }}
          onClick={closeFloatingCalc}
        >
          <div
            className="modal-content animate-slide-up"
            style={{
              padding: 'var(--space-lg)',
              maxWidth: '380px',
              borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: 'var(--font-size-base)' }}>
                <span>🧮</span>
                <span>{t.calculator}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    closeFloatingCalc();
                    navigate('/calculator');
                  }}
                  className="btn--secondary"
                  style={{
                    padding: '4px 10px',
                    minHeight: '32px',
                    fontSize: 'var(--font-size-xs)',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                  }}
                  title={t.openCalculator || 'Full screen'}
                >
                  <Maximize2 size={13} />
                  <span>{t.fullScreen || 'Full'}</span>
                </button>
                <button
                  type="button"
                  onClick={closeFloatingCalc}
                  style={{ color: 'var(--color-text-secondary)', padding: '4px' }}
                  title={t.close || 'Close'}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Display */}
            <div
              className="calc-display"
              style={{
                padding: 'var(--space-md)',
                minHeight: '70px',
                marginBottom: 'var(--space-md)',
              }}
            >
              <div className="calc-expression" style={{ minHeight: '16px', fontSize: 'var(--font-size-xs)' }}>
                {expression}
              </div>
              <div className="calc-result" style={{ fontSize: 'var(--font-size-xl)' }}>
                {Number(display).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Keypad */}
            <div className="calc-grid" style={{ gap: '6px' }}>
              {keys.map((key) => (
                <button
                  key={key.label}
                  className={`calc-key ${key.type ? `calc-key--${key.type}` : ''} ${key.span ? 'calc-key--span2' : ''}`}
                  style={{ height: '48px', fontSize: 'var(--font-size-base)' }}
                  onClick={key.action}
                >
                  {key.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
