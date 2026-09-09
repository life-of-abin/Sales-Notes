import db from '../db/database';
import { calculateBatchMetrics, calculateProductMetrics, roundCurrency } from './calculationService';

/**
 * Calculate realized profit from sale allocations and lots, optionally for a specific batch.
 */
export async function calculateRealizedProfit(batchId) {
  const [allocations, saleItems, lots] = await Promise.all([
    db.saleAllocations.toArray(),
    db.saleItems.toArray(),
    batchId ? db.inventoryLots.where('batchId').equals(batchId).toArray() : db.inventoryLots.toArray(),
  ]);

  if (batchId) {
    const metrics = calculateBatchMetrics(lots, allocations, saleItems);
    return metrics.realizedProfit;
  }

  const metrics = calculateBatchMetrics(lots, allocations, saleItems);
  return metrics.realizedProfit;
}

/**
 * Calculate expected return (future potential sales revenue) from remaining stock.
 * Formula: remainingQty * sellingPrice
 */
export async function calculateExpectedReturn(batchId) {
  let lots;
  if (batchId) {
    lots = await db.inventoryLots.where('batchId').equals(batchId).toArray();
  } else {
    lots = await db.inventoryLots.toArray();
  }

  return roundCurrency(
    lots.reduce((sum, l) => {
      const rQty = Number(l.remainingQty) || 0;
      const sPrice = Number(l.sellingPrice) || 0;
      return sum + (rQty > 0 ? rQty * sPrice : 0);
    }, 0)
  );
}

/**
 * Backward compatibility alias for expected profit
 */
export async function calculateExpectedProfit(batchId) {
  let lots;
  if (batchId) {
    lots = await db.inventoryLots.where('batchId').equals(batchId).toArray();
  } else {
    lots = await db.inventoryLots.toArray();
  }

  return roundCurrency(
    lots.reduce((sum, l) => {
      const rQty = Number(l.remainingQty) || 0;
      const sPrice = Number(l.sellingPrice) || 0;
      const bPrice = Number(l.purchasePrice) || 0;
      return sum + (rQty > 0 ? rQty * (sPrice - bPrice) : 0);
    }, 0)
  );
}

/**
 * Get batch status: 'completed' if all lots have 0 remaining, otherwise 'selling'.
 */
export async function getBatchStatus(batchId) {
  const lots = await db.inventoryLots.where('batchId').equals(batchId).toArray();
  if (lots.length === 0) return 'completed';
  const allSold = lots.every((l) => Number(l.remainingQty) === 0);
  return allSold ? 'completed' : 'selling';
}

/**
 * Get total expenses, optionally within a date range.
 */
export async function getTotalExpenses(startDate, endDate) {
  let expenses = await db.expenses.toArray();

  if (startDate) {
    expenses = expenses.filter((e) => new Date(e.date) >= new Date(startDate));
  }
  if (endDate) {
    expenses = expenses.filter((e) => new Date(e.date) <= new Date(endDate));
  }

  return roundCurrency(expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));
}

/**
 * Get net profit = realized profit - expenses
 */
export async function getNetProfit() {
  const realized = await calculateRealizedProfit();
  const expenses = await getTotalExpenses();
  return roundCurrency(realized - expenses);
}
