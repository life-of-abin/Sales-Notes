export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const num = Number(amount);
  const formatted = Math.abs(num).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
  return num < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

export function parseCurrency(str) {
  if (!str) return 0;
  return Number(String(str).replace(/[₹,\s]/g, '')) || 0;
}
