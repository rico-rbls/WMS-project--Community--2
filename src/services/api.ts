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
  SalesOrder,
  CreateSalesOrderInput,
  UpdateSalesOrderInput,
  ReceiptStatus,
  SOLineItem,
  CashBankTransaction,
  CreateCashBankTransactionInput,
  UpdateCashBankTransactionInput,
  PaymentMode,
  PaymentTransaction,
  CreatePaymentTransactionInput,
  UpdatePaymentTransactionInput,
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
  SALES_ORDERS: 'wms_sales_orders',
  CASH_BANK: 'wms_cash_bank',
  PAYMENTS: 'wms_payments',
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
    poDate: "2025-10-01",
    supplierId: "SUP-001",
    supplierName: "TechSource LLC",
    supplierCountry: "United States",
    supplierCity: "San Francisco",
    billNumber: "INV-2025-0142",
    items: [
      { inventoryItemId: "INV-001", itemName: "Laptop Computer", quantity: 50, unitPrice: 899.99, totalPrice: 44999.50, quantityReceived: 50 },
      { inventoryItemId: "INV-007", itemName: "Keyboard Mechanical", quantity: 100, unitPrice: 129.99, totalPrice: 12999.00, quantityReceived: 100 },
    ],
    totalAmount: 57998.50,
    totalPaid: 57998.50,
    poBalance: 0,
    status: "Received",
    shippingStatus: "Delivered",
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
    poDate: "2025-10-15",
    supplierId: "SUP-002",
    supplierName: "FurniCraft Industries",
    supplierCountry: "United States",
    supplierCity: "Grand Rapids",
    billNumber: "FC-INV-4521",
    items: [
      { inventoryItemId: "INV-002", itemName: "Office Chair", quantity: 30, unitPrice: 549.00, totalPrice: 16470.00 },
      { inventoryItemId: "INV-003", itemName: "Standing Desk", quantity: 20, unitPrice: 799.00, totalPrice: 15980.00 },
    ],
    totalAmount: 32450.00,
    totalPaid: 16225.00,
    poBalance: 16225.00,
    status: "Ordered",
    shippingStatus: "In Transit",
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
    poDate: "2025-10-20",
    supplierId: "SUP-003",
    supplierName: "Global Gadgets",
    supplierCountry: "Philippines",
    supplierCity: "Makati",
    billNumber: "",
    items: [
      { inventoryItemId: "INV-004", itemName: "Wireless Mouse", quantity: 100, unitPrice: 29.99, totalPrice: 2999.00 },
    ],
    totalAmount: 2999.00,
    totalPaid: 0,
    poBalance: 2999.00,
    status: "Pending Approval",
    shippingStatus: "Pending",
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
    poDate: "2025-10-22",
    supplierId: "SUP-001",
    supplierName: "TechSource LLC",
    supplierCountry: "United States",
    supplierCity: "San Francisco",
    billNumber: "",
    items: [
      { inventoryItemId: "INV-006", itemName: "Monitor 27\"", quantity: 25, unitPrice: 349.99, totalPrice: 8749.75 },
    ],
    totalAmount: 8749.75,
    totalPaid: 0,
    poBalance: 8749.75,
    status: "Draft",
    shippingStatus: "Pending",
    createdBy: "1",
    createdDate: "2025-10-22",
    approvedBy: null,
    approvedDate: null,
    receivedDate: null,
    notes: "",
    expectedDeliveryDate: "2025-11-15",
  },
  {
    id: "PO-005",
    poDate: "2025-11-01",
    supplierId: "SUP-002",
    supplierName: "FurniCraft Industries",
    supplierCountry: "United States",
    supplierCity: "Grand Rapids",
    billNumber: "FC-INV-4590",
    items: [
      { inventoryItemId: "INV-008", itemName: "Filing Cabinet", quantity: 15, unitPrice: 299.00, totalPrice: 4485.00 },
    ],
    totalAmount: 4485.00,
    totalPaid: 4485.00,
    poBalance: 0,
    status: "Approved",
    shippingStatus: "Processing",
    createdBy: "1",
    createdDate: "2025-11-01",
    approvedBy: "1",
    approvedDate: "2025-11-02",
    receivedDate: null,
    notes: "Additional filing cabinets for archive room",
    expectedDeliveryDate: "2025-11-20",
  },
];

const DEFAULT_SALES_ORDERS: SalesOrder[] = [
  {
    id: "SO-001",
    soDate: "2025-10-05",
    customerId: "CUS-001",
    customerName: "Acme Corp",
    customerCountry: "United States",
    customerCity: "San Francisco",
    invoiceNumber: "INV-2025-0501",
    items: [
      { inventoryItemId: "INV-001", itemName: "Laptop Computer", quantity: 10, unitPrice: 1299.99, totalPrice: 12999.90, quantityShipped: 10 },
      { inventoryItemId: "INV-007", itemName: "Keyboard Mechanical", quantity: 10, unitPrice: 169.99, totalPrice: 1699.90, quantityShipped: 10 },
    ],
    totalAmount: 14699.80,
    totalReceived: 14699.80,
    soBalance: 0,
    receiptStatus: "Paid",
    shippingStatus: "Delivered",
    createdBy: "1",
    createdDate: "2025-10-05",
    notes: "Corporate bulk order - priority customer",
    expectedDeliveryDate: "2025-10-12",
  },
  {
    id: "SO-002",
    soDate: "2025-10-18",
    customerId: "CUS-003",
    customerName: "Global Solutions",
    customerCountry: "United Kingdom",
    customerCity: "London",
    invoiceNumber: "INV-2025-0502",
    items: [
      { inventoryItemId: "INV-006", itemName: "Monitor 27\"", quantity: 20, unitPrice: 449.99, totalPrice: 8999.80 },
      { inventoryItemId: "INV-003", itemName: "Standing Desk", quantity: 15, unitPrice: 999.00, totalPrice: 14985.00 },
    ],
    totalAmount: 23984.80,
    totalReceived: 12000.00,
    soBalance: 11984.80,
    receiptStatus: "Partially Paid",
    shippingStatus: "In Transit",
    createdBy: "1",
    createdDate: "2025-10-18",
    notes: "Office expansion project - Phase 1",
    expectedDeliveryDate: "2025-11-01",
  },
  {
    id: "SO-003",
    soDate: "2025-10-25",
    customerId: "CUS-002",
    customerName: "TechStart Inc",
    customerCountry: "United States",
    customerCity: "Austin",
    invoiceNumber: "INV-2025-0503",
    items: [
      { inventoryItemId: "INV-004", itemName: "Wireless Mouse", quantity: 25, unitPrice: 39.99, totalPrice: 999.75 },
      { inventoryItemId: "INV-005", itemName: "USB-C Cable", quantity: 50, unitPrice: 19.99, totalPrice: 999.50 },
    ],
    totalAmount: 1999.25,
    totalReceived: 0,
    soBalance: 1999.25,
    receiptStatus: "Unpaid",
    shippingStatus: "Processing",
    createdBy: "2",
    createdDate: "2025-10-25",
    notes: "Startup office setup",
    expectedDeliveryDate: "2025-11-05",
  },
  {
    id: "SO-004",
    soDate: "2025-11-01",
    customerId: "CUS-004",
    customerName: "Beta Systems",
    customerCountry: "Canada",
    customerCity: "Toronto",
    invoiceNumber: "INV-2025-0504",
    items: [
      { inventoryItemId: "INV-002", itemName: "Office Chair", quantity: 8, unitPrice: 699.00, totalPrice: 5592.00 },
      { inventoryItemId: "INV-008", itemName: "Filing Cabinet", quantity: 4, unitPrice: 399.00, totalPrice: 1596.00 },
    ],
    totalAmount: 7188.00,
    totalReceived: 7188.00,
    soBalance: 0,
    receiptStatus: "Paid",
    shippingStatus: "Shipped",
    createdBy: "1",
    createdDate: "2025-11-01",
    notes: "New office furniture order",
    expectedDeliveryDate: "2025-11-15",
  },
  {
    id: "SO-005",
    soDate: "2025-09-15",
    customerId: "CUS-003",
    customerName: "Global Solutions",
    customerCountry: "United Kingdom",
    customerCity: "London",
    invoiceNumber: "INV-2025-0495",
    items: [
      { inventoryItemId: "INV-001", itemName: "Laptop Computer", quantity: 5, unitPrice: 1299.99, totalPrice: 6499.95 },
    ],
    totalAmount: 6499.95,
    totalReceived: 3000.00,
    soBalance: 3499.95,
    receiptStatus: "Overdue",
    shippingStatus: "Delivered",
    createdBy: "1",
    createdDate: "2025-09-15",
    notes: "Payment reminder sent - overdue",
    expectedDeliveryDate: "2025-09-25",
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

// Migration function for purchase orders to ensure all fields exist
function migratePurchaseOrders(purchaseOrdersData: PurchaseOrder[]): PurchaseOrder[] {
  return purchaseOrdersData.map(po => {
    const totalAmount = po.totalAmount ?? 0;
    const totalPaid = po.totalPaid ?? 0;
    const poDate = po.poDate ?? po.createdDate ?? new Date().toISOString().split('T')[0];

    return {
      ...po,
      poDate,
      supplierCountry: po.supplierCountry ?? "",
      supplierCity: po.supplierCity ?? "",
      billNumber: po.billNumber ?? "",
      items: po.items ?? [],
      totalAmount,
      totalPaid,
      poBalance: po.poBalance ?? (totalAmount - totalPaid),
      status: po.status ?? "Draft",
      shippingStatus: po.shippingStatus ?? "Pending",
      createdDate: po.createdDate ?? poDate,
    };
  });
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

// Migration function for sales orders to ensure all fields exist
function migrateSalesOrders(salesOrdersData: SalesOrder[]): SalesOrder[] {
  return salesOrdersData.map(so => {
    const totalAmount = so.totalAmount ?? 0;
    const totalReceived = so.totalReceived ?? 0;
    const soDate = so.soDate ?? so.createdDate ?? new Date().toISOString().split('T')[0];

    return {
      ...so,
      soDate,
      customerCountry: so.customerCountry ?? "",
      customerCity: so.customerCity ?? "",
      invoiceNumber: so.invoiceNumber ?? "",
      items: so.items ?? [],
      totalAmount,
      totalReceived,
      soBalance: so.soBalance ?? (totalAmount - totalReceived),
      receiptStatus: so.receiptStatus ?? "Unpaid",
      shippingStatus: so.shippingStatus ?? "Pending",
      createdDate: so.createdDate ?? soDate,
      archived: so.archived ?? false,
    };
  });
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
    name: "Food & Beverages",
    subcategories: ["Beverages", "Snacks", "Canned Goods", "Fresh Produce"],
  },
];

let inventory: InventoryItem[] = migrateInventoryItems(loadFromLocalStorage(STORAGE_KEYS.INVENTORY, DEFAULT_INVENTORY));
let suppliers: Supplier[] = migrateSuppliers(loadFromLocalStorage(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS));
let customers: Customer[] = migrateCustomers(loadFromLocalStorage(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS));
let orders: Order[] = migrateOrdersCurrency(loadFromLocalStorage(STORAGE_KEYS.ORDERS, DEFAULT_ORDERS));
let shipments: Shipment[] = loadFromLocalStorage(STORAGE_KEYS.SHIPMENTS, DEFAULT_SHIPMENTS);
let purchaseOrders: PurchaseOrder[] = migratePurchaseOrders(loadFromLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, DEFAULT_PURCHASE_ORDERS));
let salesOrders: SalesOrder[] = migrateSalesOrders(loadFromLocalStorage(STORAGE_KEYS.SALES_ORDERS, DEFAULT_SALES_ORDERS));
let categories: CategoryDefinition[] = loadFromLocalStorage(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);

// Save migrated data back to localStorage
saveToLocalStorage(STORAGE_KEYS.ORDERS, orders);
saveToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);
saveToLocalStorage(STORAGE_KEYS.SUPPLIERS, suppliers);
saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);
saveToLocalStorage(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders);
saveToLocalStorage(STORAGE_KEYS.SALES_ORDERS, salesOrders);
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

function generateSalesOrderId(): string {
  const maxNum = salesOrders
    .map((so) => Number(so.id.replace(/[^0-9]/g, "")) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  const next = maxNum + 1;
  return `SO-${String(next).padStart(3, "0")}`;
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
  const totalPaid = input.totalPaid ?? 0;
  const poDate = input.poDate ?? new Date().toISOString().split('T')[0];

  const po: PurchaseOrder = {
    id,
    poDate,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    supplierCountry: input.supplierCountry ?? "",
    supplierCity: input.supplierCity ?? "",
    billNumber: input.billNumber ?? "",
    items: input.items.map(item => ({ ...item, quantityReceived: 0 })),
    totalAmount,
    totalPaid,
    poBalance: totalAmount - totalPaid,
    status: "Draft",
    shippingStatus: "Pending",
    createdBy: input.createdBy,
    createdDate: poDate,
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

  // Recalculate balance if totalAmount or totalPaid changed
  if (input.items !== undefined || input.totalPaid !== undefined) {
    next.poBalance = next.totalAmount - next.totalPaid;
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
// Sales Orders CRUD Operations
// ============================================================================

export async function getSalesOrders(): Promise<SalesOrder[]> {
  return delay([...salesOrders]);
}

export async function getSalesOrder(id: string): Promise<SalesOrder | null> {
  const so = salesOrders.find((s) => s.id === id);
  return delay(so ?? null);
}

export async function createSalesOrder(input: CreateSalesOrderInput): Promise<SalesOrder> {
  const id = input.id && input.id.trim() !== "" ? input.id : generateSalesOrderId();
  if (salesOrders.some((so) => so.id === id)) {
    throw new Error(`Sales Order with id ${id} already exists`);
  }

  const totalAmount = input.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalReceived = input.totalReceived ?? 0;
  const soBalance = totalAmount - totalReceived;
  const soDate = input.soDate ?? new Date().toISOString().split('T')[0];

  // Determine receipt status based on payment
  let receiptStatus: ReceiptStatus = input.receiptStatus ?? "Unpaid";
  if (!input.receiptStatus) {
    if (totalReceived >= totalAmount) {
      receiptStatus = "Paid";
    } else if (totalReceived > 0) {
      receiptStatus = "Partially Paid";
    }
  }

  const so: SalesOrder = {
    id,
    soDate,
    customerId: input.customerId,
    customerName: input.customerName,
    customerCountry: input.customerCountry ?? "",
    customerCity: input.customerCity ?? "",
    invoiceNumber: input.invoiceNumber ?? "",
    items: input.items.map(item => ({ ...item, quantityShipped: 0 })),
    totalAmount,
    totalReceived,
    soBalance,
    receiptStatus,
    shippingStatus: input.shippingStatus ?? "Pending",
    createdBy: input.createdBy,
    createdDate: soDate,
    notes: input.notes ?? "",
    expectedDeliveryDate: input.expectedDeliveryDate,
  };

  salesOrders.push(so);
  saveToLocalStorage(STORAGE_KEYS.SALES_ORDERS, salesOrders);

  return delay(so);
}

export async function updateSalesOrder(input: UpdateSalesOrderInput): Promise<SalesOrder> {
  const index = salesOrders.findIndex((so) => so.id === input.id);
  if (index === -1) throw new Error("Sales Order not found");

  const prev = salesOrders[index];
  const next: SalesOrder = { ...prev, ...input } as SalesOrder;

  // Recalculate totalAmount if items changed
  if (input.items) {
    next.totalAmount = input.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  // Recalculate soBalance
  next.soBalance = next.totalAmount - next.totalReceived;

  salesOrders[index] = next;
  saveToLocalStorage(STORAGE_KEYS.SALES_ORDERS, salesOrders);

  return delay(next);
}

export async function deleteSalesOrder(id: string): Promise<void> {
  const index = salesOrders.findIndex((so) => so.id === id);
  if (index === -1) throw new Error("Sales Order not found");

  salesOrders.splice(index, 1);
  saveToLocalStorage(STORAGE_KEYS.SALES_ORDERS, salesOrders);

  return delay(undefined);
}

// ============================================================================
// Sales Order Archive/Restore Operations
// ============================================================================

export async function archiveSalesOrder(id: string): Promise<SalesOrder> {
  const index = salesOrders.findIndex((so) => so.id === id);
  if (index === -1) throw new Error("Sales Order not found");

  salesOrders[index] = {
    ...salesOrders[index],
    archived: true,
    archivedAt: new Date().toISOString(),
  };
  saveToLocalStorage(STORAGE_KEYS.SALES_ORDERS, salesOrders);

  return delay(salesOrders[index]);
}

export async function restoreSalesOrder(id: string): Promise<SalesOrder> {
  const index = salesOrders.findIndex((so) => so.id === id);
  if (index === -1) throw new Error("Sales Order not found");

  salesOrders[index] = {
    ...salesOrders[index],
    archived: false,
    archivedAt: undefined,
  };
  saveToLocalStorage(STORAGE_KEYS.SALES_ORDERS, salesOrders);

  return delay(salesOrders[index]);
}

export async function permanentlyDeleteSalesOrder(id: string): Promise<void> {
  const index = salesOrders.findIndex((so) => so.id === id);
  if (index === -1) throw new Error("Sales Order not found");

  salesOrders.splice(index, 1);
  saveToLocalStorage(STORAGE_KEYS.SALES_ORDERS, salesOrders);

  return delay(undefined);
}

// ============================================================================
// Sales Order Bulk Operations
// ============================================================================

export async function bulkDeleteSalesOrders(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = salesOrders.findIndex((so) => so.id === id);
    if (index === -1) {
      errors.push(`Sales Order ${id} not found`);
      continue;
    }

    salesOrders.splice(index, 1);
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.SALES_ORDERS, salesOrders);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

export async function bulkArchiveSalesOrders(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = salesOrders.findIndex((so) => so.id === id);
    if (index === -1) {
      errors.push(`Sales Order ${id} not found`);
      continue;
    }

    salesOrders[index] = {
      ...salesOrders[index],
      archived: true,
      archivedAt: new Date().toISOString(),
    };
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.SALES_ORDERS, salesOrders);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

export async function bulkRestoreSalesOrders(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = salesOrders.findIndex((so) => so.id === id);
    if (index === -1) {
      errors.push(`Sales Order ${id} not found`);
      continue;
    }

    salesOrders[index] = {
      ...salesOrders[index],
      archived: false,
      archivedAt: undefined,
    };
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.SALES_ORDERS, salesOrders);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
}

export async function bulkPermanentlyDeleteSalesOrders(ids: string[]): Promise<BulkOperationResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const index = salesOrders.findIndex((so) => so.id === id);
    if (index === -1) {
      errors.push(`Sales Order ${id} not found`);
      continue;
    }

    if (!salesOrders[index].archived) {
      errors.push(`Sales Order ${id} must be archived before permanent deletion`);
      continue;
    }

    salesOrders.splice(index, 1);
    successCount++;
  }

  saveToLocalStorage(STORAGE_KEYS.SALES_ORDERS, salesOrders);

  return delay({
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  });
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

// ============================================================================
// Cash and Bank Transaction API
// ============================================================================

// Default mock data for Cash and Bank transactions
const defaultCashBankTransactions: CashBankTransaction[] = [
  {
    id: "TRX-001",
    trxDate: "2025-10-10",
    customerId: "CUS-001",
    customerName: "Acme Corp",
    country: "United States",
    city: "San Francisco",
    soId: "SO-001",
    invoiceNumber: "INV-2025-0501",
    paymentMode: "Bank Transfer",
    amountReceived: 14699.80,
    notes: "Full payment for SO-001",
    createdAt: "2025-10-10T10:30:00Z",
    createdBy: "1",
    archived: false,
  },
  {
    id: "TRX-002",
    trxDate: "2025-10-20",
    customerId: "CUS-003",
    customerName: "Global Solutions",
    country: "United Kingdom",
    city: "London",
    soId: "SO-002",
    invoiceNumber: "INV-2025-0502",
    paymentMode: "Credit Card",
    amountReceived: 12000.00,
    notes: "Partial payment for SO-002",
    createdAt: "2025-10-20T14:15:00Z",
    createdBy: "1",
    archived: false,
  },
  {
    id: "TRX-003",
    trxDate: "2025-11-05",
    customerId: "CUS-004",
    customerName: "Beta Systems",
    country: "Canada",
    city: "Toronto",
    soId: "SO-004",
    invoiceNumber: "INV-2025-0504",
    paymentMode: "Bank Transfer",
    amountReceived: 7188.00,
    notes: "Full payment for furniture order",
    createdAt: "2025-11-05T09:00:00Z",
    createdBy: "1",
    archived: false,
  },
  {
    id: "TRX-004",
    trxDate: "2025-09-20",
    customerId: "CUS-003",
    customerName: "Global Solutions",
    country: "United Kingdom",
    city: "London",
    soId: "SO-005",
    invoiceNumber: "INV-2025-0495",
    paymentMode: "Check",
    amountReceived: 3000.00,
    notes: "Partial payment - overdue balance",
    createdAt: "2025-09-20T11:45:00Z",
    createdBy: "1",
    archived: false,
  },
  {
    id: "TRX-005",
    trxDate: "2025-11-01",
    customerId: "CUS-002",
    customerName: "TechStart Inc",
    country: "United States",
    city: "Austin",
    soId: "SO-003",
    invoiceNumber: "INV-2025-0503",
    paymentMode: "Cash",
    amountReceived: 500.00,
    notes: "Deposit for order",
    createdAt: "2025-11-01T16:30:00Z",
    createdBy: "2",
    archived: false,
  },
  {
    id: "TRX-006",
    trxDate: "2025-10-25",
    customerId: "CUS-001",
    customerName: "Acme Corp",
    country: "United States",
    city: "San Francisco",
    soId: "SO-001",
    invoiceNumber: "INV-2025-0501",
    paymentMode: "Online Payment",
    amountReceived: 2500.00,
    notes: "Additional payment for extended warranty",
    createdAt: "2025-10-25T13:00:00Z",
    createdBy: "1",
    archived: false,
  },
  {
    id: "TRX-007",
    trxDate: "2025-11-10",
    customerId: "CUS-004",
    customerName: "Beta Systems",
    country: "Canada",
    city: "Toronto",
    soId: "SO-004",
    invoiceNumber: "INV-2025-0504",
    paymentMode: "Credit Card",
    amountReceived: 1500.00,
    notes: "Additional items added to order",
    createdAt: "2025-11-10T10:00:00Z",
    createdBy: "1",
    archived: false,
  },
  {
    id: "TRX-008",
    trxDate: "2025-10-15",
    customerId: "CUS-005",
    customerName: "Metro Supplies",
    country: "United States",
    city: "New York",
    soId: "SO-003",
    invoiceNumber: "INV-2025-0499",
    paymentMode: "Bank Transfer",
    amountReceived: 850.00,
    notes: "Final payment clearing balance",
    createdAt: "2025-10-15T09:30:00Z",
    createdBy: "1",
    archived: false,
  },
];

// In-memory store - initialized from localStorage or defaults
let cashBankTransactions: CashBankTransaction[] = loadFromLocalStorage<CashBankTransaction[]>(
  STORAGE_KEYS.CASH_BANK,
  defaultCashBankTransactions
);

// Migration: Ensure all transactions have the archived field
cashBankTransactions = cashBankTransactions.map((trx) => ({
  ...trx,
  archived: trx.archived ?? false,
}));
saveToLocalStorage(STORAGE_KEYS.CASH_BANK, cashBankTransactions);

/**
 * Generate the next TRX ID (TRX-001, TRX-002, etc.)
 */
function generateNextTrxId(): string {
  const existingIds = cashBankTransactions.map((trx) => {
    const match = trx.id.match(/^TRX-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  return `TRX-${String(maxId + 1).padStart(3, "0")}`;
}

/**
 * Get all cash and bank transactions
 */
export async function getCashBankTransactions(): Promise<CashBankTransaction[]> {
  return delay([...cashBankTransactions]);
}

/**
 * Get a single cash and bank transaction by ID
 */
export async function getCashBankTransactionById(id: string): Promise<CashBankTransaction | undefined> {
  const transaction = cashBankTransactions.find((trx) => trx.id === id);
  return delay(transaction);
}

/**
 * Create a new cash and bank transaction
 */
export async function createCashBankTransaction(
  input: CreateCashBankTransactionInput
): Promise<CashBankTransaction> {
  const id = input.id || generateNextTrxId();
  const now = new Date().toISOString();

  const newTransaction: CashBankTransaction = {
    id,
    trxDate: input.trxDate,
    customerId: input.customerId,
    customerName: input.customerName,
    country: input.country || "",
    city: input.city || "",
    soId: input.soId,
    invoiceNumber: input.invoiceNumber || "",
    paymentMode: input.paymentMode,
    amountReceived: input.amountReceived,
    notes: input.notes,
    createdAt: now,
    createdBy: input.createdBy,
    archived: false,
  };

  cashBankTransactions = [...cashBankTransactions, newTransaction];
  saveToLocalStorage(STORAGE_KEYS.CASH_BANK, cashBankTransactions);
  return delay(newTransaction);
}

/**
 * Update an existing cash and bank transaction
 */
export async function updateCashBankTransaction(
  input: UpdateCashBankTransactionInput
): Promise<CashBankTransaction> {
  const index = cashBankTransactions.findIndex((trx) => trx.id === input.id);
  if (index === -1) {
    throw new Error(`Cash/Bank transaction with ID ${input.id} not found`);
  }

  const existing = cashBankTransactions[index];
  const updated: CashBankTransaction = {
    ...existing,
    trxDate: input.trxDate ?? existing.trxDate,
    customerId: input.customerId ?? existing.customerId,
    customerName: input.customerName ?? existing.customerName,
    country: input.country ?? existing.country,
    city: input.city ?? existing.city,
    soId: input.soId ?? existing.soId,
    invoiceNumber: input.invoiceNumber ?? existing.invoiceNumber,
    paymentMode: input.paymentMode ?? existing.paymentMode,
    amountReceived: input.amountReceived ?? existing.amountReceived,
    notes: input.notes ?? existing.notes,
    updatedAt: new Date().toISOString(),
  };

  cashBankTransactions = [
    ...cashBankTransactions.slice(0, index),
    updated,
    ...cashBankTransactions.slice(index + 1),
  ];
  saveToLocalStorage(STORAGE_KEYS.CASH_BANK, cashBankTransactions);
  return delay(updated);
}

/**
 * Archive (soft delete) a cash and bank transaction
 */
export async function archiveCashBankTransaction(id: string): Promise<CashBankTransaction> {
  const index = cashBankTransactions.findIndex((trx) => trx.id === id);
  if (index === -1) {
    throw new Error(`Cash/Bank transaction with ID ${id} not found`);
  }

  const updated: CashBankTransaction = {
    ...cashBankTransactions[index],
    archived: true,
    archivedAt: new Date().toISOString(),
  };

  cashBankTransactions = [
    ...cashBankTransactions.slice(0, index),
    updated,
    ...cashBankTransactions.slice(index + 1),
  ];
  saveToLocalStorage(STORAGE_KEYS.CASH_BANK, cashBankTransactions);
  return delay(updated);
}

/**
 * Restore an archived cash and bank transaction
 */
export async function restoreCashBankTransaction(id: string): Promise<CashBankTransaction> {
  const index = cashBankTransactions.findIndex((trx) => trx.id === id);
  if (index === -1) {
    throw new Error(`Cash/Bank transaction with ID ${id} not found`);
  }

  const updated: CashBankTransaction = {
    ...cashBankTransactions[index],
    archived: false,
    archivedAt: undefined,
  };

  cashBankTransactions = [
    ...cashBankTransactions.slice(0, index),
    updated,
    ...cashBankTransactions.slice(index + 1),
  ];
  saveToLocalStorage(STORAGE_KEYS.CASH_BANK, cashBankTransactions);
  return delay(updated);
}

/**
 * Permanently delete a cash and bank transaction
 */
export async function deleteCashBankTransaction(id: string): Promise<void> {
  const index = cashBankTransactions.findIndex((trx) => trx.id === id);
  if (index === -1) {
    throw new Error(`Cash/Bank transaction with ID ${id} not found`);
  }

  cashBankTransactions = cashBankTransactions.filter((trx) => trx.id !== id);
  saveToLocalStorage(STORAGE_KEYS.CASH_BANK, cashBankTransactions);
  return delay(undefined);
}

/**
 * Batch archive multiple cash and bank transactions
 */
export async function batchArchiveCashBankTransactions(ids: string[]): Promise<CashBankTransaction[]> {
  const now = new Date().toISOString();
  const archived: CashBankTransaction[] = [];

  cashBankTransactions = cashBankTransactions.map((trx) => {
    if (ids.includes(trx.id)) {
      const updated = { ...trx, archived: true, archivedAt: now };
      archived.push(updated);
      return updated;
    }
    return trx;
  });

  saveToLocalStorage(STORAGE_KEYS.CASH_BANK, cashBankTransactions);
  return delay(archived);
}

/**
 * Batch restore multiple cash and bank transactions
 */
export async function batchRestoreCashBankTransactions(ids: string[]): Promise<CashBankTransaction[]> {
  const restored: CashBankTransaction[] = [];

  cashBankTransactions = cashBankTransactions.map((trx) => {
    if (ids.includes(trx.id)) {
      const updated = { ...trx, archived: false, archivedAt: undefined };
      restored.push(updated);
      return updated;
    }
    return trx;
  });

  saveToLocalStorage(STORAGE_KEYS.CASH_BANK, cashBankTransactions);
  return delay(restored);
}

/**
 * Batch permanently delete multiple cash and bank transactions
 */
export async function batchDeleteCashBankTransactions(ids: string[]): Promise<void> {
  cashBankTransactions = cashBankTransactions.filter((trx) => !ids.includes(trx.id));
  saveToLocalStorage(STORAGE_KEYS.CASH_BANK, cashBankTransactions);
  return delay(undefined);
}

// ============================================================================
// Payment Transactions API (Payments Against Purchase Orders)
// ============================================================================

// Default mock data for Payment transactions
const defaultPaymentTransactions: PaymentTransaction[] = [
  {
    id: "TRX-001",
    trxDate: "2025-10-05",
    supplierId: "SUP-001",
    supplierName: "TechSource LLC",
    country: "United States",
    city: "San Francisco",
    poId: "PO-001",
    billNumber: "INV-2025-0142",
    paymentMode: "Bank Transfer",
    amountPaid: 57998.50,
    notes: "Full payment for PO-001 - Q4 restock",
    createdAt: "2025-10-05T10:00:00Z",
    createdBy: "1",
    archived: false,
  },
  {
    id: "TRX-002",
    trxDate: "2025-10-20",
    supplierId: "SUP-002",
    supplierName: "FurniCraft Industries",
    country: "United States",
    city: "Grand Rapids",
    poId: "PO-002",
    billNumber: "FC-INV-4521",
    paymentMode: "Check",
    amountPaid: 16225.00,
    notes: "50% deposit for office furniture",
    createdAt: "2025-10-20T14:30:00Z",
    createdBy: "1",
    archived: false,
  },
  {
    id: "TRX-003",
    trxDate: "2025-11-05",
    supplierId: "SUP-002",
    supplierName: "FurniCraft Industries",
    country: "United States",
    city: "Grand Rapids",
    poId: "PO-005",
    billNumber: "FC-INV-4590",
    paymentMode: "Bank Transfer",
    amountPaid: 4485.00,
    notes: "Full payment for filing cabinets",
    createdAt: "2025-11-05T09:15:00Z",
    createdBy: "1",
    archived: false,
  },
  {
    id: "TRX-004",
    trxDate: "2025-09-28",
    supplierId: "SUP-003",
    supplierName: "Global Electronics Co",
    country: "China",
    city: "Shenzhen",
    poId: "PO-001",
    billNumber: "GE-2025-789",
    paymentMode: "Credit Card",
    amountPaid: 25000.00,
    notes: "Partial payment for electronics shipment",
    createdAt: "2025-09-28T11:00:00Z",
    createdBy: "1",
    archived: false,
  },
  {
    id: "TRX-005",
    trxDate: "2025-10-30",
    supplierId: "SUP-003",
    supplierName: "Global Electronics Co",
    country: "China",
    city: "Shenzhen",
    poId: "PO-001",
    billNumber: "GE-2025-789",
    paymentMode: "Bank Transfer",
    amountPaid: 25000.00,
    notes: "Final payment for electronics shipment",
    createdAt: "2025-10-30T15:45:00Z",
    createdBy: "1",
    archived: false,
  },
  {
    id: "TRX-006",
    trxDate: "2025-11-02",
    supplierId: "SUP-005",
    supplierName: "Premium Parts Ltd",
    country: "United Kingdom",
    city: "London",
    poId: "PO-003",
    billNumber: "PP-UK-2025-456",
    paymentMode: "Online Payment",
    amountPaid: 15000.00,
    notes: "Payment for premium components",
    createdAt: "2025-11-02T08:30:00Z",
    createdBy: "2",
    archived: false,
  },
  {
    id: "TRX-007",
    trxDate: "2025-10-12",
    supplierId: "SUP-001",
    supplierName: "TechSource LLC",
    country: "United States",
    city: "San Francisco",
    poId: "PO-004",
    billNumber: "TS-INV-2025-234",
    paymentMode: "Cash",
    amountPaid: 3500.00,
    notes: "Advance payment for monitor order",
    createdAt: "2025-10-12T13:20:00Z",
    createdBy: "1",
    archived: false,
  },
  {
    id: "TRX-008",
    trxDate: "2025-11-08",
    supplierId: "SUP-002",
    supplierName: "FurniCraft Industries",
    country: "United States",
    city: "Grand Rapids",
    poId: "PO-002",
    billNumber: "FC-INV-4521",
    paymentMode: "Bank Transfer",
    amountPaid: 8000.00,
    notes: "Second installment for furniture order",
    createdAt: "2025-11-08T10:00:00Z",
    createdBy: "1",
    archived: false,
  },
];

// In-memory store - initialized from localStorage or defaults
let paymentTransactions: PaymentTransaction[] = loadFromLocalStorage<PaymentTransaction[]>(
  STORAGE_KEYS.PAYMENTS,
  defaultPaymentTransactions
);

// Migration: Ensure all transactions have the archived field
paymentTransactions = paymentTransactions.map((trx) => ({
  ...trx,
  archived: trx.archived ?? false,
}));
saveToLocalStorage(STORAGE_KEYS.PAYMENTS, paymentTransactions);

/**
 * Generate the next Payment TRX ID (TRX-001, TRX-002, etc.)
 * Uses a separate counter from Cash/Bank transactions
 */
function generateNextPaymentTrxId(): string {
  const existingIds = paymentTransactions.map((trx) => {
    const match = trx.id.match(/^TRX-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  return `TRX-${String(maxId + 1).padStart(3, "0")}`;
}

/**
 * Get all payment transactions
 */
export async function getPaymentTransactions(): Promise<PaymentTransaction[]> {
  return delay([...paymentTransactions]);
}

/**
 * Get a single payment transaction by ID
 */
export async function getPaymentTransactionById(id: string): Promise<PaymentTransaction | undefined> {
  const transaction = paymentTransactions.find((trx) => trx.id === id);
  return delay(transaction);
}

/**
 * Create a new payment transaction
 */
export async function createPaymentTransaction(
  input: CreatePaymentTransactionInput
): Promise<PaymentTransaction> {
  const id = input.id || generateNextPaymentTrxId();
  const now = new Date().toISOString();

  const newTransaction: PaymentTransaction = {
    id,
    trxDate: input.trxDate,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    country: input.country || "",
    city: input.city || "",
    poId: input.poId,
    billNumber: input.billNumber || "",
    paymentMode: input.paymentMode,
    amountPaid: input.amountPaid,
    notes: input.notes,
    createdAt: now,
    createdBy: input.createdBy,
    archived: false,
  };

  paymentTransactions = [...paymentTransactions, newTransaction];
  saveToLocalStorage(STORAGE_KEYS.PAYMENTS, paymentTransactions);
  return delay(newTransaction);
}

/**
 * Update an existing payment transaction
 */
export async function updatePaymentTransaction(
  input: UpdatePaymentTransactionInput
): Promise<PaymentTransaction> {
  const index = paymentTransactions.findIndex((trx) => trx.id === input.id);
  if (index === -1) {
    throw new Error(`Payment transaction with ID ${input.id} not found`);
  }

  const existing = paymentTransactions[index];
  const updated: PaymentTransaction = {
    ...existing,
    trxDate: input.trxDate ?? existing.trxDate,
    supplierId: input.supplierId ?? existing.supplierId,
    supplierName: input.supplierName ?? existing.supplierName,
    country: input.country ?? existing.country,
    city: input.city ?? existing.city,
    poId: input.poId ?? existing.poId,
    billNumber: input.billNumber ?? existing.billNumber,
    paymentMode: input.paymentMode ?? existing.paymentMode,
    amountPaid: input.amountPaid ?? existing.amountPaid,
    notes: input.notes ?? existing.notes,
    updatedAt: new Date().toISOString(),
  };

  paymentTransactions = [
    ...paymentTransactions.slice(0, index),
    updated,
    ...paymentTransactions.slice(index + 1),
  ];
  saveToLocalStorage(STORAGE_KEYS.PAYMENTS, paymentTransactions);
  return delay(updated);
}

/**
 * Archive (soft delete) a payment transaction
 */
export async function archivePaymentTransaction(id: string): Promise<PaymentTransaction> {
  const index = paymentTransactions.findIndex((trx) => trx.id === id);
  if (index === -1) {
    throw new Error(`Payment transaction with ID ${id} not found`);
  }

  const updated: PaymentTransaction = {
    ...paymentTransactions[index],
    archived: true,
    archivedAt: new Date().toISOString(),
  };

  paymentTransactions = [
    ...paymentTransactions.slice(0, index),
    updated,
    ...paymentTransactions.slice(index + 1),
  ];
  saveToLocalStorage(STORAGE_KEYS.PAYMENTS, paymentTransactions);
  return delay(updated);
}

/**
 * Restore an archived payment transaction
 */
export async function restorePaymentTransaction(id: string): Promise<PaymentTransaction> {
  const index = paymentTransactions.findIndex((trx) => trx.id === id);
  if (index === -1) {
    throw new Error(`Payment transaction with ID ${id} not found`);
  }

  const updated: PaymentTransaction = {
    ...paymentTransactions[index],
    archived: false,
    archivedAt: undefined,
  };

  paymentTransactions = [
    ...paymentTransactions.slice(0, index),
    updated,
    ...paymentTransactions.slice(index + 1),
  ];
  saveToLocalStorage(STORAGE_KEYS.PAYMENTS, paymentTransactions);
  return delay(updated);
}

/**
 * Permanently delete a payment transaction
 */
export async function deletePaymentTransaction(id: string): Promise<void> {
  const index = paymentTransactions.findIndex((trx) => trx.id === id);
  if (index === -1) {
    throw new Error(`Payment transaction with ID ${id} not found`);
  }

  paymentTransactions = paymentTransactions.filter((trx) => trx.id !== id);
  saveToLocalStorage(STORAGE_KEYS.PAYMENTS, paymentTransactions);
  return delay(undefined);
}

/**
 * Batch archive multiple payment transactions
 */
export async function batchArchivePaymentTransactions(ids: string[]): Promise<PaymentTransaction[]> {
  const now = new Date().toISOString();
  const archived: PaymentTransaction[] = [];

  paymentTransactions = paymentTransactions.map((trx) => {
    if (ids.includes(trx.id)) {
      const updated = { ...trx, archived: true, archivedAt: now };
      archived.push(updated);
      return updated;
    }
    return trx;
  });

  saveToLocalStorage(STORAGE_KEYS.PAYMENTS, paymentTransactions);
  return delay(archived);
}

/**
 * Batch restore multiple payment transactions
 */
export async function batchRestorePaymentTransactions(ids: string[]): Promise<PaymentTransaction[]> {
  const restored: PaymentTransaction[] = [];

  paymentTransactions = paymentTransactions.map((trx) => {
    if (ids.includes(trx.id)) {
      const updated = { ...trx, archived: false, archivedAt: undefined };
      restored.push(updated);
      return updated;
    }
    return trx;
  });

  saveToLocalStorage(STORAGE_KEYS.PAYMENTS, paymentTransactions);
  return delay(restored);
}

/**
 * Batch permanently delete multiple payment transactions
 */
export async function batchDeletePaymentTransactions(ids: string[]): Promise<void> {
  paymentTransactions = paymentTransactions.filter((trx) => !ids.includes(trx.id));
  saveToLocalStorage(STORAGE_KEYS.PAYMENTS, paymentTransactions);
  return delay(undefined);
}
