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
export type EntityType = "inventory" | "orders" | "shipments" | "suppliers";

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