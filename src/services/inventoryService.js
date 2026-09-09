import db from '../db/database';

/**
 * FIFO allocation: deducts `quantity` of a given product from the oldest lots first.
 * Returns an array of allocation objects: { lotId, quantity, purchasePrice, sellingPrice }
 */
export async function allocateFIFO(productId, quantity) {
  const lots = await db.inventoryLots
    .where('productId')
    .equals(productId)
    .filter((lot) => lot.remainingQty > 0)
    .sortBy('createdAt');

  let remaining = quantity;
  const allocations = [];

  for (const lot of lots) {
    if (remaining <= 0) break;

    const take = Math.min(lot.remainingQty, remaining);
    allocations.push({
      lotId: lot.id,
      quantity: take,
      purchasePrice: lot.purchasePrice,
      sellingPrice: lot.sellingPrice,
    });

    await db.inventoryLots.update(lot.id, {
      remainingQty: lot.remainingQty - take,
    });

    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error(`Not enough stock. Short by ${remaining} pieces.`);
  }

  return allocations;
}

/**
 * Direct allocation: deducts `quantity` from a specific inventory lot chosen by the user.
 * Returns an array of allocation objects: [{ lotId, quantity, purchasePrice, sellingPrice }]
 */
export async function allocateLot(lotId, quantity) {
  const lot = await db.inventoryLots.get(lotId);
  if (!lot) {
    throw new Error('Inventory lot not found.');
  }

  if (lot.remainingQty < quantity) {
    throw new Error(`Not enough stock in this variety. Only ${lot.remainingQty} available.`);
  }

  await db.inventoryLots.update(lot.id, {
    remainingQty: lot.remainingQty - quantity,
  });

  return [
    {
      lotId: lot.id,
      quantity,
      purchasePrice: lot.purchasePrice,
      sellingPrice: lot.sellingPrice,
    },
  ];
}

/**
 * Get total available stock lots for a single product with batch information.
 */
export async function getProductStock(productId) {
  const lots = await db.inventoryLots
    .where('productId')
    .equals(productId)
    .filter((lot) => lot.remainingQty > 0)
    .sortBy('createdAt');

  const batches = await db.purchaseBatches.toArray();
  const batchMap = new Map(batches.map((b) => [b.id, b]));

  return lots.map((lot) => ({
    ...lot,
    batch: batchMap.get(lot.batchId) || null,
    batchNumber: batchMap.get(lot.batchId)?.batchNumber ?? '—',
  }));
}

/**
 * Get a summary of all products with aggregated stock counts.
 */
export async function getAllProductSummaries() {
  const products = await db.products.toArray();
  const lots = await db.inventoryLots.toArray();

  return products.map((product) => {
    const productLots = lots.filter((l) => l.productId === product.id);
    const totalQty = productLots.reduce((sum, l) => sum + l.remainingQty, 0);
    const totalValue = productLots.reduce(
      (sum, l) => sum + l.remainingQty * l.sellingPrice,
      0
    );
    const totalCost = productLots.reduce(
      (sum, l) => sum + l.remainingQty * l.purchasePrice,
      0
    );

    return {
      ...product,
      totalQty,
      totalValue,
      totalCost,
    };
  }).filter(p => p.totalQty > 0 || true); // keep products even if 0 stock
}

/**
 * Get total stock value (at selling price) and total cost.
 */
export async function getTotalStockValue() {
  const lots = await db.inventoryLots.toArray();
  const activeValue = lots.reduce(
    (sum, l) => sum + l.remainingQty * l.sellingPrice,
    0
  );
  const activeCost = lots.reduce(
    (sum, l) => sum + l.remainingQty * l.purchasePrice,
    0
  );
  return { stockValue: activeValue, stockCost: activeCost };
}
