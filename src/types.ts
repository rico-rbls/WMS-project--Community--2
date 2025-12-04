export type InventoryCategory = "Electronics" | "Furniture" | "Clothing" | "Food & Beverages" | string;

// Category with subcategories structure
export interface CategoryDefinition {
  name: string;
  subcategories: string[];
}

export interface InventoryItem {
  id: string; // Human-readable code like INV-001
  name: string;
  category: InventoryCategory;
  subcategory?: string; // Optional subcategory within the category
  quantity: number; // Remaining quantity (current stock)
  location: string;
  status: "In Stock" | "Low Stock" | "Critical" | "Overstock" | "Unknown";
  // Fields
  brand: string; // Manufacturer or brand name
  pricePerPiece: number; // Unit price for each item
  supplierId: string; // Reference to Supplier.id
  quantityPurchased: number; // Total quantity purchased/received
  quantitySold: number; // Total quantity sold/shipped
  reorderRequired: boolean; // Whether this item needs to be reordered
  reorderLevel?: number; // Quantity threshold for auto-reorder (when quantity <= reorderLevel, set reorderRequired to true)
  photoUrl?: string; // Optional product photo URL
  description?: string; // Optional product description
  // Archive fields
  archived?: boolean; // Whether the item is archived (soft-deleted)
  archivedAt?: string; // ISO date when the item was archived
}

export interface CreateInventoryItemInput {
  id?: string; // optional; will be generated if omitted
  name: string;
  category: InventoryCategory;
  subcategory?: string;
  quantity: number; // Remaining quantity
  location: string;
  brand: string;
  pricePerPiece: number;
  supplierId: string;
  quantityPurchased: number;
  quantitySold: number;
  reorderRequired: boolean;
  reorderLevel?: number; // Optional reorder threshold
  photoUrl?: string;
  description?: string;
}

export interface UpdateInventoryItemInput {
  id: string;
  name?: string;
  category?: InventoryCategory;
  subcategory?: string;
  quantity?: number;
  location?: string;
  brand?: string;
  pricePerPiece?: number;
  supplierId?: string;
  quantityPurchased?: number;
  quantitySold?: number;
  reorderRequired?: boolean;
  reorderLevel?: number;
  photoUrl?: string;
  description?: string;
}

export interface Supplier {
  id: string;
  name: string; // company name
  contact: string;
  email: string;
  phone: string;
  category: string;
  status: "Active" | "Inactive";
  // Location fields
  country: string;
  city: string;
  address: string;
  // Financial fields
  purchases: number; // Total amount purchased from this supplier
  payments: number; // Total amount paid to this supplier
  balance: number; // Outstanding balance (purchases - payments)
  // Archive fields
  archived?: boolean; // Whether the supplier is archived (soft-deleted)
  archivedAt?: string; // ISO date when the supplier was archived
}

export interface CreateSupplierInput {
  id?: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
  status?: "Active" | "Inactive";
  country?: string;
  city?: string;
  address?: string;
  purchases?: number;
  payments?: number;
}

export interface UpdateSupplierInput {
  id: string;
  name?: string;
  contact?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  purchases?: number;
  payments?: number;
  category?: string;
  status?: "Active" | "Inactive";
}

export interface Customer {
  id: string;
  name: string; // company or customer name
  contact: string;
  email: string;
  phone: string;
  category: string;
  status: "Active" | "Inactive";
  // Location fields
  country: string;
  city: string;
  address: string;
  // Financial fields
  purchases: number; // Total amount purchased by this customer
  payments: number; // Total amount paid by this customer
  balance: number; // Outstanding balance (purchases - payments)
  // Archive fields
  archived?: boolean; // Whether the customer is archived (soft-deleted)
  archivedAt?: string; // ISO date when the customer was archived
}

export interface CreateCustomerInput {
  id?: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
  status?: "Active" | "Inactive";
  country?: string;
  city?: string;
  address?: string;
  purchases?: number;
  payments?: number;
}

export interface UpdateCustomerInput {
  id: string;
  name?: string;
  contact?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  purchases?: number;
  payments?: number;
  category?: string;
  status?: "Active" | "Inactive";
}

export interface Shipment {
  id: string;
  salesOrderId: string; // Links to Sales Order
  destination: string;
  carrier: string;
  status: "Pending" | "Processing" | "In Transit" | "Delivered";
  eta: string;
  // Archive fields
  archived?: boolean; // Whether the shipment is archived (soft-deleted)
  archivedAt?: string; // ISO date when the shipment was archived
}

// Favorites & Bookmarks Types
export type EntityType = "inventory" | "purchase-orders" | "sales-orders" | "shipments" | "suppliers";

export interface FavoriteItem {
  id: string;
  entityType: EntityType;
  entityId: string;
  entityName: string; // Display name for the item
  favoritedAt: string; // ISO date string
}

export interface SavedSearch {
  id: string;
  name: string;
  entityType: EntityType;
  searchTerm?: string;
  filters: Record<string, string | string[]>; // Generic filter storage
  createdAt: string; // ISO date string
}

export interface QuickLink {
  id: string;
  label: string;
  entityType: EntityType;
  filters: Record<string, string | string[]>;
  icon?: string;
}

// Purchase Order Types
export type POStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Ordered"
  | "Partially Received"
  | "Received"
  | "Cancelled";

export type ShippingStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "In Transit"
  | "Out for Delivery"
  | "Delivered"
  | "Failed"
  | "Returned";

export interface POLineItem {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  quantityReceived?: number; // Track received quantities
}

export interface PurchaseOrder {
  id: string; // Format: PO-001, PO-002, etc.
  poDate: string; // Date when PO was created (ISO date)
  supplierId: string;
  supplierName: string;
  supplierCountry: string; // Supplier's country (auto-populated)
  supplierCity: string; // Supplier's city (auto-populated)
  billNumber: string; // Invoice/bill reference number from supplier
  items: POLineItem[];
  totalAmount: number;
  totalPaid: number; // Amount already paid to supplier
  poBalance: number; // Remaining balance (totalAmount - totalPaid)
  status: POStatus; // Material/procurement status
  shippingStatus: ShippingStatus; // Delivery/shipping status
  createdBy: string;
  createdDate: string; // ISO date (legacy, same as poDate)
  approvedBy: string | null;
  approvedDate: string | null;
  receivedDate: string | null;
  notes: string;
  expectedDeliveryDate: string; // ISO date
  actualCost?: number; // Actual cost when received (for variance tracking)
  // Archive fields
  archived?: boolean; // Whether the PO is archived (soft-deleted)
  archivedAt?: string; // ISO date when the PO was archived
}

export interface CreatePurchaseOrderInput {
  id?: string;
  poDate?: string;
  supplierId: string;
  supplierName: string;
  supplierCountry?: string;
  supplierCity?: string;
  billNumber?: string;
  items: Omit<POLineItem, 'quantityReceived'>[];
  expectedDeliveryDate: string;
  notes?: string;
  createdBy: string;
  totalPaid?: number;
}

export interface UpdatePurchaseOrderInput {
  id: string;
  poDate?: string;
  supplierId?: string;
  supplierName?: string;
  supplierCountry?: string;
  supplierCity?: string;
  billNumber?: string;
  items?: POLineItem[];
  expectedDeliveryDate?: string;
  notes?: string;
  status?: POStatus;
  shippingStatus?: ShippingStatus;
  approvedBy?: string;
  approvedDate?: string;
  receivedDate?: string;
  actualCost?: number;
  totalPaid?: number;
}

// Sales Order Types
export type ReceiptStatus = "Unpaid" | "Partially Paid" | "Paid" | "Overdue";

export interface SOLineItem {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  quantityShipped?: number; // Track shipped quantities
}

export interface SalesOrder {
  id: string; // Format: SO-001, SO-002, etc.
  soDate: string; // Date when SO was created (ISO date)
  customerId: string;
  customerName: string;
  customerCountry: string; // Customer's country (auto-populated)
  customerCity: string; // Customer's city (auto-populated)
  invoiceNumber: string; // Invoice/bill reference number
  items: SOLineItem[];
  totalAmount: number;
  totalReceived: number; // Amount received from customer
  soBalance: number; // Remaining balance (totalAmount - totalReceived)
  receiptStatus: ReceiptStatus; // Payment/receipt status
  shippingStatus: ShippingStatus; // Delivery/shipping status
  createdBy: string;
  createdDate: string; // ISO date
  notes: string;
  expectedDeliveryDate: string; // ISO date
  // Archive fields
  archived?: boolean; // Whether the SO is archived (soft-deleted)
  archivedAt?: string; // ISO date when the SO was archived
}

export interface CreateSalesOrderInput {
  id?: string;
  soDate?: string;
  customerId: string;
  customerName: string;
  customerCountry?: string;
  customerCity?: string;
  invoiceNumber?: string;
  items: Omit<SOLineItem, 'quantityShipped'>[];
  expectedDeliveryDate: string;
  notes?: string;
  createdBy: string;
  totalReceived?: number;
  receiptStatus?: ReceiptStatus;
  shippingStatus?: ShippingStatus;
}

export interface UpdateSalesOrderInput {
  id: string;
  soDate?: string;
  customerId?: string;
  customerName?: string;
  customerCountry?: string;
  customerCity?: string;
  invoiceNumber?: string;
  items?: SOLineItem[];
  expectedDeliveryDate?: string;
  notes?: string;
  receiptStatus?: ReceiptStatus;
  shippingStatus?: ShippingStatus;
  totalReceived?: number;
}

// ============================================
// CASH AND BANK TYPES
// ============================================

export type PaymentMode = "Cash" | "Bank Transfer" | "Credit Card" | "Check" | "Online Payment";

export interface CashBankTransaction {
  id: string; // TRX-001 format
  trxDate: string; // ISO date
  customerId: string;
  customerName: string;
  country: string;
  city: string;
  soId: string; // Related Sales Order ID
  invoiceNumber: string;
  paymentMode: PaymentMode;
  amountReceived: number;
  notes?: string;
  createdAt: string; // ISO date
  createdBy: string;
  updatedAt?: string; // ISO date
  // Archive fields
  archived?: boolean;
  archivedAt?: string; // ISO date
}

export interface CreateCashBankTransactionInput {
  id?: string;
  trxDate: string;
  customerId: string;
  customerName: string;
  country?: string;
  city?: string;
  soId: string;
  invoiceNumber?: string;
  paymentMode: PaymentMode;
  amountReceived: number;
  notes?: string;
  createdBy: string;
}

export interface UpdateCashBankTransactionInput {
  id: string;
  trxDate?: string;
  customerId?: string;
  customerName?: string;
  country?: string;
  city?: string;
  soId?: string;
  invoiceNumber?: string;
  paymentMode?: PaymentMode;
  amountReceived?: number;
  notes?: string;
}

// ============================================
// PAYMENTS (AGAINST PURCHASE ORDERS) TYPES
// ============================================

export interface PaymentTransaction {
  id: string; // TRX-001 format
  trxDate: string; // ISO date
  supplierId: string;
  supplierName: string;
  country: string;
  city: string;
  poId: string; // Related Purchase Order ID
  billNumber: string;
  paymentMode: PaymentMode;
  amountPaid: number;
  notes?: string;
  createdAt: string; // ISO date
  createdBy: string;
  updatedAt?: string; // ISO date
  // Archive fields
  archived?: boolean;
  archivedAt?: string; // ISO date
}

export interface CreatePaymentTransactionInput {
  id?: string;
  trxDate: string;
  supplierId: string;
  supplierName: string;
  country?: string;
  city?: string;
  poId: string;
  billNumber?: string;
  paymentMode: PaymentMode;
  amountPaid: number;
  notes?: string;
  createdBy: string;
}

export interface UpdatePaymentTransactionInput {
  id: string;
  trxDate?: string;
  supplierId?: string;
  supplierName?: string;
  country?: string;
  city?: string;
  poId?: string;
  billNumber?: string;
  paymentMode?: PaymentMode;
  amountPaid?: number;
  notes?: string;
}