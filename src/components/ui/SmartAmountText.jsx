import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { formatExactCurrency, formatCompactCurrency } from '../../utils/formatCurrency';

/**
 * SmartAmountText / ResponsiveCurrencyText
 *
 * A high-performance, responsive currency display component with:
 * - Smart compact formatting (K, L, Cr) to prevent text overflow on mobile
 * - Long-press interaction revealing the exact Indian currency value
 * - Seamless desktop hover/click tooltip
 * - Non-disruptive floating popover portal
 * - Full accessibility with screen-reader friendly exact values
 */
export default function SmartAmountText({
  value,
  amount,
  compact = true,
  showSign = false,
  prefix = '',
  suffix = '',
  isPrivate = false,
  className = '',
  style = {},
  as: Component = 'span',
  title,
}) {
  const rawValue = value !== undefined ? value : amount;
  const numValue = Number(rawValue) || 0;

  const [showPopover, setShowPopover] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, showBelow: false });
  const containerRef = useRef(null);
  const touchTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const autoHideTimerRef = useRef(null);

  const exactFormatted = formatExactCurrency(numValue);
  const compactFormatted = compact ? formatCompactCurrency(numValue) : exactFormatted;

  // Decide if positive sign should be shown
  const signPrefix = showSign && numValue > 0 ? '+' : '';

  // Masked value for privacy mode
  const displayContent = isPrivate
    ? '₹ ****'
    : `${prefix}${signPrefix}${compactFormatted}${suffix}`;

  const exactFullContent = isPrivate
    ? '₹ ****'
    : `${prefix}${signPrefix}${exactFormatted}${suffix}`;

  const isCompactDifferent = !isPrivate && compactFormatted !== exactFormatted;

  const calculatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    const popoverHeight = 54;
    const popoverWidth = 140;

    let top = rect.top + scrollY - popoverHeight - 8;
    let showBelow = false;

    // If too close to top of viewport, show below element
    if (rect.top < popoverHeight + 16) {
      top = rect.bottom + scrollY + 8;
      showBelow = true;
    }

    let left = rect.left + scrollX + rect.width / 2;
    // Keep within screen edges
    const minLeft = popoverWidth / 2 + 12;
    const maxLeft = window.innerWidth - popoverWidth / 2 - 12;
    left = Math.max(minLeft, Math.min(maxLeft, left));

    setPopoverPos({ top, left, showBelow });
  }, []);

  const triggerPopover = useCallback(() => {
    if (!isCompactDifferent) return;
    calculatePosition();
    setShowPopover(true);

    if (navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch {
        // Ignore vibration errors
      }
    }

    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    autoHideTimerRef.current = setTimeout(() => {
      setShowPopover(false);
    }, 2500);
  }, [isCompactDifferent, calculatePosition]);

  const hidePopover = useCallback(() => {
    setShowPopover(false);
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  }, []);

  // Global dismiss on tap / click outside
  useEffect(() => {
    if (!showPopover) return;

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        hidePopover();
      }
    };

    window.addEventListener('touchstart', handleOutsideClick, { passive: true });
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', calculatePosition, { passive: true });
    window.addEventListener('resize', calculatePosition);

    return () => {
      window.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', calculatePosition);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [showPopover, hidePopover, calculatePosition]);

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, []);

  // Touch handlers for long-press
  const handleTouchStart = (e) => {
    if (!isCompactDifferent) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      triggerPopover();
    }, 380);
  };

  const handleTouchMove = (e) => {
    if (!touchTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    // If finger moves more than 10px, cancel long-press (user is scrolling)
    if (dx > 10 || dy > 10) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleClick = (e) => {
    if (isCompactDifferent) {
      triggerPopover();
    }
  };

  return (
    <>
      <Component
        ref={containerRef}
        className={`smart-amount-text ${isCompactDifferent ? 'smart-amount-text--compact' : ''} ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          cursor: isCompactDifferent ? 'pointer' : 'inherit',
          ...style,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleClick}
        aria-label={title || `Exact value: ${exactFullContent}`}
        title={title || (isCompactDifferent ? `Exact: ${exactFullContent}` : undefined)}
      >
        {displayContent}
      </Component>

      {/* Floating Exact Value Popover Portal */}
      {showPopover &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="smart-amount-popover animate-pop"
            style={{
              position: 'absolute',
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              transform: 'translateX(-50%)',
              zIndex: 99999,
              background: 'var(--color-surface, #ffffff)',
              color: 'var(--color-text, #0f172a)',
              border: '1px solid var(--color-border, #e2e8f0)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08)',
              borderRadius: '12px',
              padding: '6px 12px',
              textAlign: 'center',
              pointerEvents: 'none',
              minWidth: '120px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--color-text-tertiary, #94a3b8)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '1px',
              }}
            >
              Exact value
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: numValue < 0 ? 'var(--color-danger, #ef4444)' : 'var(--color-text, #0f172a)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {exactFullContent}
            </div>
            {/* Popover Arrow */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: '8px',
                height: '8px',
                background: 'var(--color-surface, #ffffff)',
                borderRight: popoverPos.showBelow ? 'none' : '1px solid var(--color-border, #e2e8f0)',
                borderBottom: popoverPos.showBelow ? 'none' : '1px solid var(--color-border, #e2e8f0)',
                borderLeft: popoverPos.showBelow ? '1px solid var(--color-border, #e2e8f0)' : 'none',
                borderTop: popoverPos.showBelow ? '1px solid var(--color-border, #e2e8f0)' : 'none',
                bottom: popoverPos.showBelow ? 'auto' : '-5px',
                top: popoverPos.showBelow ? '-5px' : 'auto',
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}

export const ResponsiveCurrencyText = SmartAmountText;
