import type {
  CreateInventoryItemInput,
  InventoryItem,
  UpdateInventoryItemInput,
  InventoryCategory,
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  Order,
  Shipment,
} from "../types";

// ============================================================================
// LocalStorage Persistence Helpers
// ============================================================================

const STORAGE_KEYS = {
  INVENTORY: 'wms_inventory',
  SUPPLIERS: 'wms_suppliers',
  ORDERS: 'wms_orders',
  SHIPMENTS: 'wms_shipments',
} as const;

/**
 * Save data to localStorage
 */
function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error(`Failed to save to localStorage (${key}):`, error);
  }
}

/**
 * Load data from localStorage
 */
function loadFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return fallback;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Failed to load from localStorage (${key}):`, error);
    return fallback;
  }
}

/**
 * Clear all WMS data from localStorage (for development/testing)
 */
export function clearAllWMSData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

/**
 * Reset to default mock data (clears localStorage and reloads)
 */
export function resetToDefaultData(): void {
  clearAllWMSData();
  window.location.reload();
}

// ============================================================================
// Default Mock Data
// ============================================================================

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: "INV-001", name: "Laptop Computer", category: "Electronics", quantity: 145, location: "A-12", reorderLevel: 50, status: "In Stock", brand: "Dell", pricePerPiece: 899.99, supplierId: "SUP-001", maintainStockAt: 100, minimumStock: 50 },
  { id: "INV-002", name: "Office Chair", category: "Furniture", quantity: 23, location: "B-08", reorderLevel: 30, status: "Low Stock", brand: "Herman Miller", pricePerPiece: 549.00, supplierId: "SUP-002", maintainStockAt: 50, minimumStock: 30 },
  { id: "INV-003", name: "Standing Desk", category: "Furniture", quantity: 67, location: "B-05", reorderLevel: 20, status: "In Stock", brand: "Uplift", pricePerPiece: 799.00, supplierId: "SUP-002", maintainStockAt: 40, minimumStock: 20 },
  { id: "INV-004", name: "Wireless Mouse", category: "Electronics", quantity: 8, location: "A-15", reorderLevel: 25, status: "Critical", brand: "Logitech", pricePerPiece: 29.99, supplierId: "SUP-003", maintainStockAt: 50, minimumStock: 25 },
  { id: "INV-005", name: "USB-C Cable", category: "Electronics", quantity: 234, location: "A-20", reorderLevel: 100, status: "In Stock", brand: "Anker", pricePerPiece: 12.99, supplierId: "SUP-001", maintainStockAt: 200, minimumStock: 100 },
  { id: "INV-006", name: "Monitor 27\"", category: "Electronics", quantity: 89, location: "A-10", reorderLevel: 40, status: "In Stock", brand: "LG", pricePerPiece: 349.99, supplierId: "SUP-003", maintainStockAt: 80, minimumStock: 40 },
  { id: "INV-007", name: "Keyboard Mechanical", category: "Electronics", quantity: 156, location: "A-14", reorderLevel: 50, status: "In Stock", brand: "Corsair", pricePerPiece: 129.99, supplierId: "SUP-001", maintainStockAt: 100, minimumStock: 50 },
  { id: "INV-008", name: "Filing Cabinet", category: "Furniture", quantity: 34, location: "B-03", reorderLevel: 15, status: "In Stock", brand: "Steelcase", pricePerPiece: 299.00, supplierId: "SUP-002", maintainStockAt: 30, minimumStock: 15 },
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  { id: "SUP-001", name: "TechSource LLC", contact: "John Smith", email: "john@techsource.com", phone: "+1 (555) 123-4567", category: "Electronics", status: "Active" },
  { id: "SUP-002", name: "FurniCraft Industries", contact: "Sarah Johnson", email: "sarah@furnicraft.com", phone: "+1 (555) 234-5678", category: "Furniture", status: "Active" },
  { id: "SUP-003", name: "Global Electronics Co", contact: "Michael Chen", email: "michael@globalelec.com", phone: "+1 (555) 345-6789", category: "Electronics", status: "Active" },
  { id: "SUP-004", name: "Metro Supplies Inc", contact: "Emily Davis", email: "emily@metrosupplies.com", phone: "+1 (555) 456-7890", category: "Office Supplies", status: "Inactive" },
  { id: "SUP-005", name: "Premium Parts Ltd", contact: "Robert Wilson", email: "robert@premiumparts.com", phone: "+1 (555) 567-8901", category: "Electronics", status: "Active" },
];

const DEFAULT_ORDERS: Order[] = [
  { id: "ORD-1234", customer: "Acme Corp", items: 15, total: "₱2,450", status: "Processing", date: "2025-10-15" },
  { id: "ORD-1235", customer: "TechStart Inc", items: 8, total: "₱1,200", status: "Shipped", date: "2025-10-14" },
  { id: "ORD-1236", customer: "Global Solutions", items: 23, total: "₱3,890", status: "Delivered", date: "2025-10-13" },
  { id: "ORD-1237", customer: "Beta Systems", items: 12, total: "₱1,750", status: "Processing", date: "2025-10-15" },
  { id: "ORD-1238", customer: "Metro Supplies", items: 6, total: "₱890", status: "Pending", date: "2025-10-16" },
  { id: "ORD-1239", customer: "Urban Retail", items: 19, total: "₱2,100", status: "Shipped", date: "2025-10-14" },
  { id: "ORD-1240", customer: "Summit Trading", items: 10, total: "₱1,560", status: "Processing", date: "2025-10-15" },
];

const DEFAULT_SHIPMENTS: Shipment[] = [
  { id: "SHIP-5678", orderId: "ORD-1234", destination: "New York, NY", carrier: "FedEx", status: "In Transit", eta: "Oct 18, 2025" },
  { id: "SHIP-5679", orderId: "ORD-1235", destination: "Los Angeles, CA", carrier: "UPS", status: "Delivered", eta: "Oct 14, 2025" },
  { id: "SHIP-5680", orderId: "ORD-1236", destination: "Chicago, IL", carrier: "DHL", status: "In Transit", eta: "Oct 19, 2025" },
  { id: "SHIP-5681", orderId: "ORD-1237", destination: "Houston, TX", carrier: "FedEx", status: "Processing", eta: "Oct 20, 2025" },
  { id: "SHIP-5682", orderId: "ORD-1238", destination: "Phoenix, AZ", carrier: "USPS", status: "Pending", eta: "Oct 21, 2025" },
  { id: "SHIP-5683", orderId: "ORD-1239", destination: "Philadelphia, PA", carrier: "UPS", status: "In Transit", eta: "Oct 17, 2025" },
];

// ============================================================================
// In-Memory Store (loaded from localStorage or defaults)
// ============================================================================

/**
 * Migrate old inventory items to include new fields
 * This ensures backward compatibility with items created before the schema update
 */
function migrateInventoryItems(items: any[]): InventoryItem[] {
  return items.map(item => {
    // Check if item has new fields, if not, add defaults
    if (!item.brand || item.pricePerPiece === undefined || !item.supplierId ||
      item.maintainStockAt === undefined || item.minimumStock === undefined) {
      return {
        ...item,
        brand: item.brand || "Unknown",
        pricePerPiece: item.pricePerPiece ?? 0,
        supplierId: item.supplierId || "SUP-001",
        maintainStockAt: item.maintainStockAt ?? (item.reorderLevel * 2),
        minimumStock: item.minimumStock ?? item.reorderLevel,
      };
    }
    return item;
  });
}

// Migrate orders from USD ($) to PHP (₱)
function migrateOrdersCurrency(orders: Order[]): Order[] {
  return orders.map(order => {
    // If total contains $, replace with ₱
    if (order.total && order.total.includes('$')) {
      return {
        ...order,
        total: order.total.replace(/\$/g, '₱')
      };
    }
    return order;
  });
}

let inventory: InventoryItem[] = migrateInventoryItems(loadFromLocalStorage(STORAGE_KEYS.INVENTORY, DEFAULT_INVENTORY));
let suppliers: Supplier[] = loadFromLocalStorage(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
let orders: Order[] = migrateOrdersCurrency(loadFromLocalStorage(STORAGE_KEYS.ORDERS, DEFAULT_ORDERS));
let shipments: Shipment[] = loadFromLocalStorage(STORAGE_KEYS.SHIPMENTS, DEFAULT_SHIPMENTS);

// Save migrated orders back to localStorage
saveToLocalStorage(STORAGE_KEYS.ORDERS, orders);

// Save migrated inventory back to localStorage
saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);

// ============================================================================
// Helper Functions
// ============================================================================

function computeStatus(quantity: number, reorderLevel: number): InventoryItem["status"] {
  if (quantity <= 0) return "Critical";
  if (quantity <= Math.max(1, reorderLevel)) return "Low Stock";
  return "In Stock";
}

function generateId(): string {
  const maxNum = inventory
    .map((i) => Number(i.id.replace(/[^0-9]/g, "")) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  const next = maxNum + 1;
  return `INV-${String(next).padStart(3, "0")}`;
}

function generateSupplierId(): string {
  const maxNum = suppliers
    .map((s) => Number(s.id.replace(/[^0-9]/g, "")) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  const next = maxNum + 1;
  return `SUP-${String(next).padStart(3, "0")}`;
}

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function getInventory(): Promise<InventoryItem[]> {
  return delay([...inventory]);
}

export async function createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
  const id = input.id && input.id.trim() !== "" ? input.id : generateId();
  const quantity = Math.max(0, Math.floor(input.quantity));
  const reorderLevel = Math.max(0, Math.floor(input.reorderLevel));
  const minimumStock = Math.max(0, Math.floor(input.minimumStock));
  const maintainStockAt = Math.max(0, Math.floor(input.maintainStockAt));
  const status = computeStatus(quantity, reorderLevel);
  const item: InventoryItem = {
    id,
    name: input.name.trim(),
    category: input.category,
    quantity,
    location: input.location.trim(),
    reorderLevel,
    status,
    brand: input.brand.trim(),
    pricePerPiece: input.pricePerPiece,
    supplierId: input.supplierId.trim(),
    maintainStockAt,
    minimumStock,
  };
  const exists = inventory.some((i) => i.id === id);
  if (exists) throw new Error(`Item with id ${id} already exists`);

  inventory = [item, ...inventory];
  saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);

  return delay(item);
}

export async function updateInventoryItem(input: UpdateInventoryItemInput): Promise<InventoryItem> {
  const index = inventory.findIndex((i) => i.id === input.id);
  if (index === -1) throw new Error("Item not found");
  const prev = inventory[index];
  const quantity = input.quantity !== undefined ? Math.max(0, Math.floor(input.quantity)) : prev.quantity;
  const reorderLevel = input.reorderLevel !== undefined ? Math.max(0, Math.floor(input.reorderLevel)) : prev.reorderLevel;
  const minimumStock = input.minimumStock !== undefined ? Math.max(0, Math.floor(input.minimumStock)) : prev.minimumStock;
  const maintainStockAt = input.maintainStockAt !== undefined ? Math.max(0, Math.floor(input.maintainStockAt)) : prev.maintainStockAt;
  const next: InventoryItem = {
    ...prev,
    ...input,
    quantity,
    reorderLevel,
    minimumStock,
    maintainStockAt,
    status: computeStatus(quantity, reorderLevel),
  };

  inventory[index] = next;
  saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);

  return delay(next);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const index = inventory.findIndex((i) => i.id === id);
  if (index === -1) throw new Error("Item not found");
  const deletedItem = inventory[index];

  inventory.splice(index, 1);
  saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);

  await delay(undefined);
}

// Suppliers
export async function getSuppliers(): Promise<Supplier[]> {
  return delay([...suppliers]);
}

export async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  const id = input.id && input.id.trim() !== "" ? input.id : generateSupplierId();
  if (suppliers.some((s) => s.id === id)) throw new Error(`Supplier with id ${id} already exists`);
  const supplier: Supplier = {
    id,
    name: input.name.trim(),
    contact: input.contact.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    category: input.category.trim(),
    status: input.status ?? "Active",
  };

  suppliers = [supplier, ...suppliers];
  saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);

  return delay(supplier);
}

export async function updateSupplier(input: UpdateSupplierInput): Promise<Supplier> {
  const index = suppliers.findIndex((s) => s.id === input.id);
  if (index === -1) throw new Error("Supplier not found");
  const prev = suppliers[index];
  const next: Supplier = { ...prev, ...input } as Supplier;

  suppliers[index] = next;
  saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);

  return delay(next);
}

export async function deleteSupplier(id: string): Promise<void> {
  const index = suppliers.findIndex((s) => s.id === id);
  if (index === -1) throw new Error("Supplier not found");
  const deletedSupplier = suppliers[index];

  suppliers.splice(index, 1);
  saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);

  await delay(undefined);
}

// Orders and Shipments (read-only for now)
export async function getOrders(): Promise<Order[]> {
  return delay([...orders]);
}

export async function getShipments(): Promise<Shipment[]> {
  return delay([...shipments]);
}

export async function createOrder(input: Omit<Order, "id"> & { id?: string }): Promise<Order> {
  const id = input.id && input.id.trim() !== "" ? input.id : (() => {
    const maxNum = orders.map((o) => Number(o.id.replace(/[^0-9]/g, "")) || 0).reduce((a, b) => Math.max(a, b), 0);
    const next = maxNum + 1;
    return `ORD-${String(next).padStart(4, "0")}`;
  })();
  if (orders.some((o) => o.id === id)) throw new Error(`Order with id ${id} already exists`);
  const order: Order = { id, ...input } as Order;

  orders = [order, ...orders];
  saveToLocalStorage(STORAGE_KEYS.ORDERS, orders);

  return delay(order);
}

export async function updateOrder(input: Partial<Omit<Order, "id">> & { id: string }): Promise<Order> {
  const index = orders.findIndex((o) => o.id === input.id);
  if (index === -1) throw new Error("Order not found");
  const prev = orders[index];
  const next: Order = { ...prev, ...input } as Order;

  orders[index] = next;
  saveToLocalStorage(STORAGE_KEYS.ORDERS, orders);

  return delay(next);
}

export async function deleteOrder(id: string): Promise<void> {
  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) throw new Error("Order not found");
  const deletedOrder = orders[index];

  orders.splice(index, 1);
  saveToLocalStorage(STORAGE_KEYS.ORDERS, orders);

  await delay(undefined);
}

export async function createShipment(input: Omit<Shipment, "id"> & { id?: string }): Promise<Shipment> {
  const id = input.id && input.id.trim() !== "" ? input.id : (() => {
    const maxNum = shipments.map((s) => Number(s.id.replace(/[^0-9]/g, "")) || 0).reduce((a, b) => Math.max(a, b), 0);
    const next = maxNum + 1;
    return `SHIP-${String(next).padStart(4, "0")}`;
  })();
  if (shipments.some((s) => s.id === id)) throw new Error(`Shipment with id ${id} already exists`);
  const shipment: Shipment = { id, ...input } as Shipment;

  shipments = [shipment, ...shipments];
  saveToLocalStorage(STORAGE_KEYS.SHIPMENTS, shipments);

  return delay(shipment);
}

export async function updateShipment(input: Partial<Omit<Shipment, "id">> & { id: string }): Promise<Shipment> {
  const index = shipments.findIndex((s) => s.id === input.id);
  if (index === -1) throw new Error("Shipment not found");
  const prev = shipments[index];
  const next: Shipment = { ...prev, ...input } as Shipment;

  shipments[index] = next;
  saveToLocalStorage(STORAGE_KEYS.SHIPMENTS, shipments);

  return delay(next);
}

export async function deleteShipment(id: string): Promise<void> {
  const index = shipments.findIndex((s) => s.id === id);
  if (index === -1) throw new Error("Shipment not found");
  const deletedShipment = shipments[index];

  shipments.splice(index, 1);
  saveToLocalStorage(STORAGE_KEYS.SHIPMENTS, shipments);

  await delay(undefined);
}

// ============================================================================
// Bulk Operations
// ============================================================================

export interface BulkOperationResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  errors: string[];
}

// Inventory Bulk Operations
export async function bulkDeleteInventoryItems(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = inventory.findIndex((i) => i.id === id);
    if (index === -1) {
      errors.push(`Item ${id} not found`);
    } else {
      inventory.splice(index, 1);
      successCount++;
    }
  }

  saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

export async function bulkUpdateInventoryItems(
  ids: string[],
  updates: Partial<Omit<InventoryItem, "id" | "status">>
): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = inventory.findIndex((i) => i.id === id);
    if (index === -1) {
      errors.push(`Item ${id} not found`);
    } else {
      const prev = inventory[index];
      const quantity = updates.quantity !== undefined ? Math.max(0, Math.floor(updates.quantity)) : prev.quantity;
      const reorderLevel = updates.reorderLevel !== undefined ? Math.max(0, Math.floor(updates.reorderLevel)) : prev.reorderLevel;
      inventory[index] = {
        ...prev,
        ...updates,
        quantity,
        reorderLevel,
        status: computeStatus(quantity, reorderLevel),
      };
      successCount++;
    }
  }

  saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

// Orders Bulk Operations
export async function bulkDeleteOrders(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = orders.findIndex((o) => o.id === id);
    if (index === -1) {
      errors.push(`Order ${id} not found`);
    } else {
      orders.splice(index, 1);
      successCount++;
    }
  }

  saveToLocalStorage(STORAGE_KEYS.ORDERS, orders);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

export async function bulkUpdateOrderStatus(
  ids: string[],
  status: Order["status"]
): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = orders.findIndex((o) => o.id === id);
    if (index === -1) {
      errors.push(`Order ${id} not found`);
    } else {
      orders[index] = { ...orders[index], status };
      successCount++;
    }
  }

  saveToLocalStorage(STORAGE_KEYS.ORDERS, orders);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

// Shipments Bulk Operations
export async function bulkDeleteShipments(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = shipments.findIndex((s) => s.id === id);
    if (index === -1) {
      errors.push(`Shipment ${id} not found`);
    } else {
      shipments.splice(index, 1);
      successCount++;
    }
  }

  saveToLocalStorage(STORAGE_KEYS.SHIPMENTS, shipments);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

export async function bulkUpdateShipmentStatus(
  ids: string[],
  status: Shipment["status"]
): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = shipments.findIndex((s) => s.id === id);
    if (index === -1) {
      errors.push(`Shipment ${id} not found`);
    } else {
      shipments[index] = { ...shipments[index], status };
      successCount++;
    }
  }

  saveToLocalStorage(STORAGE_KEYS.SHIPMENTS, shipments);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

// Suppliers Bulk Operations
export async function bulkDeleteSuppliers(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = suppliers.findIndex((s) => s.id === id);
    if (index === -1) {
      errors.push(`Supplier ${id} not found`);
    } else {
      suppliers.splice(index, 1);
      successCount++;
    }
  }

  saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

export async function bulkUpdateSupplierStatus(
  ids: string[],
  status: Supplier["status"]
): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = suppliers.findIndex((s) => s.id === id);
    if (index === -1) {
      errors.push(`Supplier ${id} not found`);
    } else {
      suppliers[index] = { ...suppliers[index], status };
      successCount++;
    }
  }

  saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}
