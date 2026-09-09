/**
 * ============================================================
 * CENTRALIZED BUSINESS CALCULATION ENGINE
 * Single Source of Truth for all sales & profit calculations.
 * ============================================================
 */

/**
 * Rounds a number cleanly to 2 decimal places to prevent floating-point precision issues.
 */
export function roundCurrency(val) {
  const num = Number(val) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * 1. PRODUCT-LEVEL CALCULATION
 * Computes all metrics for a single product / lot.
 *
 * Core Formulas:
 * - soldQty = purchaseQty - remainingQty
 * - investment = purchaseQty * buyPrice
 * - costOfSold = soldQty * buyPrice
 * - grossSales = soldQty * sellPrice
 * - grossProfit = grossSales - costOfSold = (sellPrice - buyPrice) * soldQty
 * - realizedProfit = grossProfit - discount
 * - actualProfitWithoutDiscounts = grossProfit
 * - expectedReturn = remainingQty * sellPrice (if remainingQty === 0 => 0)
 */
export function calculateProductMetrics({
  purchaseQty = 0,
  soldQty = null,
  remainingQty = null,
  buyPrice = 0,
  sellPrice = 0,
  discount = 0,
}) {
  const pQty = Math.max(0, Number(purchaseQty) || 0);
  const bPrice = Math.max(0, Number(buyPrice) || 0);
  const sPrice = Math.max(0, Number(sellPrice) || 0);
  const disc = Number(discount) || 0;

  // Determine soldQty and remainingQty safely
  let rQty, sQty;
  if (remainingQty !== null && remainingQty !== undefined) {
    rQty = Math.max(0, Math.min(pQty, Number(remainingQty) || 0));
    sQty = Math.max(0, pQty - rQty);
  } else if (soldQty !== null && soldQty !== undefined) {
    sQty = Math.max(0, Math.min(pQty, Number(soldQty) || 0));
    rQty = Math.max(0, pQty - sQty);
  } else {
    sQty = 0;
    rQty = pQty;
  }

  const investment = roundCurrency(pQty * bPrice);
  const costOfSold = roundCurrency(sQty * bPrice);
  const grossSales = roundCurrency(sQty * sPrice);
  const grossProfit = roundCurrency((sPrice - bPrice) * sQty); // Actual Profit without discounts
  const realizedProfit = roundCurrency(grossProfit - disc);
  const expectedReturn = rQty > 0 ? roundCurrency(rQty * sPrice) : 0;

  return {
    purchaseQty: pQty,
    soldQty: sQty,
    remainingQty: rQty,
    buyPrice: bPrice,
    sellPrice: sPrice,
    discount: disc,
    investment,
    costOfSold,
    grossSales,
    grossProfit, // Actual profit without discounts
    realizedProfit,
    actualProfitWithoutDiscounts: grossProfit,
    expectedReturn,
  };
}

/**
 * 2. BATCH-LEVEL METRICS CALCULATION
 * Aggregates all lot metrics in a purchase batch.
 *
 * @param {Array} lots - Array of inventory lots belonging to the batch
 * @param {Array} allocations - Array of sale allocations for this batch
 * @param {Map|Array} saleItems - Map or array of sale items for resolving discounts
 */
export function calculateBatchMetrics(lots = [], allocations = [], saleItems = []) {
  const saleItemsMap = saleItems instanceof Map
    ? saleItems
    : new Map((saleItems || []).map((si) => [si.id, si]));

  const lotIds = new Set(lots.map((l) => l.id));
  const batchAllocations = allocations.filter((a) => lotIds.has(a.lotId));

  // Map allocations by lotId to get exact sold counts and discounts per lot
  const lotAllocationsMap = new Map();
  for (const alloc of batchAllocations) {
    if (!lotAllocationsMap.has(alloc.lotId)) {
      lotAllocationsMap.set(alloc.lotId, []);
    }
    lotAllocationsMap.get(alloc.lotId).push(alloc);
  }

  let totalInvestment = 0;
  let totalGrossSales = 0;
  let totalCostOfSold = 0;
  let totalGrossProfit = 0;
  let totalDiscount = 0;
  let totalRealizedProfit = 0;
  let totalPurchasedQty = 0;
  let totalSoldQty = 0;
  let totalRemainingQty = 0;
  let totalExpectedReturn = 0;

  const enrichedLots = lots.map((lot) => {
    const lotAllocs = lotAllocationsMap.get(lot.id) || [];
    
    // Calculate total discount given on this lot from allocations
    const lotDiscount = lotAllocs.reduce((sum, a) => {
      const si = saleItemsMap.get(a.saleItemId);
      const perUnitDiscount = a.discount !== undefined ? Number(a.discount) || 0 : (Number(si?.discount) || 0);
      return sum + (Number(a.quantity) || 0) * perUnitDiscount;
    }, 0);

    const metrics = calculateProductMetrics({
      purchaseQty: lot.quantity,
      remainingQty: lot.remainingQty,
      buyPrice: lot.purchasePrice,
      sellPrice: lot.sellingPrice,
      discount: lotDiscount,
    });

    totalInvestment += metrics.investment;
    totalGrossSales += metrics.grossSales;
    totalCostOfSold += metrics.costOfSold;
    totalGrossProfit += metrics.grossProfit;
    totalDiscount += metrics.discount;
    totalRealizedProfit += metrics.realizedProfit;
    totalPurchasedQty += metrics.purchaseQty;
    totalSoldQty += metrics.soldQty;
    totalRemainingQty += metrics.remainingQty;
    totalExpectedReturn += metrics.expectedReturn;

    return {
      ...lot,
      ...metrics,
    };
  });

  const isCompleted = enrichedLots.length > 0 && totalRemainingQty === 0;
  const status = isCompleted ? 'completed' : 'selling';

  return {
    totalInvestment: roundCurrency(totalInvestment),
    totalGrossSales: roundCurrency(totalGrossSales),
    totalCostOfSold: roundCurrency(totalCostOfSold),
    grossProfit: roundCurrency(totalGrossProfit), // Actual profit without discounts
    actualProfitWithoutDiscounts: roundCurrency(totalGrossProfit),
    totalDiscount: roundCurrency(totalDiscount),
    realizedProfit: roundCurrency(totalRealizedProfit),
    totalPurchasedQty,
    totalSoldQty,
    totalRemainingQty,
    totalExpectedReturn: roundCurrency(totalExpectedReturn),
    status,
    lots: enrichedLots,
  };
}

/**
 * 3. PERIODIC / GLOBAL METRICS CALCULATION
 * Computes clean totals for reports, dashboard, and analytics.
 */
export function calculatePeriodFinancials({
  sales = [],
  expenses = [],
  lots = [],
}) {
  const totalSales = roundCurrency(
    sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0)
  );

  const totalRealizedProfit = roundCurrency(
    sales.reduce((sum, s) => sum + (Number(s.totalProfit) || 0), 0)
  );

  const totalDiscountGiven = roundCurrency(
    sales.reduce((sum, s) => sum + (Number(s.discount) || 0), 0)
  );

  const totalGrossProfit = roundCurrency(totalRealizedProfit + totalDiscountGiven);

  const totalExpenses = roundCurrency(
    expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  );

  const netProfit = roundCurrency(totalRealizedProfit - totalExpenses);

  const stockValue = roundCurrency(
    lots.reduce(
      (sum, l) => sum + ((Number(l.remainingQty) || 0) * (Number(l.sellingPrice) || 0)),
      0
    )
  );

  const stockCost = roundCurrency(
    lots.reduce(
      (sum, l) => sum + ((Number(l.remainingQty) || 0) * (Number(l.purchasePrice) || 0)),
      0
    )
  );

  return {
    totalSales,
    totalGrossProfit,
    totalDiscountGiven,
    totalRealizedProfit,
    totalExpenses,
    netProfit,
    stockValue,
    stockCost,
    salesCount: sales.length,
  };
}
