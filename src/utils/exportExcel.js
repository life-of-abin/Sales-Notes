import * as XLSX from 'xlsx';
import { formatProductDisplayName, formatCustomerDisplayName } from './transliterate';

/**
 * Generates and triggers download of a genuine binary Excel (.xlsx) workbook
 * containing multiple sheets (Summary, Sales, Expenses, Inventory)
 * filtered by the currently active timeframe.
 */
export async function exportReportToExcel({
  timeframe,
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

  // Map products and customers
  const productMap = new Map(products.map((p) => [p.id, p]));
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  // Create a new Excel Workbook
  const workbook = XLSX.utils.book_new();

  const exportDateStr = now.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // ==========================================
  // SHEET 1: FINANCIAL OVERVIEW
  // ==========================================
  const summaryAoa = [
    ['🛍️ SALES NOTES — BUSINESS REPORT'],
    ['Report Period:', timeframeLabel],
    ['Exported Date:', exportDateStr],
    [],
    ['FINANCIAL SUMMARY', 'AMOUNT (INR)', 'DETAILS'],
    ['Total Sales (Revenue)', Number(summary.totalSales || 0), `${summary.salesCount || 0} total sales recorded`],
    ['Realized Profit', Number(summary.totalProfit || 0), 'Gross profit from sales in this period'],
    ['Total Expenses', Number(summary.totalExpenses || 0), `${filteredExpenses.length} expense entries`],
    ['Net Profit (Profit - Expenses)', Number(summary.netProfit || 0), (summary.netProfit || 0) >= 0 ? 'Net Profit' : 'Net Loss'],
    [],
    ['INVENTORY OVERVIEW', 'COUNT', 'REMARKS'],
    ['Total Products', products.length, 'Total registered items'],
    ['Total Remaining Stock (Pieces)', inventoryLots.reduce((sum, l) => sum + (l.remainingQty || 0), 0), 'Current inventory on hand'],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoa);
  summarySheet['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Overview');

  // ==========================================
  // SHEET 2: DETAILED SALES TRANSACTIONS
  // ==========================================
  const salesAoa = [
    [
      'S.No',
      'Date & Time',
      'Sale ID',
      'Items (Qty @ Rate)',
      'Total Qty',
      'Total Amount (₹)',
      'Profit (₹)',
      'Discount (₹)',
      'Customer Name',
      'Payment Status',
    ],
  ];

  filteredSales.forEach((s, idx) => {
    const items = saleItems.filter((si) => si.saleId === s.id);
    const pNames = items
      .map((it) => {
        const prod = productMap.get(it.productId);
        const name = prod ? formatProductDisplayName(prod.name, language) : 'Item';
        return `${name} (${it.quantity}x ₹${it.sellingPrice || 0})`;
      })
      .join(', ') || 'Sale';

    const cust = s.customerId ? customerMap.get(s.customerId) : null;
    const customerName = cust ? formatCustomerDisplayName(cust.name, language) : '-';
    const totalQty = items.reduce((sum, it) => sum + (it.quantity || 0), 0);

    const dateStr = new Date(s.date).toLocaleString('en-IN', {
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
      s.paymentStatus === 'paid' ? 'Paid' : 'Partial / Pending',
    ]);
  });

  if (filteredSales.length === 0) {
    salesAoa.push(['-', '-', '-', 'No sales recorded in this period', 0, 0, 0, 0, '-', '-']);
  }

  const salesSheet = XLSX.utils.aoa_to_sheet(salesAoa);
  salesSheet['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 10 },
    { wch: 45 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(workbook, salesSheet, 'Sales Transactions');

  // ==========================================
  // SHEET 3: EXPENSES BREAKDOWN
  // ==========================================
  const expensesAoa = [
    ['S.No', 'Date', 'Expense Category', 'Amount (₹)', 'Notes / Description'],
  ];

  filteredExpenses.forEach((e, idx) => {
    const dateStr = new Date(e.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    expensesAoa.push([
      idx + 1,
      dateStr,
      e.type || 'General Expense',
      Number(e.amount || 0),
      e.note || '-',
    ]);
  });

  if (filteredExpenses.length === 0) {
    expensesAoa.push(['-', '-', 'No expenses recorded in this period', 0, '-']);
  }

  const expensesSheet = XLSX.utils.aoa_to_sheet(expensesAoa);
  expensesSheet['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 24 },
    { wch: 16 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');

  // ==========================================
  // SHEET 4: INVENTORY STOCK OVERVIEW
  // ==========================================
  const inventoryAoa = [
    [
      'S.No',
      'Product Name',
      'Total Purchased (Qty)',
      'Total Sold (Qty)',
      'In Stock (Remaining)',
      'Cost Value (₹)',
      'Selling Value (₹)',
      'Status',
    ],
  ];

  products.forEach((p, idx) => {
    const pLots = inventoryLots.filter((l) => l.productId === p.id);
    const totalQty = pLots.reduce((sum, l) => sum + (l.quantity || 0), 0);
    const remainingQty = pLots.reduce((sum, l) => sum + (l.remainingQty || 0), 0);
    const soldQty = totalQty - remainingQty;
    const stockVal = pLots.reduce((sum, l) => sum + l.remainingQty * l.sellingPrice, 0);
    const stockCost = pLots.reduce((sum, l) => sum + l.remainingQty * l.purchasePrice, 0);

    inventoryAoa.push([
      idx + 1,
      formatProductDisplayName(p.name, language),
      totalQty,
      soldQty,
      remainingQty,
      Number(stockCost),
      Number(stockVal),
      remainingQty === 0 ? 'SOLD OUT' : remainingQty < 5 ? 'LOW STOCK' : 'IN STOCK',
    ]);
  });

  const inventorySheet = XLSX.utils.aoa_to_sheet(inventoryAoa);
  inventorySheet['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 22 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory Stock');

  // ==========================================
  // GENERATE AND AUTO-DOWNLOAD .XLSX DIRECTLY
  // ==========================================
  const cleanLabel = timeframeLabel.replace(/\s+/g, '_');
  const dateFileTag = now.toISOString().slice(0, 10);
  const fileName = `Sales_Notes_Report_${cleanLabel}_${dateFileTag}.xlsx`;

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
}


