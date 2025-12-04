/**
 * Firebase Inventory API Service
 *
 * This module provides CRUD operations for inventory items using Firestore.
 * It maintains the same function signatures as the existing API for compatibility.
 */

import {
  db,
  COLLECTIONS,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "../lib/firebase";

import type {
  InventoryItem,
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
} from "../types";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Remove undefined values from an object (Firestore doesn't accept undefined)
 */
function removeUndefinedFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result as Partial<T>;
}

/**
 * Compute inventory status based on quantity and reorder level/flag
 */
function computeStatus(quantity: number, reorderRequired: boolean, reorderLevel?: number): InventoryItem["status"] {
  if (quantity <= 0) return "Critical";
  // Auto-set reorderRequired if quantity is at or below reorderLevel
  if (reorderLevel !== undefined && quantity <= reorderLevel) return "Low Stock";
  if (reorderRequired) return "Low Stock";
  return "In Stock";
}

/**
 * Generate a sequential ID for inventory items (e.g., "INV-001", "INV-002")
 */
async function generateSequentialId(): Promise<string> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.INVENTORY));
  let maxNum = 0;

  snapshot.forEach((docSnap) => {
    const id = docSnap.id;
    const match = id.match(/INV-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  return `INV-${String(maxNum + 1).padStart(3, "0")}`;
}

// ============================================================================
// Bulk Operation Result Type
// ============================================================================

export interface BulkOperationResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  errors?: string[];
}

// ============================================================================
// INVENTORY CRUD OPERATIONS
// ============================================================================

/**
 * Get all inventory items from Firestore
 */
export async function getInventory(): Promise<InventoryItem[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.INVENTORY));
  const items: InventoryItem[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    items.push({
      id: docSnap.id,
      name: data.name,
      category: data.category,
      subcategory: data.subcategory,
      quantity: data.quantity || 0,
      location: data.location,
      status: data.status || computeStatus(data.quantity || 0, data.reorderRequired || false, data.reorderLevel),
      brand: data.brand || "",
      pricePerPiece: data.pricePerPiece || 0,
      supplierId: data.supplierId || "",
      quantityPurchased: data.quantityPurchased || 0,
      quantitySold: data.quantitySold || 0,
      reorderRequired: data.reorderRequired || false,
      reorderLevel: data.reorderLevel,
      photoUrl: data.photoUrl,
      description: data.description,
      archived: data.archived || false,
      archivedAt: data.archivedAt,
    });
  });

  return items;
}

/**
 * Subscribe to inventory changes (real-time updates)
 * Returns an unsubscribe function
 */
export function subscribeToInventory(
  callback: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(db, COLLECTIONS.INVENTORY),
    (snapshot) => {
      const items: InventoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.name,
          category: data.category,
          subcategory: data.subcategory,
          quantity: data.quantity || 0,
          location: data.location,
          status: data.status || computeStatus(data.quantity || 0, data.reorderRequired || false, data.reorderLevel),
          brand: data.brand || "",
          pricePerPiece: data.pricePerPiece || 0,
          supplierId: data.supplierId || "",
          quantityPurchased: data.quantityPurchased || 0,
          quantitySold: data.quantitySold || 0,
          reorderRequired: data.reorderRequired || false,
          reorderLevel: data.reorderLevel,
          photoUrl: data.photoUrl,
          description: data.description,
          archived: data.archived || false,
          archivedAt: data.archivedAt,
        });
      });
      callback(items);
    },
    onError
  );
}

/**
 * Create a new inventory item
 */
export async function createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
  const id = input.id && input.id.trim() !== ""
    ? input.id
    : await generateSequentialId();

  const quantity = Math.max(0, Math.floor(input.quantity));
  const quantityPurchased = Math.max(0, Math.floor(input.quantityPurchased));
  const quantitySold = Math.max(0, Math.floor(input.quantitySold));
  const reorderLevel = input.reorderLevel !== undefined ? Math.max(0, Math.floor(input.reorderLevel)) : undefined;

  // Auto-compute reorderRequired based on reorderLevel if defined
  const reorderRequired = reorderLevel !== undefined && quantity <= reorderLevel ? true : input.reorderRequired;
  const status = computeStatus(quantity, reorderRequired, reorderLevel);

  const item: InventoryItem = {
    id,
    name: input.name.trim(),
    category: input.category,
    subcategory: input.subcategory,
    quantity,
    location: input.location.trim(),
    status,
    brand: input.brand.trim(),
    pricePerPiece: input.pricePerPiece,
    supplierId: input.supplierId.trim(),
    quantityPurchased,
    quantitySold,
    reorderRequired,
    reorderLevel,
    photoUrl: input.photoUrl,
    description: input.description,
  };

  // Check if ID already exists
  const existingDoc = await getDoc(doc(db, COLLECTIONS.INVENTORY, id));
  if (existingDoc.exists()) {
    throw new Error(`Item with id ${id} already exists`);
  }

  // Remove undefined fields before writing to Firestore
  const cleanedItem = removeUndefinedFields(item as Record<string, unknown>);
  await setDoc(doc(db, COLLECTIONS.INVENTORY, id), cleanedItem);
  return item;
}

/**
 * Update an existing inventory item
 */
export async function updateInventoryItem(input: UpdateInventoryItemInput): Promise<InventoryItem> {
  const docRef = doc(db, COLLECTIONS.INVENTORY, input.id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Item not found");
  }

  const prev = existingDoc.data() as InventoryItem;
  const quantity = input.quantity !== undefined ? Math.max(0, Math.floor(input.quantity)) : prev.quantity;
  const quantityPurchased = input.quantityPurchased !== undefined
    ? Math.max(0, Math.floor(input.quantityPurchased))
    : prev.quantityPurchased;
  const quantitySold = input.quantitySold !== undefined
    ? Math.max(0, Math.floor(input.quantitySold))
    : prev.quantitySold;
  const reorderLevel = input.reorderLevel !== undefined
    ? Math.max(0, Math.floor(input.reorderLevel))
    : prev.reorderLevel;

  // Auto-compute reorderRequired based on reorderLevel if defined
  let reorderRequired = input.reorderRequired !== undefined ? input.reorderRequired : prev.reorderRequired;
  if (reorderLevel !== undefined && quantity <= reorderLevel) {
    reorderRequired = true;
  }

  const updated: InventoryItem = {
    ...prev,
    ...input,
    quantity,
    quantityPurchased,
    quantitySold,
    reorderRequired,
    reorderLevel,
    status: computeStatus(quantity, reorderRequired, reorderLevel),
  };

  // Remove undefined fields before writing to Firestore
  const cleanedUpdate = removeUndefinedFields(updated as Record<string, unknown>);
  await updateDoc(docRef, cleanedUpdate);
  return updated;
}

/**
 * Delete an inventory item
 */
export async function deleteInventoryItem(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.INVENTORY, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Item not found");
  }

  await deleteDoc(docRef);
}

/**
 * Archive (soft delete) an inventory item
 */
export async function archiveInventoryItem(id: string): Promise<InventoryItem> {
  const docRef = doc(db, COLLECTIONS.INVENTORY, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Item not found");
  }

  const prev = existingDoc.data() as InventoryItem;
  const updated: InventoryItem = {
    ...prev,
    id,
    archived: true,
    archivedAt: new Date().toISOString(),
  };

  await updateDoc(docRef, { archived: true, archivedAt: new Date().toISOString() });
  return updated;
}

/**
 * Restore an archived inventory item
 */
export async function restoreInventoryItem(id: string): Promise<InventoryItem> {
  const docRef = doc(db, COLLECTIONS.INVENTORY, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Item not found");
  }

  const prev = existingDoc.data() as InventoryItem;
  const updated: InventoryItem = {
    ...prev,
    id,
    archived: false,
    archivedAt: undefined,
  };

  await updateDoc(docRef, { archived: false, archivedAt: null });
  return updated;
}

/**
 * Permanently delete an inventory item (same as deleteInventoryItem)
 */
export async function permanentlyDeleteInventoryItem(id: string): Promise<void> {
  await deleteInventoryItem(id);
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Archive multiple inventory items at once
 */
export async function bulkArchiveInventoryItems(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.INVENTORY, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Item ${id} not found`);
      continue;
    }

    batch.update(docRef, { archived: true, archivedAt: new Date().toISOString() });
    successCount++;
  }

  await batch.commit();

  return {
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Restore multiple archived inventory items at once
 */
export async function bulkRestoreInventoryItems(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.INVENTORY, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Item ${id} not found`);
      continue;
    }

    batch.update(docRef, { archived: false, archivedAt: null });
    successCount++;
  }

  await batch.commit();

  return {
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Delete multiple inventory items at once
 */
export async function bulkDeleteInventoryItems(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.INVENTORY, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Item ${id} not found`);
      continue;
    }

    batch.delete(docRef);
    successCount++;
  }

  await batch.commit();

  return {
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Permanently delete multiple inventory items at once
 */
export async function bulkPermanentlyDeleteInventoryItems(ids: string[]): Promise<BulkOperationResult> {
  return bulkDeleteInventoryItems(ids);
}

/**
 * Update multiple inventory items at once with the same changes
 */
export async function bulkUpdateInventoryItems(
  ids: string[],
  updates: Partial<Omit<InventoryItem, "id" | "status">>
): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.INVENTORY, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Item ${id} not found`);
      continue;
    }

    const prev = existingDoc.data() as InventoryItem;
    const quantity = updates.quantity !== undefined ? Math.max(0, Math.floor(updates.quantity)) : prev.quantity;
    const reorderRequired = updates.reorderRequired !== undefined ? updates.reorderRequired : prev.reorderRequired;
    const status = computeStatus(quantity, reorderRequired);

    batch.update(docRef, { ...updates, status });
    successCount++;
  }

  await batch.commit();

  return {
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}
