import db from '../db/database';

/**
 * Calculate realized profit from sale allocations, optionally for a specific batch.
 */
export async function calculateRealizedProfit(batchId) {
  const allocations = await db.saleAllocations.toArray();

  if (!batchId) {
    return allocations.reduce(
      (sum, a) => sum + a.quantity * (a.sellingPrice - a.purchasePrice),
      0
    );
  }

  // Filter allocations for lots belonging to this batch
  const batchLots = await db.inventoryLots.where('batchId').equals(batchId).toArray();
  const batchLotIds = new Set(batchLots.map((l) => l.id));

  return allocations
    .filter((a) => batchLotIds.has(a.lotId))
    .reduce((sum, a) => sum + a.quantity * (a.sellingPrice - a.purchasePrice), 0);
}

/**
 * Calculate expected profit from remaining stock, optionally for a specific batch.
 */
export async function calculateExpectedProfit(batchId) {
  let lots;
  if (batchId) {
    lots = await db.inventoryLots.where('batchId').equals(batchId).toArray();
  } else {
    lots = await db.inventoryLots.toArray();
  }

  return lots.reduce(
    (sum, l) => sum + l.remainingQty * (l.sellingPrice - l.purchasePrice),
    0
  );
}

/**
 * Get batch status: 'completed' if all lots have 0 remaining, otherwise 'selling'.
 */
export async function getBatchStatus(batchId) {
  const lots = await db.inventoryLots.where('batchId').equals(batchId).toArray();
  if (lots.length === 0) return 'completed';
  const allSold = lots.every((l) => l.remainingQty === 0);
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

  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Get net profit = realized profit - expenses
 */
export async function getNetProfit() {
  const realized = await calculateRealizedProfit();
  const expenses = await getTotalExpenses();
  return realized - expenses;
}
