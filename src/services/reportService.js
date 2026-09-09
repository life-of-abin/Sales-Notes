import db from '../db/database';
import { calculateRealizedProfit, calculateExpectedProfit, getBatchStatus } from './profitService';
import { getShortDate } from '../utils/formatDate';

/**
 * Get batch profit data for the bar chart.
 * Returns an array of { batchId, batchNumber, date, label, realizedProfit, expectedProfit, status, totalInvestment }
 */
export async function getBatchProfitData() {
  try {
    const batches = await db.purchaseBatches.orderBy('date').toArray();

    const results = [];
    for (const batch of batches) {
      const realized = await calculateRealizedProfit(batch.id);
      const expected = await calculateExpectedProfit(batch.id);
      const status = await getBatchStatus(batch.id);

      results.push({
        id: batch.id,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        date: batch.date,
        label: `#${batch.batchNumber} (${getShortDate(batch.date)})`,
        realizedProfit: Number(realized) || 0,
        expectedProfit: Number(expected) || 0,
        totalProfit: (Number(realized) || 0) + (Number(expected) || 0),
        status,
        totalInvestment: Number(batch.totalInvestment) || 0,
      });
    }

    return results;
  } catch (err) {
    console.error('Error in getBatchProfitData:', err);
    return [];
  }
}

/**
 * Get summary by flexible timeframe: 'today' | 'week' | 'month' | 'all'
 */
export async function getPeriodicSummary(timeframe = 'month', targetDate = new Date()) {
  try {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    
    let startDate, endDate;
    
    if (timeframe === 'today') {
      startDate = new Date(year, month, targetDate.getDate(), 0, 0, 0, 0);
      endDate = new Date(year, month, targetDate.getDate(), 23, 59, 59, 999);
    } else if (timeframe === 'week') {
      const day = targetDate.getDay();
      const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(year, month, diff, 0, 0, 0, 0);
      endDate = new Date(year, month, diff + 6, 23, 59, 59, 999);
    } else if (timeframe === 'month') {
      startDate = new Date(year, month, 1, 0, 0, 0, 0);
      endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } else if (timeframe === 'year') {
      startDate = new Date(year, 0, 1, 0, 0, 0, 0);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    } else {
      // all time
      startDate = new Date(0);
      endDate = new Date(8640000000000000);
    }

    // Sales
    const sales = await db.sales.toArray();
    const filteredSales = sales.filter((s) => {
      const d = new Date(s.date);
      return d >= startDate && d <= endDate;
    });
    const totalSales = filteredSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalProfit = filteredSales.reduce((sum, s) => sum + (Number(s.totalProfit) || 0), 0);
    const salesCount = filteredSales.length;

    // Expenses
    const expenses = await db.expenses.toArray();
    const filteredExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= startDate && d <= endDate;
    });
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Current Stock Value
    const lots = await db.inventoryLots.toArray();
    const stockValue = lots.reduce(
      (sum, l) => sum + ((Number(l.remainingQty) || 0) * (Number(l.sellingPrice) || 0)),
      0
    );
    const stockCost = lots.reduce(
      (sum, l) => sum + ((Number(l.remainingQty) || 0) * (Number(l.purchasePrice) || 0)),
      0
    );

    return {
      totalSales,
      totalProfit,
      totalExpenses,
      netProfit: totalProfit - totalExpenses,
      salesCount,
      stockValue,
      stockCost,
      timeframe,
      startDate,
      endDate,
    };
  } catch (err) {
    console.error('Error in getPeriodicSummary:', err);
    return {
      totalSales: 0,
      totalProfit: 0,
      totalExpenses: 0,
      netProfit: 0,
      salesCount: 0,
      stockValue: 0,
      stockCost: 0,
    };
  }
}

/**
 * Backward-compatible monthly summary helper
 */
export async function getMonthlySummary(month, year) {
  const targetDate = new Date(year, month, 15);
  return getPeriodicSummary('month', targetDate);
}

/**
 * Get product sales and performance ranking
 */
export async function getProductPerformance() {
  try {
    const [saleItems, products] = await Promise.all([
      db.saleItems.toArray(),
      db.products.toArray(),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const stats = {};

    for (const item of saleItems) {
      const prod = productMap.get(item.productId);
      const prodName = prod ? prod.name : 'Item';
      if (!stats[item.productId]) {
        stats[item.productId] = {
          id: item.productId,
          name: prodName,
          category: prod?.category || 'General',
          totalQty: 0,
          totalRevenue: 0,
        };
      }
      stats[item.productId].totalQty += Number(item.quantity) || 0;
      stats[item.productId].totalRevenue += (Number(item.quantity) || 0) * (Number(item.sellingPrice) || 0);
    }

    return Object.values(stats).sort((a, b) => b.totalRevenue - a.totalRevenue);
  } catch (err) {
    console.error('Error in getProductPerformance:', err);
    return [];
  }
}
