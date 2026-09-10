/**
 * Centralized Smart Currency & Rupee Formatting System
 * Provides exact Indian currency formatting, compact notation (K, L, Cr),
 * and helpers for the global SmartAmountText system.
 */

/**
 * Formats a number into exact Indian currency representation with commas.
 * E.g. 21511800 -> "₹2,15,11,800", -730 -> "-₹730", 0 -> "₹0"
 * @param {number|string} amount
 * @returns {string}
 */
export function formatExactCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '₹0';
  const num = Number(amount);
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
  return isNeg ? `-₹${formatted}` : `₹${formatted}`;
}

/**
 * Formats a number into compact Indian notation (K, L, Cr) for clean mobile display.
 * Rules:
 * - < 1,000: ₹500, ₹850
 * - 1,000 - 99,999: ₹1K, ₹2.5K, ₹15.67K, ₹50K, ₹99K
 * - 1,00,000 - 99,99,999: ₹1L, ₹1.2L, ₹5.5L, ₹12.5L, ₹99L
 * - 1,00,00,000+: ₹1Cr, ₹2.15Cr, ₹10Cr, ₹100Cr
 * - Negatives: -₹730, -₹3.49K, -₹1.2L, -₹2.15Cr
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCompactCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '₹0';
  const num = Number(amount);
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const sign = isNeg ? '-' : '';

  if (abs === 0) return '₹0';

  // Crore: 1,00,00,000+
  if (abs >= 10000000) {
    const cr = abs / 10000000;
    const formatted = parseFloat(cr.toFixed(cr >= 100 ? 0 : 2));
    return `${sign}₹${formatted}Cr`;
  }

  // Lakh: 1,00,00,000 > abs >= 1,00,000
  if (abs >= 100000) {
    const l = abs / 100000;
    const formatted = parseFloat(l.toFixed(l >= 100 ? 0 : 2));
    return `${sign}₹${formatted}L`;
  }

  // Thousand: 1,00,00,000 > abs >= 1,00,000
  if (abs >= 1000) {
    const k = abs / 1000;
    const formatted = parseFloat(k.toFixed(k >= 100 ? 0 : 2));
    return `${sign}₹${formatted}K`;
  }

  // Under 1,000
  const formatted = abs % 1 === 0 ? abs.toString() : parseFloat(abs.toFixed(2)).toString();
  return `${sign}₹${formatted}`;
}

/**
 * Unified currency formatter with optional compact mode.
 * Defaults to exact format when options.compact is false/omitted.
 * @param {number|string} amount
 * @param {{ compact?: boolean }} [options]
 * @returns {string}
 */
export function formatCurrency(amount, options = {}) {
  if (options && options.compact) {
    return formatCompactCurrency(amount);
  }
  return formatExactCurrency(amount);
}

/**
 * Parses user input back into raw numerical value.
 * @param {string|number} str
 * @returns {number}
 */
export function parseCurrency(str) {
  if (!str) return 0;
  return Number(String(str).replace(/[₹,\s]/g, '')) || 0;
}
