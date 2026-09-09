/**
 * ============================================================
 * CENTRALIZED BUSINESS ACCOUNTING & SALES CALCULATION ENGINE
 * Single Source of Truth for all sales, profit, batch and dashboard math.
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
 * 1. SALE TRANSACTION CALCULATION
 * Computes all financial metrics for an individual sale or line item.
 *
 * Core Formulas:
 * - saleRevenue = actualSalePrice * quantitySold
 * - saleCost = costPrice * quantitySold
 * - saleRealizedProfit = saleRevenue - saleCost
 * - discount: if actualSalePrice < sellPrice -> (sellPrice - actualSalePrice) * quantitySold, else 0
 * - extra: if actualSalePrice > sellPrice -> (actualSalePrice - sellPrice) * quantitySold, else 0
 * - profitWithoutDiscount = (sellPrice - costPrice) * quantitySold
 * - isLoss = actualSalePrice < costPrice
 * - loss: if isLoss -> (costPrice - actualSalePrice) * quantitySold, else 0
 * - Consistency: realizedProfit = profitWithoutDiscount - totalDiscount + totalExtra
 */
export function calculateSaleTransaction({
  quantity = 1,
  quantitySold = null,
  costPrice = null,
  costPerUnitAtSale = 0,
  sellPrice = null,
  predefinedSellPriceAtSale = 0,
  actualSalePrice = 0,
}) {
  const qty = Math.max(0, Number(quantitySold ?? quantity) || 0);
  const cost = Math.max(0, Number(costPrice ?? costPerUnitAtSale) || 0);
  const predefinedPrice = Math.max(0, Number(sellPrice ?? predefinedSellPriceAtSale) || 0);
  const actualPrice = Math.max(0, Number(actualSalePrice) || 0);

  const saleRevenue = roundCurrency(actualPrice * qty);
  const saleCost = roundCurrency(cost * qty);
  const saleRealizedProfit = roundCurrency(saleRevenue - saleCost);

  // Discount: only when actualSalePrice < sellPrice (never negative)
  const discountPerItem = actualPrice < predefinedPrice ? roundCurrency(predefinedPrice - actualPrice) : 0;
  const totalDiscount = roundCurrency(discountPerItem * qty);

  // Extra: only when actualSalePrice > sellPrice (never negative)
  const extraPerItem = actualPrice > predefinedPrice ? roundCurrency(actualPrice - predefinedPrice) : 0;
  const totalExtra = roundCurrency(extraPerItem * qty);

  // Profit Without Discount: normal profit if sold at predefined sell price
  const profitWithoutDiscount = roundCurrency((predefinedPrice - cost) * qty);

  // Below Cost Warning & Loss
  const isLoss = actualPrice < cost;
  const lossPerItem = isLoss ? roundCurrency(cost - actualPrice) : 0;
  const totalLoss = isLoss ? roundCurrency(lossPerItem * qty) : 0;

  return {
    quantity: qty,
    quantitySold: qty,
    costPrice: cost,
    costPerUnitAtSale: cost,
    sellPrice: predefinedPrice,
    predefinedSellPriceAtSale: predefinedPrice,
    actualSalePrice: actualPrice,
    revenue: saleRevenue,
    saleRevenue,
    costOfGoodsSold: saleCost,
    saleCost,
    realizedProfit: saleRealizedProfit,
    saleRealizedProfit,
    profitWithoutDiscount,
    discountPerItem,
    discountPerUnit: discountPerItem,
    totalDiscount,
    discount: totalDiscount,
    extraPerItem,
    extraPerUnit: extraPerItem,
    totalExtra,
    extra: totalExtra,
    isLoss,
    lossPerItem,
    lossPerUnit: lossPerItem,
    totalLoss,
    loss: totalLoss,
  };
}

/**
 * 2. PRODUCT / LOT METRICS CALCULATION
 * Backward-compatible helper for lot-level stock & performance metrics.
 */
export function calculateProductMetrics({
  purchaseQty = 0,
  soldQty = null,
  remainingQty = null,
  buyPrice = 0,
  sellPrice = 0,
  discount = 0,
  actualRevenue = null,
}) {
  const pQty = Math.max(0, Number(purchaseQty) || 0);
  const bPrice = Math.max(0, Number(buyPrice) || 0);
  const sPrice = Math.max(0, Number(sellPrice) || 0);
  const disc = Math.max(0, Number(discount) || 0);

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
  const grossSales = roundCurrency(sQty * sPrice); // Expected revenue at predefined price

  // If actualRevenue is supplied, realizedProfit is actualRevenue - costOfSold;
  // otherwise grossSales - costOfSold - discount
  const realizedRevenue = actualRevenue !== null ? roundCurrency(Number(actualRevenue)) : roundCurrency(grossSales - disc);
  const realizedProfit = roundCurrency(realizedRevenue - costOfSold);
  const grossProfit = roundCurrency(grossSales - costOfSold);
  const expectedReturn = rQty > 0 ? roundCurrency(rQty * sPrice) : 0;
  const remainingInvestment = roundCurrency(rQty * bPrice);

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
    revenue: realizedRevenue,
    grossProfit,
    realizedProfit,
    actualProfitWithoutDiscounts: grossProfit,
    expectedReturn,
    remainingInvestment,
  };
}

/**
 * 3. BATCH TOTALS DERIVED FROM TRANSACTIONS (Single Source of Truth)
 *
 * @param {Array} lots - Inventory lots belonging to the batch
 * @param {Array} allocations - Sale allocations belonging to this batch's lots
 * @param {Map|Array} saleItems - Sale items for fallback context
 */
export function calculateBatchMetrics(lots = [], allocations = [], saleItems = []) {
  const saleItemsMap = saleItems instanceof Map
    ? saleItems
    : new Map((saleItems || []).map((si) => [si.id, si]));

  const lotIds = new Set(lots.map((l) => l.id));
  const batchAllocations = allocations.filter((a) => lotIds.has(a.lotId));

  const lotAllocationsMap = new Map();
  for (const alloc of batchAllocations) {
    if (!lotAllocationsMap.has(alloc.lotId)) {
      lotAllocationsMap.set(alloc.lotId, []);
    }
    lotAllocationsMap.get(alloc.lotId).push(alloc);
  }

  let totalInvestment = 0;
  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalDiscount = 0;
  let totalExtra = 0;
  let totalRealizedProfit = 0;
  let totalPurchasedQty = 0;
  let totalSoldQty = 0;
  let totalRemainingQty = 0;
  let totalRemainingInvestment = 0;
  let totalExpectedRevenue = 0;
  let totalProfitWithoutDiscount = 0;

  const enrichedLots = lots.map((lot) => {
    const lotAllocs = lotAllocationsMap.get(lot.id) || [];
    const pQty = Number(lot.quantity) || 0;
    const rQty = Number(lot.remainingQty) || 0;
    const bPrice = Number(lot.purchasePrice) || 0;
    const sPrice = Number(lot.sellingPrice) || 0;

    let lotRevenue = 0;
    let lotCOGS = 0;
    let lotDiscount = 0;
    let lotExtra = 0;
    let lotRealizedProfit = 0;
    let lotSoldQty = 0;

    for (const a of lotAllocs) {
      const aQty = Number(a.quantity) || 0;
      const aCost = a.costPrice !== undefined ? Number(a.costPrice) : (a.costPerUnitAtSale !== undefined ? Number(a.costPerUnitAtSale) : (Number(a.purchasePrice) || bPrice));
      const aPredefined = a.sellPrice !== undefined ? Number(a.sellPrice) : (a.predefinedSellPriceAtSale !== undefined ? Number(a.predefinedSellPriceAtSale) : sPrice);
      const aActual = a.actualSalePrice !== undefined ? Number(a.actualSalePrice) : (Number(a.sellingPrice) || sPrice);

      const aCalc = calculateSaleTransaction({
        quantity: aQty,
        costPrice: aCost,
        sellPrice: aPredefined,
        actualSalePrice: aActual,
      });

      lotSoldQty += aCalc.quantity;
      lotRevenue += aCalc.revenue;
      lotCOGS += aCalc.costOfGoodsSold;
      lotDiscount += aCalc.totalDiscount;
      lotExtra += aCalc.totalExtra;
      lotRealizedProfit += aCalc.realizedProfit;
    }

    // If there were no allocation records but remainingQty reflects sales
    if (lotAllocs.length === 0 && rQty < pQty) {
      const fallbackSold = pQty - rQty;
      const fallbackCalc = calculateSaleTransaction({
        quantity: fallbackSold,
        costPrice: bPrice,
        sellPrice: sPrice,
        actualSalePrice: sPrice,
      });
      lotSoldQty = fallbackCalc.quantity;
      lotRevenue = fallbackCalc.revenue;
      lotCOGS = fallbackCalc.costOfGoodsSold;
      lotDiscount = fallbackCalc.totalDiscount;
      lotExtra = fallbackCalc.totalExtra;
      lotRealizedProfit = fallbackCalc.realizedProfit;
    }

    const lotInvestment = roundCurrency(pQty * bPrice);
    const lotRemainingInvestment = roundCurrency(rQty * bPrice);
    const lotExpectedReturn = rQty > 0 ? roundCurrency(rQty * sPrice) : 0;
    const lotExpectedRevenue = roundCurrency(lotSoldQty * sPrice);
    const lotProfitWithoutDiscount = roundCurrency(lotSoldQty * (sPrice - bPrice));

    totalInvestment += lotInvestment;
    totalRevenue += lotRevenue;
    totalCOGS += lotCOGS;
    totalDiscount += lotDiscount;
    totalExtra += lotExtra;
    totalRealizedProfit += lotRealizedProfit;
    totalPurchasedQty += pQty;
    totalSoldQty += lotSoldQty;
    totalRemainingQty += rQty;
    totalRemainingInvestment += lotRemainingInvestment;
    totalExpectedRevenue += lotExpectedRevenue;
    totalProfitWithoutDiscount += lotProfitWithoutDiscount;

    return {
      ...lot,
      quantityPurchased: pQty,
      purchaseQty: pQty,
      quantitySold: lotSoldQty,
      soldQty: lotSoldQty,
      quantityRemaining: rQty,
      remainingQty: rQty,
      costPrice: bPrice,
      buyPrice: bPrice,
      sellPrice: sPrice,
      totalInvestment: lotInvestment,
      investment: lotInvestment,
      remainingInvestment: lotRemainingInvestment,
      totalSales: roundCurrency(lotRevenue),
      revenue: roundCurrency(lotRevenue),
      costOfGoodsSold: roundCurrency(lotCOGS),
      totalDiscount: roundCurrency(lotDiscount),
      discount: roundCurrency(lotDiscount),
      totalExtra: roundCurrency(lotExtra),
      extra: roundCurrency(lotExtra),
      profitWithoutDiscount: lotProfitWithoutDiscount,
      grossProfit: lotProfitWithoutDiscount,
      realizedProfit: roundCurrency(lotRealizedProfit),
      expectedReturn: lotExpectedReturn,
      expectedRevenue: lotExpectedRevenue,
      expectedProfit: lotProfitWithoutDiscount,
    };
  });

  const isCompleted = enrichedLots.length > 0 && totalRemainingQty === 0;
  const status = isCompleted ? 'completed' : 'selling';
  const averageActualSalePrice = totalSoldQty > 0 ? roundCurrency(totalRevenue / totalSoldQty) : 0;

  return {
    totalInvestment: roundCurrency(totalInvestment),
    quantityPurchased: totalPurchasedQty,
    totalPurchasedQty,
    quantitySold: totalSoldQty,
    totalSoldQty,
    quantityRemaining: totalRemainingQty,
    totalRemainingQty,
    remainingInvestment: roundCurrency(totalRemainingInvestment),
    stockInvestment: roundCurrency(totalRemainingInvestment),
    totalSales: roundCurrency(totalRevenue),
    totalRevenue: roundCurrency(totalRevenue),
    revenue: roundCurrency(totalRevenue),
    totalCOGS: roundCurrency(totalCOGS),
    totalDiscount: roundCurrency(totalDiscount),
    discount: roundCurrency(totalDiscount),
    totalExtra: roundCurrency(totalExtra),
    extra: roundCurrency(totalExtra),
    profitWithoutDiscount: roundCurrency(totalProfitWithoutDiscount),
    grossProfit: roundCurrency(totalProfitWithoutDiscount), // backward compatibility
    realizedProfit: roundCurrency(totalRealizedProfit),
    expectedRevenue: roundCurrency(totalExpectedRevenue),
    expectedProfit: roundCurrency(totalProfitWithoutDiscount),
    totalExpectedReturn: roundCurrency(enrichedLots.reduce((sum, l) => sum + l.expectedReturn, 0)),
    averageActualSalePrice,
    status,
    lots: enrichedLots,
  };
}

/**
 * 4. DASHBOARD & PERIODIC FINANCIAL SUMMARY
 */
export function calculatePeriodFinancials({
  sales = [],
  expenses = [],
  lots = [],
  batches = [],
}) {
  const totalSales = roundCurrency(
    sales.reduce((sum, s) => sum + (Number(s.totalAmount) || Number(s.revenue) || 0), 0)
  );

  const totalRealizedProfit = roundCurrency(
    sales.reduce((sum, s) => sum + (Number(s.totalProfit) || Number(s.realizedProfit) || 0), 0)
  );

  const totalDiscountGiven = roundCurrency(
    sales.reduce((sum, s) => sum + (Number(s.discount) || Number(s.totalDiscount) || 0), 0)
  );

  const totalExtra = roundCurrency(
    sales.reduce((sum, s) => sum + (Number(s.extra) || Number(s.totalExtra) || 0), 0)
  );

  const totalProfitWithoutDiscount = roundCurrency(
    sales.reduce((sum, s) => sum + (Number(s.profitWithoutDiscount) || 0), 0)
  );

  const totalExpenses = roundCurrency(
    expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  );

  const netProfit = roundCurrency(totalRealizedProfit - totalExpenses);

  const totalInvestment = roundCurrency(
    batches.length > 0
      ? batches.reduce((sum, b) => sum + (Number(b.totalInvestment) || 0), 0)
      : lots.reduce((sum, l) => sum + ((Number(l.quantity) || 0) * (Number(l.purchasePrice) || 0)), 0)
  );

  const totalSoldQty = sales.reduce((sum, s) => sum + (Number(s.quantity) || 1), 0);
  const remainingStock = lots.reduce((sum, l) => sum + (Number(l.remainingQty) || 0), 0);

  const stockValue = roundCurrency(
    lots.reduce(
      (sum, l) => sum + ((Number(l.remainingQty) || 0) * (Number(l.sellingPrice) || 0)),
      0
    )
  );

  const remainingInvestment = roundCurrency(
    lots.reduce(
      (sum, l) => sum + ((Number(l.remainingQty) || 0) * (Number(l.purchasePrice) || 0)),
      0
    )
  );

  const totalGrossProfit = totalProfitWithoutDiscount > 0
    ? totalProfitWithoutDiscount
    : roundCurrency(totalRealizedProfit + totalDiscountGiven - totalExtra);

  return {
    totalInvestment,
    totalSales,
    totalRevenue: totalSales,
    totalDiscount: totalDiscountGiven,
    totalDiscountGiven,
    totalExtra,
    profitWithoutDiscount: totalProfitWithoutDiscount || totalGrossProfit,
    realizedProfit: totalRealizedProfit,
    totalRealizedProfit,
    totalProfit: totalRealizedProfit,
    totalGrossProfit,
    totalExpenses,
    netProfit,
    totalQuantitySold: totalSoldQty,
    remainingStock,
    remainingInvestment,
    stockCost: remainingInvestment,
    stockValue,
    salesCount: sales.length,
  };
}
