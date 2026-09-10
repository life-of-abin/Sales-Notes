import { createContext, useState, useEffect, useCallback } from 'react';
import db from '../db/database';
import { allocateFIFO, allocateLot, getAllProductSummaries, getTotalStockValue } from '../services/inventoryService';
import { roundCurrency, calculateProductMetrics, calculateSaleTransaction } from '../services/calculationService';
import { isToday } from '../utils/formatDate';
import { generateId } from '../utils/generateId';
import { formatCustomerDisplayName } from '../utils/transliterate';
import en from '../i18n/en';
import ta from '../i18n/ta';

export const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('my_dukaan_lang') || 'en';
  });
  const [products, setProducts] = useState([]);
  const [productSummaries, setProductSummaries] = useState([]);
  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [stockValue, setStockValue] = useState(0);
  const [stockCost, setStockCost] = useState(0);

  const t = language === 'ta' ? ta : en;

  const changeLanguage = useCallback(async (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('my_dukaan_lang', newLang);
    try {
      const settings = await db.settings.get('main');
      if (settings) {
        await db.settings.put({ ...settings, language: newLang });
      }
    } catch {
      // Ignore DB error if settings table isn't ready
    }
  }, []);

  // ---- Refresh data from DB ----
  const refreshData = useCallback(async () => {
    try {
      const [prods, sls, si, btch, exps, custs, pymts, summaries, sv] = await Promise.all([
        db.products.toArray(),
        db.sales.orderBy('date').reverse().toArray(),
        db.saleItems.toArray(),
        db.purchaseBatches.orderBy('date').reverse().toArray(),
        db.expenses.orderBy('date').reverse().toArray(),
        db.customers.toArray(),
        db.customerPayments.toArray(),
        getAllProductSummaries(),
        getTotalStockValue(),
      ]);
      setProducts(prods || []);
      setSales(sls || []);
      setSaleItems(si || []);
      setBatches(btch || []);
      setExpenses(exps || []);
      setCustomers(custs || []);
      setCustomerPayments(pymts || []);
      setProductSummaries(summaries || []);
      setStockValue(sv?.stockValue || 0);
      setStockCost(sv?.stockCost || 0);
    } catch (err) {
      console.error('Error refreshing business data:', err);
    }
  }, []);

  // ---- Init ----
  useEffect(() => {
    async function init() {
      try {
        const settings = await db.settings.get('main');
        if (!settings) {
          await db.settings.put({ id: 'main', onboarded: true, language: 'en' });
        }
        setOnboarded(true);
        if (settings?.language) {
          setLanguage(settings.language);
          localStorage.setItem('my_dukaan_lang', settings.language);
        }
        await refreshData();
      } catch (err) {
        console.error('Error initializing business context:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [refreshData]);

  // ---- Toast helpers ----
  const showToast = useCallback((message, type = 'success') => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // ---- Complete onboarding ----
  const completeOnboarding = useCallback(async (selectedCategories) => {
    await db.settings.put({ id: 'main', onboarded: true, language: 'en', selectedCategories });
    setOnboarded(true);
  }, []);

  // ---- CREATE PURCHASE BATCH ----
  const createPurchase = useCallback(async (items) => {
    // items = [{ productName, quantity, purchasePrice, sellingPrice }]
    const batchCount = await db.purchaseBatches.count();
    const batchNumber = batchCount + 1;
    const batchId = generateId();
    const now = new Date().toISOString();

    let totalInvestment = 0;

    // Create batch
    await db.purchaseBatches.add({
      id: batchId,
      batchNumber,
      date: now,
      totalInvestment: 0,
      notes: '',
    });

    for (const item of items) {
      // Find or create product
      let product = await db.products.where('name').equalsIgnoreCase(item.productName).first();
      if (!product) {
        product = {
          id: generateId(),
          name: item.productName,
          category: item.productName.toLowerCase(),
          imageUrl: null,
          createdAt: now,
        };
        await db.products.add(product);
      }

      // Create inventory lot
      const cost = roundCurrency(item.quantity * item.purchasePrice);
      totalInvestment = roundCurrency(totalInvestment + cost);

      await db.inventoryLots.add({
        id: generateId(),
        batchId,
        productId: product.id,
        quantity: item.quantity,
        remainingQty: item.quantity,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        createdAt: now,
      });
    }

    // Update batch total
    await db.purchaseBatches.update(batchId, { totalInvestment: roundCurrency(totalInvestment) });

    await refreshData();
    showToast(`${t.purchaseSaved} Batch #${batchNumber}`);
    return batchNumber;
  }, [refreshData, showToast, t]);

  // ---- RECORD SALE ----
  const recordSale = useCallback(async (productId, quantity, sellingPrice, discount = 0, customerId = null, paidAmount = null, lotId = null) => {
    const rawActualPrice = Number(sellingPrice) || 0;
    const rawDiscount = Number(discount) || 0;

    // Direct Lot or FIFO allocation
    const allocations = lotId
      ? await allocateLot(lotId, quantity)
      : await allocateFIFO(productId, quantity);

    let totalSaleRevenue = 0;
    let totalSaleProfit = 0;
    let totalSaleDiscount = 0;
    let totalSaleExtra = 0;
    let totalSaleProfitWithoutDiscount = 0;
    let totalSaleCOGS = 0;

    const calculatedAllocations = allocations.map((alloc) => {
      const predefinedPrice = Number(alloc.sellingPrice) || 0;
      const costPrice = Number(alloc.purchasePrice) || 0;
      const actualPrice = rawActualPrice;
      const tx = calculateSaleTransaction({
        quantity: alloc.quantity,
        costPrice,
        sellPrice: predefinedPrice,
        actualSalePrice: actualPrice,
      });

      totalSaleRevenue += tx.revenue;
      totalSaleProfit += tx.realizedProfit;
      totalSaleDiscount += tx.totalDiscount;
      totalSaleExtra += tx.totalExtra;
      totalSaleProfitWithoutDiscount += tx.profitWithoutDiscount;
      totalSaleCOGS += tx.costOfGoodsSold;

      return {
        ...alloc,
        tx,
        actualSalePrice: actualPrice,
        predefinedSellPrice: predefinedPrice,
      };
    });

    totalSaleRevenue = roundCurrency(totalSaleRevenue);
    totalSaleProfit = roundCurrency(totalSaleProfit);
    totalSaleDiscount = roundCurrency(totalSaleDiscount);
    totalSaleExtra = roundCurrency(totalSaleExtra);
    totalSaleProfitWithoutDiscount = roundCurrency(totalSaleProfitWithoutDiscount);
    totalSaleCOGS = roundCurrency(totalSaleCOGS);

    const saleId = generateId();
    const now = new Date().toISOString();

    // Determine payment status
    let paymentStatus = 'paid';
    if (customerId && paidAmount !== null && paidAmount < totalSaleRevenue) {
      paymentStatus = 'partial';
    }

    // Create sale record
    await db.sales.add({
      id: saleId,
      customerId: customerId || null,
      date: now,
      totalAmount: totalSaleRevenue,
      totalProfit: totalSaleProfit,
      discount: totalSaleDiscount,
      extra: totalSaleExtra,
      profitWithoutDiscount: totalSaleProfitWithoutDiscount,
      costOfGoodsSold: totalSaleCOGS,
      paymentStatus,
    });

    // Create sale item record
    const saleItemId = generateId();
    await db.saleItems.add({
      id: saleItemId,
      saleId,
      productId,
      quantity,
      sellingPrice: rawActualPrice,
      actualSalePrice: rawActualPrice,
      discount: roundCurrency(totalSaleDiscount / (quantity || 1)),
      totalDiscount: totalSaleDiscount,
      extra: roundCurrency(totalSaleExtra / (quantity || 1)),
      totalExtra: totalSaleExtra,
      profitWithoutDiscount: totalSaleProfitWithoutDiscount,
      revenue: totalSaleRevenue,
      costOfGoodsSold: totalSaleCOGS,
      realizedProfit: totalSaleProfit,
    });

    // Create sale allocations records
    for (const alloc of calculatedAllocations) {
      await db.saleAllocations.add({
        id: generateId(),
        saleItemId,
        lotId: alloc.lotId,
        quantity: alloc.quantity,
        purchasePrice: alloc.purchasePrice,
        predefinedSellPrice: alloc.predefinedSellPrice,
        sellingPrice: alloc.actualSalePrice,
        actualSalePrice: alloc.actualSalePrice,
        discount: alloc.tx.discountPerItem,
        totalDiscount: alloc.tx.totalDiscount,
        extra: alloc.tx.extraPerItem,
        totalExtra: alloc.tx.totalExtra,
        profitWithoutDiscount: alloc.tx.profitWithoutDiscount,
        revenue: alloc.tx.revenue,
        costOfGoodsSold: alloc.tx.costOfGoodsSold,
        realizedProfit: alloc.tx.realizedProfit,
      });
    }

    // Handle customer payment
    if (customerId && paidAmount !== null) {
      const pendingAmount = roundCurrency(totalSaleRevenue - paidAmount);
      if (paidAmount > 0) {
        await db.customerPayments.add({
          id: generateId(),
          customerId,
          saleId,
          amount: paidAmount,
          date: now,
        });
      }
      // Update customer pending
      const cust = await db.customers.get(customerId);
      if (cust) {
        await db.customers.update(customerId, {
          totalPending: roundCurrency((cust.totalPending || 0) + pendingAmount),
        });
      }
    }

    await refreshData();
    showToast(`${t.saleRecorded} ${t.profitEarned}: ₹${totalSaleProfit}`);
    return { saleId, totalProfit: totalSaleProfit, totalAmount: totalSaleRevenue };
  }, [refreshData, showToast, t]);

  // ---- ADD EXPENSE ----
  const addExpense = useCallback(async (type, amount, note = '') => {
    await db.expenses.add({
      id: generateId(),
      type,
      amount: roundCurrency(amount),
      note,
      date: new Date().toISOString(),
    });
    await refreshData();
    showToast(t.expenseAdded || 'Expense added');
  }, [refreshData, showToast, t]);

  // ---- ADD CUSTOMER ----
  const addCustomer = useCallback(async (name, phone = '', initialPending = 0) => {
    const id = generateId();
    await db.customers.add({
      id,
      name,
      phone,
      totalPending: roundCurrency(initialPending),
    });
    await refreshData();
    showToast(t.customerAdded || 'Customer added');
    return id;
  }, [refreshData, showToast, t]);

  // ---- ADD OR UPDATE CUSTOMER PENDING CREDIT ----
  const addOrUpdateCustomerPending = useCallback(async (name, pendingAmount, initialPaid = 0, phone = '') => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = await db.customers.where('name').equalsIgnoreCase(trimmed).first();
    let customerId;
    const pendingNum = Number(pendingAmount) || 0;
    const paidNum = Number(initialPaid) || 0;
    const netPending = roundCurrency(Math.max(0, pendingNum - paidNum));

    if (existing) {
      customerId = existing.id;
      await db.customers.update(customerId, {
        totalPending: roundCurrency((existing.totalPending || 0) + netPending),
        phone: phone || existing.phone || '',
      });
    } else {
      customerId = generateId();
      await db.customers.add({
        id: customerId,
        name: trimmed,
        phone: phone || '',
        totalPending: netPending,
      });
    }

    // Record initial payment if provided
    if (paidNum > 0) {
      await db.customerPayments.add({
        id: generateId(),
        customerId,
        saleId: null,
        amount: paidNum,
        date: new Date().toISOString(),
      });
    }

    await refreshData();
    const displayName = formatCustomerDisplayName(trimmed, language);
    showToast(`${displayName}: ₹${netPending} ${t.pending}`);
    return customerId;
  }, [language, refreshData, showToast, t]);

  // ---- RECORD CUSTOMER PAYMENT ----
  const recordCustomerPayment = useCallback(async (customerId, amount) => {
    const amt = roundCurrency(amount);
    await db.customerPayments.add({
      id: generateId(),
      customerId,
      saleId: null,
      amount: amt,
      date: new Date().toISOString(),
    });

    const cust = await db.customers.get(customerId);
    if (cust) {
      await db.customers.update(customerId, {
        totalPending: roundCurrency(Math.max(0, (cust.totalPending || 0) - amt)),
      });
    }

    await refreshData();
    showToast(t.paymentRecorded);
  }, [refreshData, showToast, t]);

  // ---- DELETE EXPENSE ----
  const deleteExpense = useCallback(async (id) => {
    await db.expenses.delete(id);
    await refreshData();
    showToast(t.expenseDeleted || 'Expense deleted');
  }, [refreshData, showToast, t]);

  // ---- DELETE SALE ----
  const deleteSale = useCallback(async (saleId) => {
    // 1. Find all saleItems and saleAllocations for this sale
    const items = await db.saleItems.where('saleId').equals(saleId).toArray();
    const itemIds = items.map((i) => i.id);
    const allocs = await db.saleAllocations.where('saleItemId').anyOf(itemIds).toArray();

    // 2. Restore lot remaining quantities
    for (const alloc of allocs) {
      const lot = await db.inventoryLots.get(alloc.lotId);
      if (lot) {
        await db.inventoryLots.update(alloc.lotId, {
          remainingQty: (Number(lot.remainingQty) || 0) + (Number(alloc.quantity) || 0),
        });
      }
    }

    // 3. Delete allocations, items, payments, and sale
    for (const alloc of allocs) {
      await db.saleAllocations.delete(alloc.id);
    }
    for (const item of items) {
      await db.saleItems.delete(item.id);
    }
    await db.customerPayments.where('saleId').equals(saleId).delete();
    await db.sales.delete(saleId);

    await refreshData();
    showToast(t.saleDeleted || 'Sale deleted');
  }, [refreshData, showToast, t]);

  // ---- DELETE PRODUCT ----
  const deleteProduct = useCallback(async (productId) => {
    await db.inventoryLots.where('productId').equals(productId).delete();
    await db.products.delete(productId);
    await refreshData();
    showToast(t.productDeleted || 'Product deleted successfully');
  }, [refreshData, showToast, t]);

  // ---- Computed values ----
  const todaySales = sales.filter((s) => isToday(s.date));
  const todaySalesTotal = roundCurrency(todaySales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0));
  const todayProfitTotal = roundCurrency(todaySales.reduce((sum, s) => sum + (Number(s.totalProfit) || 0), 0));
  const totalPending = roundCurrency(customers.reduce((sum, c) => sum + (Number(c.totalPending) || 0), 0));
  const totalExpensesVal = roundCurrency(expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));

  const value = {
    loading,
    onboarded,
    language,
    changeLanguage,
    t,
    // Data
    products,
    productSummaries,
    sales,
    saleItems,
    batches,
    expenses,
    customers,
    customerPayments,
    toasts,
    // Computed
    todaySalesTotal,
    todayProfitTotal,
    stockValue,
    stockCost,
    totalPending,
    totalExpensesVal,
    // Actions
    completeOnboarding,
    createPurchase,
    recordSale,
    deleteSale,
    deleteProduct,
    addExpense,
    deleteExpense,
    addCustomer,
    addOrUpdateCustomerPending,
    recordCustomerPayment,
    showToast,
    refreshData,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}
