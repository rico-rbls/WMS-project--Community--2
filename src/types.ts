export type InventoryCategory = "Electronics" | "Furniture" | "Clothing" | "Food";

export interface InventoryItem {
  id: string; // Human-readable code like INV-001
  name: string;
  category: InventoryCategory;
  quantity: number;
  location: string;
  reorderLevel: number; // Kept for backward compatibility, same as minimumStock
  status: "In Stock" | "Low Stock" | "Critical" | "Unknown";
  // New fields
  brand: string; // Manufacturer or brand name
  pricePerPiece: number; // Unit price for each item
  supplierId: string; // Reference to Supplier.id
  maintainStockAt: number; // Target/optimal stock level
  minimumStock: number; // Minimum stock level (same as reorderLevel)
  photoUrl?: string; // Optional product photo URL
}

export interface CreateInventoryItemInput {
  id?: string; // optional; will be generated if omitted
  name: string;
  category: InventoryCategory;
  quantity: number;
  location: string;
  reorderLevel: number;
  // New fields
  brand: string;
  pricePerPiece: number;
  supplierId: string;
  maintainStockAt: number;
  minimumStock: number;
  photoUrl?: string;
}

export interface UpdateInventoryItemInput {
  id: string;
  name?: string;
  category?: InventoryCategory;
  quantity?: number;
  location?: string;
  reorderLevel?: number;
  // New fields
  brand?: string;
  pricePerPiece?: number;
  supplierId?: string;
  maintainStockAt?: number;
  minimumStock?: number;
  photoUrl?: string;
}

export interface Supplier {
  id: string;
  name: string; // company name
  contact: string;
  email: string;
  phone: string;
  category: string;
  status: "Active" | "Inactive";
}

export interface CreateSupplierInput {
  id?: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
  status?: "Active" | "Inactive";
}

export interface UpdateSupplierInput {
  id: string;
  name?: string;
  contact?: string;
  email?: string;
  phone?: string;
  category?: string;
  status?: "Active" | "Inactive";
}

export interface Order {
  id: string;
  customer: string;
  items: number;
  total: string; // keep formatted for now
  status: "Pending" | "Processing" | "Shipped" | "Delivered";
  date: string; // ISO or display string
}

export interface Shipment {
  id: string;
  orderId: string;
  destination: string;
  carrier: string;
  status: "Pending" | "Processing" | "In Transit" | "Delivered";
  eta: string;
}

// Favorites & Bookmarks Types
export type EntityType = "inventory" | "orders" | "purchase-orders" | "shipments" | "suppliers";

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
  supplierId: string;
  supplierName: string;
  items: POLineItem[];
  totalAmount: number;
  status: POStatus;
  createdBy: string;
  createdDate: string; // ISO date
  approvedBy: string | null;
  approvedDate: string | null;
  receivedDate: string | null;
  notes: string;
  expectedDeliveryDate: string; // ISO date
  actualCost?: number; // Actual cost when received (for variance tracking)
}

export interface CreatePurchaseOrderInput {
  id?: string;
  supplierId: string;
  supplierName: string;
  items: Omit<POLineItem, 'quantityReceived'>[];
  expectedDeliveryDate: string;
  notes?: string;
  createdBy: string;
}

export interface UpdatePurchaseOrderInput {
  id: string;
  supplierId?: string;
  supplierName?: string;
  items?: POLineItem[];
  expectedDeliveryDate?: string;
  notes?: string;
  status?: POStatus;
  approvedBy?: string;
  approvedDate?: string;
  receivedDate?: string;
  actualCost?: number;
}