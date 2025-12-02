import type {
  CreateInventoryItemInput,
  InventoryItem,
  UpdateInventoryItemInput,
  InventoryCategory,
  CategoryDefinition,
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  Order,
  Shipment,
  PurchaseOrder,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  POStatus,
  POLineItem,
} from "../types";

// ============================================================================
// LocalStorage Persistence Helpers
// ============================================================================

const STORAGE_KEYS = {
  INVENTORY: 'wms_inventory',
  SUPPLIERS: 'wms_suppliers',
  CUSTOMERS: 'wms_customers',
  ORDERS: 'wms_orders',
  SHIPMENTS: 'wms_shipments',
  PURCHASE_ORDERS: 'wms_purchase_orders',
  CATEGORIES: 'wms_categories',
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
  { id: "INV-001", name: "Laptop Computer", category: "Electronics", quantity: 145, location: "A-12", status: "In Stock", brand: "Dell", pricePerPiece: 899.99, supplierId: "SUP-001", quantityPurchased: 200, quantitySold: 55, reorderRequired: false, description: "15.6-inch display, Intel Core i7 processor, 16GB RAM, 512GB SSD. Perfect for business and professional use with long battery life and lightweight design." },
  { id: "INV-002", name: "Office Chair", category: "Furniture", quantity: 23, location: "B-08", status: "Low Stock", brand: "Herman Miller", pricePerPiece: 549.00, supplierId: "SUP-002", quantityPurchased: 100, quantitySold: 77, reorderRequired: true, description: "Ergonomic office chair with adjustable lumbar support, armrests, and seat height. Breathable mesh back for all-day comfort." },
  { id: "INV-003", name: "Standing Desk", category: "Furniture", quantity: 67, location: "B-05", status: "In Stock", brand: "Uplift", pricePerPiece: 799.00, supplierId: "SUP-002", quantityPurchased: 120, quantitySold: 53, reorderRequired: false, description: "Electric height-adjustable standing desk with memory presets. 60x30 inch bamboo top with cable management system." },
  { id: "INV-004", name: "Wireless Mouse", category: "Electronics", quantity: 8, location: "A-15", status: "Critical", brand: "Logitech", pricePerPiece: 29.99, supplierId: "SUP-003", quantityPurchased: 150, quantitySold: 142, reorderRequired: true, description: "Ergonomic wireless mouse with customizable buttons and long battery life. 2.4GHz wireless connection with USB receiver." },
  { id: "INV-005", name: "USB-C Cable", category: "Electronics", quantity: 234, location: "A-20", status: "In Stock", brand: "Anker", pricePerPiece: 12.99, supplierId: "SUP-001", quantityPurchased: 500, quantitySold: 266, reorderRequired: false, description: "Premium braided USB-C to USB-C cable, 6ft length. Supports fast charging up to 100W and data transfer speeds up to 480Mbps." },
  { id: "INV-006", name: "Monitor 27\"", category: "Electronics", quantity: 89, location: "A-10", status: "In Stock", brand: "LG", pricePerPiece: 349.99, supplierId: "SUP-003", quantityPurchased: 150, quantitySold: 61, reorderRequired: false, description: "27-inch 4K UHD IPS display with HDR10 support. USB-C connectivity with 65W power delivery. Ideal for creative professionals." },
  { id: "INV-007", name: "Keyboard Mechanical", category: "Electronics", quantity: 156, location: "A-14", status: "In Stock", brand: "Corsair", pricePerPiece: 129.99, supplierId: "SUP-001", quantityPurchased: 250, quantitySold: 94, reorderRequired: false, description: "Full-size mechanical keyboard with Cherry MX Brown switches. RGB backlighting with dedicated media controls and USB passthrough." },
  { id: "INV-008", name: "Filing Cabinet", category: "Furniture", quantity: 34, location: "B-03", status: "In Stock", brand: "Steelcase", pricePerPiece: 299.00, supplierId: "SUP-002", quantityPurchased: 60, quantitySold: 26, reorderRequired: false, description: "4-drawer vertical filing cabinet with full-extension drawers. Built-in lock for security. Holds letter and legal size documents." },
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  { id: "SUP-001", name: "TechSource LLC", contact: "John Smith", email: "john@techsource.com", phone: "+1 (555) 123-4567", category: "Electronics", status: "Active", country: "United States", city: "San Francisco", address: "123 Tech Blvd, Suite 100", purchases: 125000, payments: 100000, balance: 25000 },
  { id: "SUP-002", name: "FurniCraft Industries", contact: "Sarah Johnson", email: "sarah@furnicraft.com", phone: "+1 (555) 234-5678", category: "Furniture", status: "Active", country: "United States", city: "Grand Rapids", address: "456 Furniture Ave", purchases: 85000, payments: 85000, balance: 0 },
  { id: "SUP-003", name: "Global Electronics Co", contact: "Michael Chen", email: "michael@globalelec.com", phone: "+1 (555) 345-6789", category: "Electronics", status: "Active", country: "China", city: "Shenzhen", address: "789 Electronics Park, Building A", purchases: 250000, payments: 200000, balance: 50000 },
  { id: "SUP-004", name: "Metro Supplies Inc", contact: "Emily Davis", email: "emily@metrosupplies.com", phone: "+1 (555) 456-7890", category: "Office Supplies", status: "Inactive", country: "United States", city: "New York", address: "321 Office Tower, Floor 5", purchases: 45000, payments: 45000, balance: 0 },
  { id: "SUP-005", name: "Premium Parts Ltd", contact: "Robert Wilson", email: "robert@premiumparts.com", phone: "+1 (555) 567-8901", category: "Electronics", status: "Active", country: "United Kingdom", city: "London", address: "10 Premium Lane, Industrial Estate", purchases: 175000, payments: 150000, balance: 25000 },
];

const DEFAULT_CUSTOMERS: Customer[] = [
  { id: "CUS-001", name: "Acme Corp", contact: "Alice Johnson", email: "alice@acmecorp.com", phone: "+1 (555) 111-2222", category: "Technology", status: "Active", country: "United States", city: "San Francisco", address: "100 Market St, Suite 500", purchases: 45000, payments: 40000, balance: 5000 },
  { id: "CUS-002", name: "TechStart Inc", contact: "Bob Williams", email: "bob@techstart.io", phone: "+1 (555) 222-3333", category: "Startup", status: "Active", country: "United States", city: "Austin", address: "200 Innovation Blvd", purchases: 28000, payments: 28000, balance: 0 },
  { id: "CUS-003", name: "Global Solutions", contact: "Carol Martinez", email: "carol@globalsolutions.com", phone: "+1 (555) 333-4444", category: "Enterprise", status: "Active", country: "United Kingdom", city: "London", address: "50 Canary Wharf", purchases: 120000, payments: 100000, balance: 20000 },
  { id: "CUS-004", name: "Beta Systems", contact: "David Lee", email: "david@betasystems.net", phone: "+1 (555) 444-5555", category: "Technology", status: "Active", country: "Canada", city: "Toronto", address: "789 Bay Street", purchases: 65000, payments: 60000, balance: 5000 },
  { id: "CUS-005", name: "Metro Supplies", contact: "Eva Brown", email: "eva@metrosupplies.com", phone: "+1 (555) 555-6666", category: "Retail", status: "Inactive", country: "United States", city: "New York", address: "321 Fifth Avenue", purchases: 15000, payments: 15000, balance: 0 },
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

const DEFAULT_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: "PO-001",
    supplierId: "SUP-001",
    supplierName: "Tech Electronics Co",
    items: [
      { inventoryItemId: "INV-001", itemName: "Laptop Computer", quantity: 50, unitPrice: 899.99, totalPrice: 44999.50, quantityReceived: 50 },
      { inventoryItemId: "INV-007", itemName: "Keyboard Mechanical", quantity: 100, unitPrice: 129.99, totalPrice: 12999.00, quantityReceived: 100 },
    ],
    totalAmount: 57998.50,
    status: "Received",
    createdBy: "1",
    createdDate: "2025-10-01",
    approvedBy: "1",
    approvedDate: "2025-10-02",
    receivedDate: "2025-10-10",
    notes: "Q4 restock order",
    expectedDeliveryDate: "2025-10-10",
    actualCost: 57998.50,
  },
  {
    id: "PO-002",
    supplierId: "SUP-002",
    supplierName: "Furniture Plus",
    items: [
      { inventoryItemId: "INV-002", itemName: "Office Chair", quantity: 30, unitPrice: 549.00, totalPrice: 16470.00 },
      { inventoryItemId: "INV-003", itemName: "Standing Desk", quantity: 20, unitPrice: 799.00, totalPrice: 15980.00 },
    ],
    totalAmount: 32450.00,
    status: "Ordered",
    createdBy: "1",
    createdDate: "2025-10-15",
    approvedBy: "1",
    approvedDate: "2025-10-16",
    receivedDate: null,
    notes: "Office expansion order",
    expectedDeliveryDate: "2025-11-01",
  },
  {
    id: "PO-003",
    supplierId: "SUP-003",
    supplierName: "Office Supply Hub",
    items: [
      { inventoryItemId: "INV-004", itemName: "Wireless Mouse", quantity: 100, unitPrice: 29.99, totalPrice: 2999.00 },
    ],
    totalAmount: 2999.00,
    status: "Pending Approval",
    createdBy: "2",
    createdDate: "2025-10-20",
    approvedBy: null,
    approvedDate: null,
    receivedDate: null,
    notes: "Urgent restock for critical stock item",
    expectedDeliveryDate: "2025-10-30",
  },
  {
    id: "PO-004",
    supplierId: "SUP-001",
    supplierName: "Tech Electronics Co",
    items: [
      { inventoryItemId: "INV-006", itemName: "Monitor 27\"", quantity: 25, unitPrice: 349.99, totalPrice: 8749.75 },
    ],
    totalAmount: 8749.75,
    status: "Draft",
    createdBy: "1",
    createdDate: "2025-10-22",
    approvedBy: null,
    approvedDate: null,
    receivedDate: null,
    notes: "",
    expectedDeliveryDate: "2025-11-15",
  },
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
    const needsMigration = item.quantityPurchased === undefined ||
      item.quantitySold === undefined ||
      item.reorderRequired === undefined;

    if (needsMigration) {
      // Remove old fields that no longer exist
      const { reorderLevel, maintainStockAt, minimumStock, ...rest } = item;

      // Calculate new field values from old data or set reasonable defaults
      const quantityPurchased = item.quantityPurchased ?? Math.floor(item.quantity * 1.5);
      const quantitySold = item.quantitySold ?? Math.floor(quantityPurchased - item.quantity);
      // Item needs reorder if quantity is low (using old logic if available)
      const reorderRequired = item.reorderRequired ?? (item.quantity <= (item.minimumStock ?? item.reorderLevel ?? 20));

      return {
        ...rest,
        brand: item.brand || "Unknown",
        pricePerPiece: item.pricePerPiece ?? 0,
        supplierId: item.supplierId || "SUP-001",
        quantityPurchased,
        quantitySold,
        reorderRequired,
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

// Migration function for purchase orders to ensure items array exists
function migratePurchaseOrders(purchaseOrdersData: PurchaseOrder[]): PurchaseOrder[] {
  return purchaseOrdersData.map(po => ({
    ...po,
    items: po.items ?? [],
    totalAmount: po.totalAmount ?? 0,
    status: po.status ?? "Draft",
    createdDate: po.createdDate ?? new Date().toISOString().split('T')[0],
  }));
}

// Migration for suppliers - add new fields if they don't exist
function migrateSuppliers(items: any[]): Supplier[] {
  return items.map((item) => ({
    ...item,
    country: item.country ?? "",
    city: item.city ?? "",
    address: item.address ?? "",
    purchases: item.purchases ?? 0,
    payments: item.payments ?? 0,
    balance: item.balance ?? (item.purchases ?? 0) - (item.payments ?? 0),
  }));
}

// Migration for customers - add new fields if they don't exist
function migrateCustomers(items: any[]): Customer[] {
  return items.map((item) => ({
    ...item,
    country: item.country ?? "",
    city: item.city ?? "",
    address: item.address ?? "",
    purchases: item.purchases ?? 0,
    payments: item.payments ?? 0,
    balance: item.balance ?? (item.purchases ?? 0) - (item.payments ?? 0),
  }));
}

// Default categories with subcategories
const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    name: "Electronics",
    subcategories: ["Phones", "Laptops", "Tablets", "Accessories", "Monitors"],
  },
  {
    name: "Furniture",
    subcategories: ["Desks", "Chairs", "Cabinets", "Shelving"],
  },
  {
    name: "Clothing",
    subcategories: ["Shirts", "Pants", "Shoes", "Accessories"],
  },
  {
    name: "Food",
    subcategories: ["Beverages", "Snacks", "Canned Goods", "Fresh Produce"],
  },
];

let inventory: InventoryItem[] = migrateInventoryItems(loadFromLocalStorage(STORAGE_KEYS.INVENTORY, DEFAULT_INVENTORY));
let suppliers: Supplier[] = migrateSuppliers(loadFromLocalStorage(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS));
let customers: Customer[] = migrateCustomers(loadFromLocalStorage(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS));
let orders: Order[] = migrateOrdersCurrency(loadFromLocalStorage(STORAGE_KEYS.ORDERS, DEFAULT_ORDERS));
let shipments: Shipment[] = loadFromLocalStorage(STORAGE_KEYS.SHIPMENTS, DEFAULT_SHIPMENTS);
let purchaseOrders: PurchaseOrder[] = migratePurchaseOrders(loadFromLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, DEFAULT_PURCHASE_ORDERS));
let categories: CategoryDefinition[] = loadFromLocalStorage(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);

// Save migrated data back to localStorage
saveToLocalStorage(STORAGE_KEYS.ORDERS, orders);
saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);
saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);
saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);
saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);
saveToLocalStorage(STORAGE_KEYS.CATEGORIES, categories);

// ============================================================================
// Helper Functions
// ============================================================================

function computeStatus(quantity: number, reorderRequired: boolean): InventoryItem["status"] {
  if (quantity <= 0) return "Critical";
  if (reorderRequired) return "Low Stock";
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

function generateCustomerId(): string {
  const maxNum = customers
    .map((c) => Number(c.id.replace(/[^0-9]/g, "")) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  const next = maxNum + 1;
  return `CUS-${String(next).padStart(3, "0")}`;
}

function generatePurchaseOrderId(): string {
  const maxNum = purchaseOrders
    .map((po) => Number(po.id.replace(/[^0-9]/g, "")) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  const next = maxNum + 1;
  return `PO-${String(next).padStart(3, "0")}`;
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
  const quantityPurchased = Math.max(0, Math.floor(input.quantityPurchased));
  const quantitySold = Math.max(0, Math.floor(input.quantitySold));
  const reorderRequired = input.reorderRequired;
  const status = computeStatus(quantity, reorderRequired);
  const item: InventoryItem = {
    id,
    name: input.name.trim(),
    category: input.category,
    quantity,
    location: input.location.trim(),
    status,
    brand: input.brand.trim(),
    pricePerPiece: input.pricePerPiece,
    supplierId: input.supplierId.trim(),
    quantityPurchased,
    quantitySold,
    reorderRequired,
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
  const quantityPurchased = input.quantityPurchased !== undefined ? Math.max(0, Math.floor(input.quantityPurchased)) : prev.quantityPurchased;
  const quantitySold = input.quantitySold !== undefined ? Math.max(0, Math.floor(input.quantitySold)) : prev.quantitySold;
  const reorderRequired = input.reorderRequired !== undefined ? input.reorderRequired : prev.reorderRequired;
  const next: InventoryItem = {
    ...prev,
    ...input,
    quantity,
    quantityPurchased,
    quantitySold,
    reorderRequired,
    status: computeStatus(quantity, reorderRequired),
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

// Inventory Archive Functions
export async function archiveInventoryItem(id: string): Promise<InventoryItem> {
  const index = inventory.findIndex((i) => i.id === id);
  if (index === -1) throw new Error("Item not found");

  inventory[index] = {
    ...inventory[index],
    archived: true,
    archivedAt: new Date().toISOString(),
  };
  saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);

  return delay(inventory[index]);
}

export async function restoreInventoryItem(id: string): Promise<InventoryItem> {
  const index = inventory.findIndex((i) => i.id === id);
  if (index === -1) throw new Error("Item not found");

  inventory[index] = {
    ...inventory[index],
    archived: false,
    archivedAt: undefined,
  };
  saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);

  return delay(inventory[index]);
}

export async function permanentlyDeleteInventoryItem(id: string): Promise<void> {
  const index = inventory.findIndex((i) => i.id === id);
  if (index === -1) throw new Error("Item not found");

  inventory.splice(index, 1);
  saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);

  await delay(undefined);
}

export async function bulkArchiveInventoryItems(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = inventory.findIndex((i) => i.id === id);
    if (index === -1) {
      errors.push(`Item ${id} not found`);
      continue;
    }
    inventory[index] = {
      ...inventory[index],
      archived: true,
      archivedAt: new Date().toISOString(),
    };
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);

  return delay({
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function bulkRestoreInventoryItems(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = inventory.findIndex((i) => i.id === id);
    if (index === -1) {
      errors.push(`Item ${id} not found`);
      continue;
    }
    inventory[index] = {
      ...inventory[index],
      archived: false,
      archivedAt: undefined,
    };
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);

  return delay({
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function bulkPermanentlyDeleteInventoryItems(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = inventory.findIndex((i) => i.id === id);
    if (index === -1) {
      errors.push(`Item ${id} not found`);
      continue;
    }
    inventory.splice(index, 1);
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);

  return delay({
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// Suppliers
export async function getSuppliers(): Promise<Supplier[]> {
  return delay([...suppliers]);
}

export async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  const id = input.id && input.id.trim() !== "" ? input.id : generateSupplierId();
  if (suppliers.some((s) => s.id === id)) throw new Error(`Supplier with id ${id} already exists`);

  const purchases = input.purchases ?? 0;
  const payments = input.payments ?? 0;
  const balance = purchases - payments;

  const supplier: Supplier = {
    id,
    name: input.name.trim(),
    contact: input.contact.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    category: input.category.trim(),
    status: input.status ?? "Active",
    country: input.country?.trim() ?? "",
    city: input.city?.trim() ?? "",
    address: input.address?.trim() ?? "",
    purchases,
    payments,
    balance,
  };

  suppliers = [supplier, ...suppliers];
  saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);

  return delay(supplier);
}

export async function updateSupplier(input: UpdateSupplierInput): Promise<Supplier> {
  const index = suppliers.findIndex((s) => s.id === input.id);
  if (index === -1) throw new Error("Supplier not found");
  const prev = suppliers[index];

  // Calculate new purchases, payments, and balance
  const purchases = input.purchases !== undefined ? input.purchases : prev.purchases;
  const payments = input.payments !== undefined ? input.payments : prev.payments;
  const balance = purchases - payments;

  const next: Supplier = {
    ...prev,
    ...input,
    purchases,
    payments,
    balance,
  };

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

// Supplier Archive Functions
export async function archiveSupplier(id: string): Promise<Supplier> {
  const index = suppliers.findIndex((s) => s.id === id);
  if (index === -1) throw new Error("Supplier not found");

  suppliers[index] = {
    ...suppliers[index],
    archived: true,
    archivedAt: new Date().toISOString(),
  };
  saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);

  return delay(suppliers[index]);
}

export async function restoreSupplier(id: string): Promise<Supplier> {
  const index = suppliers.findIndex((s) => s.id === id);
  if (index === -1) throw new Error("Supplier not found");

  suppliers[index] = {
    ...suppliers[index],
    archived: false,
    archivedAt: undefined,
  };
  saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);

  return delay(suppliers[index]);
}

export async function permanentlyDeleteSupplier(id: string): Promise<void> {
  const index = suppliers.findIndex((s) => s.id === id);
  if (index === -1) throw new Error("Supplier not found");

  suppliers.splice(index, 1);
  saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);

  await delay(undefined);
}

export async function bulkArchiveSuppliers(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = suppliers.findIndex((s) => s.id === id);
    if (index === -1) {
      errors.push(`Supplier ${id} not found`);
      continue;
    }
    suppliers[index] = {
      ...suppliers[index],
      archived: true,
      archivedAt: new Date().toISOString(),
    };
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);

  return delay({
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function bulkRestoreSuppliers(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = suppliers.findIndex((s) => s.id === id);
    if (index === -1) {
      errors.push(`Supplier ${id} not found`);
      continue;
    }
    suppliers[index] = {
      ...suppliers[index],
      archived: false,
      archivedAt: undefined,
    };
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);

  return delay({
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function bulkPermanentlyDeleteSuppliers(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = suppliers.findIndex((s) => s.id === id);
    if (index === -1) {
      errors.push(`Supplier ${id} not found`);
      continue;
    }
    suppliers.splice(index, 1);
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);

  return delay({
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// ============================================================================
// Customer CRUD Operations
// ============================================================================

export async function getCustomers(): Promise<Customer[]> {
  return delay([...customers]);
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const id = input.id && input.id.trim() !== "" ? input.id : generateCustomerId();
  const purchases = input.purchases ?? 0;
  const payments = input.payments ?? 0;
  const balance = purchases - payments;

  const newCustomer: Customer = {
    id,
    name: input.name,
    contact: input.contact,
    email: input.email,
    phone: input.phone,
    category: input.category,
    status: input.status ?? "Active",
    country: input.country ?? "",
    city: input.city ?? "",
    address: input.address ?? "",
    purchases,
    payments,
    balance,
  };
  customers.push(newCustomer);
  saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);
  return delay(newCustomer);
}

export async function updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
  const index = customers.findIndex((c) => c.id === input.id);
  if (index === -1) throw new Error("Customer not found");

  const existing = customers[index];
  const purchases = input.purchases ?? existing.purchases;
  const payments = input.payments ?? existing.payments;
  const balance = purchases - payments;

  const updated: Customer = {
    ...existing,
    ...input,
    purchases,
    payments,
    balance,
  };
  customers[index] = updated;
  saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);
  return delay(updated);
}

export async function deleteCustomer(id: string): Promise<void> {
  const index = customers.findIndex((c) => c.id === id);
  if (index === -1) throw new Error("Customer not found");
  customers.splice(index, 1);
  saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);
  return delay(undefined);
}

export async function archiveCustomer(id: string): Promise<Customer> {
  const index = customers.findIndex((c) => c.id === id);
  if (index === -1) throw new Error("Customer not found");

  const updated: Customer = {
    ...customers[index],
    archived: true,
    archivedAt: new Date().toISOString(),
  };
  customers[index] = updated;
  saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);
  return delay(updated);
}

export async function restoreCustomer(id: string): Promise<Customer> {
  const index = customers.findIndex((c) => c.id === id);
  if (index === -1) throw new Error("Customer not found");

  const updated: Customer = {
    ...customers[index],
    archived: false,
    archivedAt: undefined,
  };
  customers[index] = updated;
  saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);
  return delay(updated);
}

export async function permanentlyDeleteCustomer(id: string): Promise<void> {
  const index = customers.findIndex((c) => c.id === id);
  if (index === -1) throw new Error("Customer not found");
  customers.splice(index, 1);
  saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);
  return delay(undefined);
}

export async function bulkDeleteCustomers(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) {
      errors.push(`Customer ${id} not found`);
      continue;
    }
    customers.splice(index, 1);
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);

  return delay({
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function bulkArchiveCustomers(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) {
      errors.push(`Customer ${id} not found`);
      continue;
    }
    customers[index] = {
      ...customers[index],
      archived: true,
      archivedAt: new Date().toISOString(),
    };
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);

  return delay({
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function bulkRestoreCustomers(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) {
      errors.push(`Customer ${id} not found`);
      continue;
    }
    customers[index] = {
      ...customers[index],
      archived: false,
      archivedAt: undefined,
    };
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);

  return delay({
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function bulkPermanentlyDeleteCustomers(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) {
      errors.push(`Customer ${id} not found`);
      continue;
    }
    customers.splice(index, 1);
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);

  return delay({
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function bulkUpdateCustomerStatus(ids: string[], status: "Active" | "Inactive"): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) {
      errors.push(`Customer ${id} not found`);
      continue;
    }
    customers[index] = { ...customers[index], status };
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);

  return delay({
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
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
      const maintainStockAt = updates.maintainStockAt !== undefined ? Math.max(0, Math.floor(updates.maintainStockAt)) : prev.maintainStockAt;
      inventory[index] = {
        ...prev,
        ...updates,
        quantity,
        reorderLevel,
        status: computeStatus(quantity, reorderLevel, maintainStockAt),
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

// ============================================================================
// Purchase Orders CRUD Operations
// ============================================================================

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  return delay([...purchaseOrders]);
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const po = purchaseOrders.find((p) => p.id === id);
  return delay(po ?? null);
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
  const id = input.id && input.id.trim() !== "" ? input.id : generatePurchaseOrderId();
  if (purchaseOrders.some((po) => po.id === id)) {
    throw new Error(`Purchase Order with id ${id} already exists`);
  }

  const totalAmount = input.items.reduce((sum, item) => sum + item.totalPrice, 0);

  const po: PurchaseOrder = {
    id,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    items: input.items.map(item => ({ ...item, quantityReceived: 0 })),
    totalAmount,
    status: "Draft",
    createdBy: input.createdBy,
    createdDate: new Date().toISOString().split('T')[0],
    approvedBy: null,
    approvedDate: null,
    receivedDate: null,
    notes: input.notes ?? "",
    expectedDeliveryDate: input.expectedDeliveryDate,
  };

  purchaseOrders = [po, ...purchaseOrders];
  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  return delay(po);
}

export async function updatePurchaseOrder(input: UpdatePurchaseOrderInput): Promise<PurchaseOrder> {
  const index = purchaseOrders.findIndex((po) => po.id === input.id);
  if (index === -1) throw new Error("Purchase Order not found");

  const prev = purchaseOrders[index];
  const next: PurchaseOrder = { ...prev, ...input } as PurchaseOrder;

  // Recalculate total if items changed
  if (input.items) {
    next.totalAmount = input.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  purchaseOrders[index] = next;
  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  return delay(next);
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  const index = purchaseOrders.findIndex((po) => po.id === id);
  if (index === -1) throw new Error("Purchase Order not found");

  const po = purchaseOrders[index];
  // Only allow deletion of Draft or Cancelled POs
  if (!["Draft", "Cancelled", "Rejected"].includes(po.status)) {
    throw new Error("Can only delete Draft, Cancelled, or Rejected purchase orders");
  }

  purchaseOrders.splice(index, 1);
  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  await delay(undefined);
}

// ============================================================================
// Purchase Order Approval Workflow
// ============================================================================

export async function submitPOForApproval(id: string): Promise<PurchaseOrder> {
  const index = purchaseOrders.findIndex((po) => po.id === id);
  if (index === -1) throw new Error("Purchase Order not found");

  const po = purchaseOrders[index];
  if (po.status !== "Draft") {
    throw new Error("Only Draft purchase orders can be submitted for approval");
  }

  purchaseOrders[index] = { ...po, status: "Pending Approval" };
  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  return delay(purchaseOrders[index]);
}

export async function approvePO(id: string, approverId: string): Promise<PurchaseOrder> {
  const index = purchaseOrders.findIndex((po) => po.id === id);
  if (index === -1) throw new Error("Purchase Order not found");

  const po = purchaseOrders[index];
  if (po.status !== "Pending Approval") {
    throw new Error("Only Pending Approval purchase orders can be approved");
  }

  purchaseOrders[index] = {
    ...po,
    status: "Approved",
    approvedBy: approverId,
    approvedDate: new Date().toISOString().split('T')[0],
  };
  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  return delay(purchaseOrders[index]);
}

export async function rejectPO(id: string, approverId: string): Promise<PurchaseOrder> {
  const index = purchaseOrders.findIndex((po) => po.id === id);
  if (index === -1) throw new Error("Purchase Order not found");

  const po = purchaseOrders[index];
  if (po.status !== "Pending Approval") {
    throw new Error("Only Pending Approval purchase orders can be rejected");
  }

  purchaseOrders[index] = {
    ...po,
    status: "Rejected",
    approvedBy: approverId,
    approvedDate: new Date().toISOString().split('T')[0],
  };
  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  return delay(purchaseOrders[index]);
}

export async function markPOAsOrdered(id: string): Promise<PurchaseOrder> {
  const index = purchaseOrders.findIndex((po) => po.id === id);
  if (index === -1) throw new Error("Purchase Order not found");

  const po = purchaseOrders[index];
  if (po.status !== "Approved") {
    throw new Error("Only Approved purchase orders can be marked as ordered");
  }

  purchaseOrders[index] = { ...po, status: "Ordered" };
  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  return delay(purchaseOrders[index]);
}

export async function cancelPO(id: string): Promise<PurchaseOrder> {
  const index = purchaseOrders.findIndex((po) => po.id === id);
  if (index === -1) throw new Error("Purchase Order not found");

  const po = purchaseOrders[index];
  if (["Received", "Cancelled"].includes(po.status)) {
    throw new Error("Cannot cancel received or already cancelled purchase orders");
  }

  purchaseOrders[index] = { ...po, status: "Cancelled" };
  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  return delay(purchaseOrders[index]);
}

// ============================================================================
// Receive Purchase Order & Inventory Update
// ============================================================================

export interface ReceiveItem {
  inventoryItemId: string;
  quantityReceived: number;
}

export interface ReceivePOResult {
  purchaseOrder: PurchaseOrder;
  inventoryUpdates: { itemId: string; itemName: string; previousQty: number; newQty: number }[];
}

export async function receivePurchaseOrder(
  id: string,
  receivedItems: ReceiveItem[],
  actualCost?: number
): Promise<ReceivePOResult> {
  const poIndex = purchaseOrders.findIndex((po) => po.id === id);
  if (poIndex === -1) throw new Error("Purchase Order not found");

  const po = purchaseOrders[poIndex];
  if (!["Ordered", "Partially Received"].includes(po.status)) {
    throw new Error("Can only receive items for Ordered or Partially Received purchase orders");
  }

  const inventoryUpdates: { itemId: string; itemName: string; previousQty: number; newQty: number }[] = [];

  // Update PO items with received quantities
  const updatedItems = po.items.map((item) => {
    const receivedItem = receivedItems.find((r) => r.inventoryItemId === item.inventoryItemId);
    if (!receivedItem) return item;

    const previousReceived = item.quantityReceived ?? 0;
    const newReceived = previousReceived + receivedItem.quantityReceived;

    // Validate received quantity
    if (newReceived > item.quantity) {
      throw new Error(`Cannot receive more than ordered quantity for ${item.itemName}`);
    }

    // Update inventory
    const invIndex = inventory.findIndex((i) => i.id === item.inventoryItemId);
    if (invIndex !== -1) {
      const previousQty = inventory[invIndex].quantity;
      const newQty = previousQty + receivedItem.quantityReceived;

      inventory[invIndex] = {
        ...inventory[invIndex],
        quantity: newQty,
        status: computeStatus(newQty, inventory[invIndex].reorderLevel, inventory[invIndex].maintainStockAt),
      };

      inventoryUpdates.push({
        itemId: item.inventoryItemId,
        itemName: item.itemName,
        previousQty,
        newQty,
      });
    }

    return { ...item, quantityReceived: newReceived };
  });

  // Determine if all items are fully received
  const allReceived = updatedItems.every((item) => (item.quantityReceived ?? 0) >= item.quantity);
  const anyReceived = updatedItems.some((item) => (item.quantityReceived ?? 0) > 0);

  let newStatus: POStatus = po.status;
  let receivedDate = po.receivedDate;

  if (allReceived) {
    newStatus = "Received";
    receivedDate = new Date().toISOString().split('T')[0];
  } else if (anyReceived) {
    newStatus = "Partially Received";
  }

  purchaseOrders[poIndex] = {
    ...po,
    items: updatedItems,
    status: newStatus,
    receivedDate,
    actualCost: actualCost ?? po.actualCost,
  };

  // Save both to localStorage
  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);
  saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);

  return delay({
    purchaseOrder: purchaseOrders[poIndex],
    inventoryUpdates,
  });
}

// ============================================================================
// Purchase Order Archive/Restore Operations
// ============================================================================

export async function archivePurchaseOrder(id: string): Promise<PurchaseOrder> {
  const index = purchaseOrders.findIndex((po) => po.id === id);
  if (index === -1) throw new Error("Purchase Order not found");

  purchaseOrders[index] = {
    ...purchaseOrders[index],
    archived: true,
    archivedAt: new Date().toISOString(),
  };
  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  return delay(purchaseOrders[index]);
}

export async function restorePurchaseOrder(id: string): Promise<PurchaseOrder> {
  const index = purchaseOrders.findIndex((po) => po.id === id);
  if (index === -1) throw new Error("Purchase Order not found");

  purchaseOrders[index] = {
    ...purchaseOrders[index],
    archived: false,
    archivedAt: undefined,
  };
  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  return delay(purchaseOrders[index]);
}

export async function permanentlyDeletePurchaseOrder(id: string): Promise<void> {
  const index = purchaseOrders.findIndex((po) => po.id === id);
  if (index === -1) throw new Error("Purchase Order not found");

  purchaseOrders.splice(index, 1);
  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  await delay(undefined);
}

// ============================================================================
// Purchase Order Bulk Operations
// ============================================================================

export async function bulkDeletePurchaseOrders(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = purchaseOrders.findIndex((po) => po.id === id);
    if (index === -1) {
      errors.push(`PO ${id} not found`);
    } else {
      const po = purchaseOrders[index];
      if (!["Draft", "Cancelled", "Rejected"].includes(po.status)) {
        errors.push(`PO ${id}: Can only delete Draft, Cancelled, or Rejected orders`);
      } else {
        purchaseOrders.splice(index, 1);
        successCount++;
      }
    }
  }

  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

export async function bulkArchivePurchaseOrders(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = purchaseOrders.findIndex((po) => po.id === id);
    if (index === -1) {
      errors.push(`PO ${id} not found`);
    } else {
      purchaseOrders[index] = {
        ...purchaseOrders[index],
        archived: true,
        archivedAt: new Date().toISOString(),
      };
      successCount++;
    }
  }

  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

export async function bulkRestorePurchaseOrders(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = purchaseOrders.findIndex((po) => po.id === id);
    if (index === -1) {
      errors.push(`PO ${id} not found`);
    } else {
      purchaseOrders[index] = {
        ...purchaseOrders[index],
        archived: false,
        archivedAt: undefined,
      };
      successCount++;
    }
  }

  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

export async function bulkPermanentlyDeletePurchaseOrders(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = purchaseOrders.findIndex((po) => po.id === id);
    if (index === -1) {
      errors.push(`PO ${id} not found`);
    } else {
      purchaseOrders.splice(index, 1);
      successCount++;
    }
  }

  saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

// ============================================================================
// Purchase Order Statistics
// ============================================================================

export async function getPurchaseOrderStats(): Promise<{
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  ordered: number;
  partiallyReceived: number;
  received: number;
  cancelled: number;
  rejected: number;
  totalValue: number;
  pendingValue: number;
}> {
  const stats = {
    total: purchaseOrders.length,
    draft: 0,
    pendingApproval: 0,
    approved: 0,
    ordered: 0,
    partiallyReceived: 0,
    received: 0,
    cancelled: 0,
    rejected: 0,
    totalValue: 0,
    pendingValue: 0,
  };

  purchaseOrders.forEach((po) => {
    stats.totalValue += po.totalAmount;

    switch (po.status) {
      case "Draft": stats.draft++; break;
      case "Pending Approval":
        stats.pendingApproval++;
        stats.pendingValue += po.totalAmount;
        break;
      case "Approved":
        stats.approved++;
        stats.pendingValue += po.totalAmount;
        break;
      case "Ordered":
        stats.ordered++;
        stats.pendingValue += po.totalAmount;
        break;
      case "Partially Received": stats.partiallyReceived++; break;
      case "Received": stats.received++; break;
      case "Cancelled": stats.cancelled++; break;
      case "Rejected": stats.rejected++; break;
    }
  });

  return delay(stats);
}

// ============================================================================
// Category Management
// ============================================================================

export async function getCategories(): Promise<CategoryDefinition[]> {
  return delay([...categories]);
}

export async function addCategory(name: string): Promise<CategoryDefinition> {
  const existing = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    throw new Error(`Category "${name}" already exists`);
  }
  const newCategory: CategoryDefinition = {
    name,
    subcategories: [],
  };
  categories = [...categories, newCategory];
  saveToLocalStorage(STORAGE_KEYS.CATEGORIES, categories);
  return delay(newCategory);
}

export async function addSubcategory(categoryName: string, subcategoryName: string): Promise<CategoryDefinition> {
  const categoryIndex = categories.findIndex(c => c.name === categoryName);
  if (categoryIndex === -1) {
    throw new Error(`Category "${categoryName}" not found`);
  }

  const category = categories[categoryIndex];
  if (category.subcategories.some(s => s.toLowerCase() === subcategoryName.toLowerCase())) {
    throw new Error(`Subcategory "${subcategoryName}" already exists in "${categoryName}"`);
  }

  const updatedCategory: CategoryDefinition = {
    ...category,
    subcategories: [...category.subcategories, subcategoryName],
  };

  categories = [
    ...categories.slice(0, categoryIndex),
    updatedCategory,
    ...categories.slice(categoryIndex + 1),
  ];

  saveToLocalStorage(STORAGE_KEYS.CATEGORIES, categories);
  return delay(updatedCategory);
}

export async function deleteCategory(name: string): Promise<void> {
  const index = categories.findIndex(c => c.name === name);
  if (index === -1) {
    throw new Error(`Category "${name}" not found`);
  }
  categories = categories.filter(c => c.name !== name);
  saveToLocalStorage(STORAGE_KEYS.CATEGORIES, categories);
  return delay(undefined);
}

export async function deleteSubcategory(categoryName: string, subcategoryName: string): Promise<CategoryDefinition> {
  const categoryIndex = categories.findIndex(c => c.name === categoryName);
  if (categoryIndex === -1) {
    throw new Error(`Category "${categoryName}" not found`);
  }

  const category = categories[categoryIndex];
  const updatedCategory: CategoryDefinition = {
    ...category,
    subcategories: category.subcategories.filter(s => s !== subcategoryName),
  };

  categories = [
    ...categories.slice(0, categoryIndex),
    updatedCategory,
    ...categories.slice(categoryIndex + 1),
  ];

  saveToLocalStorage(STORAGE_KEYS.CATEGORIES, categories);
  return delay(updatedCategory);
}
