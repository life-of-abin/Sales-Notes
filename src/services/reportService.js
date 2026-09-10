import db from '../db/database';
import { calculateBatchMetrics, calculatePeriodFinancials, roundCurrency } from './calculationService';
import { getShortDate } from '../utils/formatDate';

/**
 * Get batch profit data for the bar chart.
 * Returns an array of { id, batchId, batchNumber, date, label, realizedProfit, expectedProfit, expectedReturn, grossProfit, totalInvestment, status }
 */
export async function getBatchProfitData() {
  try {
    const [batches, lots, allocations, saleItems] = await Promise.all([
      db.purchaseBatches.orderBy('date').toArray(),
      db.inventoryLots.toArray(),
      db.saleAllocations.toArray(),
      db.saleItems.toArray(),
    ]);

    const saleItemsMap = new Map(saleItems.map((si) => [si.id, si]));
    const lotsByBatch = new Map();
    for (const lot of lots) {
      if (!lotsByBatch.has(lot.batchId)) {
        lotsByBatch.set(lot.batchId, []);
      }
      lotsByBatch.get(lot.batchId).push(lot);
    }

    const results = [];
    for (const batch of batches) {
      const batchLots = lotsByBatch.get(batch.id) || [];
      const metrics = calculateBatchMetrics(batchLots, allocations, saleItemsMap);

      results.push({
        id: batch.id,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        date: batch.date,
        label: `#${batch.batchNumber} (${getShortDate(batch.date)})`,
        realizedProfit: metrics.realizedProfit,
        totalItemProfit: metrics.totalItemProfit,
        totalLoss: metrics.totalLoss,
        // For chart: profit bar (always >= 0) and loss bar (always <= 0)
        chartProfit: metrics.totalItemProfit,
        chartLoss: metrics.totalLoss > 0 ? -metrics.totalLoss : 0,
        totalDiscount: metrics.totalDiscount,
        totalExtra: metrics.totalExtra,
        expectedReturn: metrics.totalExpectedReturn,
        expectedRevenue: metrics.expectedRevenue,
        expectedProfit: metrics.expectedProfit,
        profitWithoutDiscount: metrics.profitWithoutDiscount,
        grossProfit: metrics.grossProfit,
        totalProfit: metrics.realizedProfit,
        totalSales: metrics.totalSales,
        status: metrics.status,
        hasDeletedStock: metrics.hasDeletedStock,
        isAllStockDeleted: metrics.isAllStockDeleted,
        totalInvestment: metrics.totalInvestment || Number(batch.totalInvestment) || 0,
      });
    }

    return results;
  } catch (err) {
    console.error('Error in getBatchProfitData:', err);
    return [];
  }
}

/**
 * Get summary by flexible timeframe: 'today' | 'week' | 'month' | 'year' | 'all'
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

    const [sales, expenses, lots] = await Promise.all([
      db.sales.toArray(),
      db.expenses.toArray(),
      db.inventoryLots.toArray(),
    ]);

    const filteredSales = sales.filter((s) => {
      const d = new Date(s.date);
      return d >= startDate && d <= endDate;
    });

    const filteredExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= startDate && d <= endDate;
    });

    const financials = calculatePeriodFinancials({
      sales: filteredSales,
      expenses: filteredExpenses,
      lots,
    });

    return {
      totalSales: financials.totalSales,
      totalProfit: financials.totalRealizedProfit,
      totalItemProfit: financials.totalItemProfit,
      totalLoss: financials.totalLoss,
      totalGrossProfit: financials.totalGrossProfit,
      totalDiscountGiven: financials.totalDiscountGiven,
      totalExpenses: financials.totalExpenses,
      netProfit: financials.netProfit,
      salesCount: financials.salesCount,
      stockValue: financials.stockValue,
      stockCost: financials.stockCost,
      timeframe,
      startDate,
      endDate,
    };
  } catch (err) {
    console.error('Error in getPeriodicSummary:', err);
    return {
      totalSales: 0,
      totalProfit: 0,
      totalItemProfit: 0,
      totalLoss: 0,
      totalGrossProfit: 0,
      totalDiscountGiven: 0,
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
      const qty = Number(item.quantity) || 0;
      const price = Number(item.sellingPrice) || 0;
      stats[item.productId].totalQty += qty;
      stats[item.productId].totalRevenue += roundCurrency(qty * price);
    }

    return Object.values(stats).sort((a, b) => b.totalRevenue - a.totalRevenue);
  } catch (err) {
    console.error('Error in getProductPerformance:', err);
    return [];
  }
}
