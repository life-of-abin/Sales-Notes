import * as XLSX from 'xlsx';
import {
  formatProductDisplayName,
  formatCustomerDisplayName,
  formatExpenseDisplayName,
  formatTextLanguage,
  isTamil,
  transliterateEnglishToTamil,
  transliterateTamilToEnglish,
} from './transliterate';

/**
 * Full bilingual Excel dictionary & labels
 * All labels and column headers strictly adapt to the selected language (Tamil or English).
 */
function getExcelDictionary(language) {
  const isTa = language === 'ta';

  return {
    isTa,
    // Sheet Names
    sheetOverview: isTa ? 'மொத்த பார்வை' : 'Overview',
    sheetSales: isTa ? 'விற்பனை விவரங்கள்' : 'Sales Transactions',
    sheetExpenses: isTa ? 'செலவுகள்' : 'Expenses',
    sheetInventory: isTa ? 'கையிருப்பு ஸ்டாக்' : 'Inventory Stock',

    // Overview Sheet
    reportTitle: isTa
      ? '🛍️ விற்பனை குறிப்புகள் — முழு வியாபார அறிக்கை'
      : '🛍️ SALES NOTES — BUSINESS REPORT',
    reportPeriod: isTa ? 'அறிக்கை காலம்:' : 'Report Period:',
    exportedDate: isTa ? 'ஏற்றுமதி தேதி & நேரம்:' : 'Exported Date & Time:',
    
    // Overview Section 1: Financial Summary
    financialSummary: isTa ? 'நிதி சுருக்கம்' : 'FINANCIAL SUMMARY',
    amountInr: isTa ? 'தொகை (₹)' : 'AMOUNT (INR)',
    details: isTa ? 'விவரங்கள்' : 'DETAILS',
    totalSales: isTa ? 'மொத்த விற்பனை வருவாய்' : 'Total Sales (Revenue)',
    salesRecorded: isTa ? 'விற்பனை பதிவுகள்' : 'sales recorded',
    realizedProfit: isTa ? 'உண்மையான லாபம்' : 'Realized Profit',
    grossProfitNote: isTa
      ? 'இந்த காலகட்ட விற்பனையின் மொத்த லாபம்'
      : 'Gross profit from sales in this period',
    totalExpenses: isTa ? 'மொத்த செலவுகள்' : 'Total Expenses',
    expenseEntries: isTa ? 'செலவு பதிவுகள்' : 'expense entries',
    netProfit: isTa ? 'நிகர லாபம் (லாபம் - செலவுகள்)' : 'Net Profit (Profit - Expenses)',
    netProfitLabel: isTa ? 'நிகர லாபம்' : 'Net Profit',
    netLossLabel: isTa ? 'நிகர நஷ்டம்' : 'Net Loss',

    // Overview Section 2: Inventory Summary
    inventoryOverview: isTa ? 'கையிருப்பு மேலோட்டம்' : 'INVENTORY OVERVIEW',
    count: isTa ? 'எண்ணிக்கை' : 'COUNT',
    remarks: isTa ? 'குறிப்புகள்' : 'REMARKS',
    totalProducts: isTa ? 'மொத்த பொருட்கள்' : 'Total Registered Products',
    registeredItems: isTa ? 'பதிவு செய்யப்பட்ட பொருட்கள்' : 'Total registered items in catalog',
    remainingStock: isTa ? 'மீதமுள்ள கையிருப்பு (எண்ணிக்கை)' : 'Total Remaining Stock (Pieces)',
    currentInventory: isTa ? 'தற்போதைய கையிருப்பு' : 'Current inventory in stock',

    // Sales Transactions Sheet
    sNo: isTa ? 'வ.எண்' : 'S.No',
    dateTime: isTa ? 'தேதி & நேரம்' : 'Date & Time',
    saleId: isTa ? 'விற்பனை எண்' : 'Sale ID',
    itemsQtyRate: isTa ? 'பொருட்கள் (எண்ணிக்கை @ விலை)' : 'Items (Qty @ Rate)',
    totalQty: isTa ? 'மொத்த எண்ணிக்கை' : 'Total Qty',
    totalAmount: isTa ? 'மொத்த தொகை (₹)' : 'Total Amount (₹)',
    profit: isTa ? 'லாபம் (₹)' : 'Profit (₹)',
    discount: isTa ? 'தள்ளுபடி (₹)' : 'Discount (₹)',
    customerName: isTa ? 'வாடிக்கையாளர் பெயர்' : 'Customer Name',
    paymentStatus: isTa ? 'கட்டண நிலை' : 'Payment Status',
    paid: isTa ? 'முழு பணம் செலுத்தப்பட்டது' : 'Fully Paid',
    partial: isTa ? 'நிலுவை / பகுதி கட்டணம்' : 'Partial / Pending',
    itemFallback: isTa ? 'பொருள்' : 'Item',
    saleFallback: isTa ? 'விற்பனை' : 'Sale',
    noSales: isTa ? 'இந்த காலகட்டத்தில் விற்பனை பதிவு இல்லை' : 'No sales recorded in this period',

    // Expenses Sheet
    date: isTa ? 'தேதி' : 'Date',
    expenseCategory: isTa ? 'செலவு வகை' : 'Expense Category',
    amountRs: isTa ? 'தொகை (₹)' : 'Amount (₹)',
    notesDesc: isTa ? 'குறிப்புகள் / விவரம்' : 'Notes / Description',
    generalExpense: isTa ? 'பொது செலவு' : 'General Expense',
    noExpenses: isTa ? 'இந்த காலகட்டத்தில் செலவுகள் பதிவு இல்லை' : 'No expenses recorded in this period',

    // Inventory Sheet
    productName: isTa ? 'பொருள் பெயர்' : 'Product Name',
    totalPurchased: isTa ? 'மொத்த வாங்கியது (எண்.)' : 'Total Purchased (Qty)',
    totalSold: isTa ? 'மொத்த விற்றது (எண்.)' : 'Total Sold (Qty)',
    inStock: isTa ? 'கையிருப்பு (மீதம்)' : 'In Stock (Remaining)',
    costValue: isTa ? 'மொத்த கொள்முதல் செலவு (₹)' : 'Cost Value (₹)',
    sellingValue: isTa ? 'விற்பனை மதிப்பு (₹)' : 'Selling Value (₹)',
    status: isTa ? 'ஸ்டாக் நிலை' : 'Stock Status',
    soldOut: isTa ? 'விற்று தீர்ந்தது' : 'SOLD OUT',
    lowStock: isTa ? 'குறைவான ஸ்டாக்' : 'LOW STOCK',
    inStockLabel: isTa ? 'ஸ்டாக் உள்ளது' : 'IN STOCK',
  };
}

/**
 * Maps timeframe key to translated label
 */
function getTimeframeLabel(timeframe, timeframeLabel, isTa) {
  if (timeframe === 'today') return isTa ? 'இன்று' : 'Today';
  if (timeframe === 'week') return isTa ? 'இந்த வாரம் (7 நாட்கள்)' : 'This Week (Last 7 Days)';
  if (timeframe === 'month') return isTa ? 'இந்த மாதம்' : 'This Month';
  if (timeframe === 'year') return isTa ? 'இந்த வருடம்' : 'This Year';
  if (timeframe === 'all') return isTa ? 'முழு காலம் (அனைத்தும்)' : 'All Time';
  
  if (isTa) {
    if (!isTamil(timeframeLabel)) {
      return transliterateEnglishToTamil(timeframeLabel);
    }
    return timeframeLabel;
  } else {
    if (isTamil(timeframeLabel)) {
      return transliterateTamilToEnglish(timeframeLabel);
    }
    return timeframeLabel;
  }
}

/**
 * Generates and triggers download of a genuine binary Excel (.xlsx) workbook
 * containing multiple sheets (Overview, Sales, Expenses, Inventory).
 *
 * CRITICAL FEATURE:
 * Checks selected language (Tamil / English).
 * If Tamil: ALL content (headers, product names, customer names, expense categories,
 * status text, notes, sheet names) is exported in TAMIL.
 * If English: ALL content is exported in ENGLISH.
 */
export async function exportReportToExcel({
  timeframe = 'month',
  timeframeLabel = 'Month',
  summary = {},
  sales = [],
  saleItems = [],
  products = [],
  customers = [],
  expenses = [],
  inventoryLots = [],
  language = 'en',
  t = {},
}) {
  const dict = getExcelDictionary(language);
  const isTa = language === 'ta';
  const locale = isTa ? 'ta-IN' : 'en-IN';

  const now = new Date();
  const cutoff = new Date(now);
  if (timeframe === 'today') {
    cutoff.setHours(0, 0, 0, 0);
  } else if (timeframe === 'week') {
    cutoff.setDate(now.getDate() - 6);
    cutoff.setHours(0, 0, 0, 0);
  } else if (timeframe === 'month') {
    cutoff.setDate(1);
    cutoff.setHours(0, 0, 0, 0);
  } else if (timeframe === 'year') {
    cutoff.setMonth(0, 1);
    cutoff.setHours(0, 0, 0, 0);
  } else {
    cutoff.setFullYear(2000);
  }

  // Filter sales and expenses by timeframe
  const filteredSales = sales
    .filter((s) => new Date(s.date) >= cutoff)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredExpenses = expenses
    .filter((e) => new Date(e.date) >= cutoff)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Only proceed if report data exists for this period
  const hasData =
    filteredSales.length > 0 ||
    filteredExpenses.length > 0 ||
    (timeframe === 'all' && products && products.length > 0);

  if (!hasData) {
    return { success: false, noData: true };
  }

  // Map products and customers
  const productMap = new Map(products.map((p) => [p.id, p]));
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  // Create a new Excel Workbook
  const workbook = XLSX.utils.book_new();

  const exportDateStr = now.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const periodLabel = getTimeframeLabel(timeframe, timeframeLabel, isTa);

  // ==========================================
  // SHEET 1: FINANCIAL OVERVIEW
  // ==========================================
  const summaryAoa = [
    [dict.reportTitle],
    [dict.reportPeriod, periodLabel],
    [dict.exportedDate, exportDateStr],
    [],
    [dict.financialSummary, dict.amountInr, dict.details],
    [
      dict.totalSales,
      Number(summary.totalSales || 0),
      `${summary.salesCount || filteredSales.length} ${dict.salesRecorded}`,
    ],
    [
      dict.realizedProfit,
      Number(summary.totalProfit || 0),
      dict.grossProfitNote,
    ],
    [
      dict.totalExpenses,
      Number(summary.totalExpenses || 0),
      `${filteredExpenses.length} ${dict.expenseEntries}`,
    ],
    [
      dict.netProfit,
      Number(summary.netProfit || 0),
      (summary.netProfit || 0) >= 0 ? dict.netProfitLabel : dict.netLossLabel,
    ],
    [],
    [dict.inventoryOverview, dict.count, dict.remarks],
    [
      dict.totalProducts,
      products.length,
      dict.registeredItems,
    ],
    [
      dict.remainingStock,
      inventoryLots.reduce((sum, l) => sum + (l.remainingQty || 0), 0),
      dict.currentInventory,
    ],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoa);
  summarySheet['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 44 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, dict.sheetOverview);

  // ==========================================
  // SHEET 2: DETAILED SALES TRANSACTIONS
  // ==========================================
  const salesAoa = [
    [
      dict.sNo,
      dict.dateTime,
      dict.saleId,
      dict.itemsQtyRate,
      dict.totalQty,
      dict.totalAmount,
      dict.profit,
      dict.discount,
      dict.customerName,
      dict.paymentStatus,
    ],
  ];

  filteredSales.forEach((s, idx) => {
    const items = saleItems.filter((si) => si.saleId === s.id);
    const pNames =
      items
        .map((it) => {
          const prod = productMap.get(it.productId);
          const name = prod
            ? formatProductDisplayName(prod.name, language)
            : dict.itemFallback;
          return `${name} (${it.quantity}x ₹${it.sellingPrice || 0})`;
        })
        .join(', ') || dict.saleFallback;

    const cust = s.customerId ? customerMap.get(s.customerId) : null;
    const customerName = cust ? formatCustomerDisplayName(cust.name, language) : '-';
    const totalQty = items.reduce((sum, it) => sum + (it.quantity || 0), 0);

    const dateStr = new Date(s.date).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    salesAoa.push([
      idx + 1,
      dateStr,
      `#${s.id}`,
      pNames,
      totalQty,
      Number(s.totalAmount || 0),
      Number(s.totalProfit || 0),
      Number(s.discount || 0),
      customerName,
      s.paymentStatus === 'paid' ? dict.paid : dict.partial,
    ]);
  });

  if (filteredSales.length === 0) {
    salesAoa.push(['-', '-', '-', dict.noSales, 0, 0, 0, 0, '-', '-']);
  }

  const salesSheet = XLSX.utils.aoa_to_sheet(salesAoa);
  salesSheet['!cols'] = [
    { wch: 8 },
    { wch: 24 },
    { wch: 14 },
    { wch: 50 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 24 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(workbook, salesSheet, dict.sheetSales);

  // ==========================================
  // SHEET 3: EXPENSES BREAKDOWN
  // ==========================================
  const expensesAoa = [
    [dict.sNo, dict.date, dict.expenseCategory, dict.amountRs, dict.notesDesc],
  ];

  filteredExpenses.forEach((e, idx) => {
    const dateStr = new Date(e.date).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const categoryDisplayName = formatExpenseDisplayName(e.type, language);
    const noteDisplayName = formatTextLanguage(e.note, language);

    expensesAoa.push([
      idx + 1,
      dateStr,
      categoryDisplayName,
      Number(e.amount || 0),
      noteDisplayName,
    ]);
  });

  if (filteredExpenses.length === 0) {
    expensesAoa.push(['-', '-', dict.noExpenses, 0, '-']);
  }

  const expensesSheet = XLSX.utils.aoa_to_sheet(expensesAoa);
  expensesSheet['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 30 },
    { wch: 16 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(workbook, expensesSheet, dict.sheetExpenses);

  // ==========================================
  // SHEET 4: INVENTORY STOCK OVERVIEW
  // ==========================================
  const inventoryAoa = [
    [
      dict.sNo,
      dict.productName,
      dict.totalPurchased,
      dict.totalSold,
      dict.inStock,
      dict.costValue,
      dict.sellingValue,
      dict.status,
    ],
  ];

  products.forEach((p, idx) => {
    const pLots = inventoryLots.filter((l) => l.productId === p.id);
    const totalQty = pLots.reduce((sum, l) => sum + (l.quantity || 0), 0);
    const remainingQty = pLots.reduce((sum, l) => sum + (l.remainingQty || 0), 0);
    const soldQty = Math.max(0, totalQty - remainingQty);
    const stockVal = pLots.reduce((sum, l) => sum + (l.remainingQty || 0) * (l.sellingPrice || 0), 0);
    const stockCost = pLots.reduce((sum, l) => sum + (l.remainingQty || 0) * (l.purchasePrice || 0), 0);

    const productNameDisplay = formatProductDisplayName(p.name, language);
    const stockStatus =
      remainingQty === 0
        ? dict.soldOut
        : remainingQty < 5
        ? dict.lowStock
        : dict.inStockLabel;

    inventoryAoa.push([
      idx + 1,
      productNameDisplay,
      totalQty,
      soldQty,
      remainingQty,
      Number(stockCost),
      Number(stockVal),
      stockStatus,
    ]);
  });

  if (products.length === 0) {
    inventoryAoa.push(['-', isTa ? 'பொருட்கள் இல்லை' : 'No products found', 0, 0, 0, 0, 0, '-']);
  }

  const inventorySheet = XLSX.utils.aoa_to_sheet(inventoryAoa);
  inventorySheet['!cols'] = [
    { wch: 8 },
    { wch: 32 },
    { wch: 24 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, inventorySheet, dict.sheetInventory);

  // ==========================================
  // GENERATE AND AUTO-DOWNLOAD .XLSX DIRECTLY
  // ==========================================
  const cleanLabel = periodLabel.replace(/[\s/()]+/g, '_');
  const dateFileTag = now.toISOString().slice(0, 10);
  const fileName = isTa
    ? `விற்பனை_குறிப்புகள்_அறிக்கை_${cleanLabel}_${dateFileTag}.xlsx`
    : `Sales_Notes_Report_${cleanLabel}_${dateFileTag}.xlsx`;

  // Generate binary XLSX buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });

  // Direct programmatic download without any prompts
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);

  return { success: true };
}
