import db from '../db/database';
import { calculateRealizedProfit, calculateExpectedProfit, getBatchStatus } from './profitService';
import { getShortDate } from '../utils/formatDate';

/**
 * Get batch profit data for the bar chart.
 * Returns an array of { batchId, batchNumber, date, label, realizedProfit, expectedProfit, status, totalInvestment }
 */
export async function getBatchProfitData() {
  const batches = await db.purchaseBatches.orderBy('date').toArray();

  const results = [];
  for (const batch of batches) {
    const realized = await calculateRealizedProfit(batch.id);
    const expected = await calculateExpectedProfit(batch.id);
    const status = await getBatchStatus(batch.id);

    results.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      date: batch.date,
      label: getShortDate(batch.date),
      realizedProfit: realized,
      expectedProfit: expected,
      totalProfit: realized + expected,
      status,
      totalInvestment: batch.totalInvestment,
    });
  }

  return results;
}

/**
 * Get monthly summary for a given month/year.
 */
export async function getMonthlySummary(month, year) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);

  // Sales
  const sales = await db.sales.toArray();
  const monthSales = sales.filter((s) => {
    const d = new Date(s.date);
    return d >= startDate && d <= endDate;
  });
  const totalSales = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalProfit = monthSales.reduce((sum, s) => sum + s.totalProfit, 0);

  // Expenses
  const expenses = await db.expenses.toArray();
  const monthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d >= startDate && d <= endDate;
  });
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Stock value (current, not time-scoped)
  const lots = await db.inventoryLots.toArray();
  const stockValue = lots.reduce(
    (sum, l) => sum + l.remainingQty * l.sellingPrice,
    0
  );

  return {
    totalSales,
    totalProfit,
    totalExpenses,
    netProfit: totalProfit - totalExpenses,
    stockValue,
  };
}
