import Dexie from 'dexie';

const db = new Dexie('MyDukaanDB');

// Version 1: Initial schema
db.version(1).stores({
  products: 'id, name, category, createdAt',
  purchaseBatches: 'id, batchNumber, date',
  inventoryLots: 'id, batchId, productId, createdAt, remainingQty',
  sales: 'id, date, customerId',
  saleItems: 'id, saleId, productId',
  saleAllocations: 'id, saleItemId, lotId',
  expenses: 'id, date, type',
  customers: 'id, name',
  customerPayments: 'id, customerId, saleId, date',
  settings: 'id',
});

// Version 2: Explicitly ensure settings table exists for existing client databases
db.version(2).stores({
  settings: 'id',
});

export default db;
