/**
 * Firebase Sales Orders API Service
 *
 * This module provides CRUD operations for sales orders using Firestore.
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
  SalesOrder,
  CreateSalesOrderInput,
  UpdateSalesOrderInput,
  ReceiptStatus,
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
 * Generate a sequential ID for sales orders (e.g., "SO-001", "SO-002")
 */
async function generateSequentialId(): Promise<string> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.SALES_ORDERS));
  let maxNum = 0;

  snapshot.forEach((docSnap) => {
    const id = docSnap.id;
    const match = id.match(/SO-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  return `SO-${String(maxNum + 1).padStart(3, "0")}`;
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
// SALES ORDERS CRUD OPERATIONS
// ============================================================================

/**
 * Get all sales orders from Firestore
 */
export async function getFirebaseSalesOrders(): Promise<SalesOrder[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.SALES_ORDERS));
  const orders: SalesOrder[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    orders.push({
      id: docSnap.id,
      soDate: data.soDate || "",
      customerId: data.customerId || "",
      customerName: data.customerName || "",
      customerCountry: data.customerCountry || "",
      customerCity: data.customerCity || "",
      deliveryAddress: data.deliveryAddress || "",
      invoiceNumber: data.invoiceNumber || "",
      items: data.items || [],
      totalAmount: data.totalAmount || 0,
      totalReceived: data.totalReceived || 0,
      amountPaid: data.amountPaid || 0,
      soBalance: data.soBalance || 0,
      receiptStatus: data.receiptStatus || "Unpaid",
      shippingStatus: data.shippingStatus || "Pending",
      createdBy: data.createdBy || "",
      createdDate: data.createdDate || "",
      notes: data.notes || "",
      expectedDeliveryDate: data.expectedDeliveryDate || "",
      archived: data.archived || false,
      archivedAt: data.archivedAt,
    });
  });

  return orders;
}

/**
 * Subscribe to sales orders changes (real-time updates)
 * Returns an unsubscribe function
 */
export function subscribeToSalesOrders(
  callback: (orders: SalesOrder[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(db, COLLECTIONS.SALES_ORDERS),
    (snapshot) => {
      const orders: SalesOrder[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        orders.push({
          id: docSnap.id,
          soDate: data.soDate || "",
          customerId: data.customerId || "",
          customerName: data.customerName || "",
          customerCountry: data.customerCountry || "",
          customerCity: data.customerCity || "",
          deliveryAddress: data.deliveryAddress || "",
          invoiceNumber: data.invoiceNumber || "",
          items: data.items || [],
          totalAmount: data.totalAmount || 0,
          totalReceived: data.totalReceived || 0,
          amountPaid: data.amountPaid || 0,
          soBalance: data.soBalance || 0,
          receiptStatus: data.receiptStatus || "Unpaid",
          shippingStatus: data.shippingStatus || "Pending",
          createdBy: data.createdBy || "",
          createdDate: data.createdDate || "",
          notes: data.notes || "",
          expectedDeliveryDate: data.expectedDeliveryDate || "",
          archived: data.archived || false,
          archivedAt: data.archivedAt,
        });
      });
      callback(orders);
    },
    (error) => {
      console.error("Sales orders subscription error:", error);
      onError?.(error);
    }
  );
}

/**
 * Create a new sales order in Firestore
 */
export async function createFirebaseSalesOrder(input: CreateSalesOrderInput): Promise<SalesOrder> {
  const id = input.id && input.id.trim() !== "" ? input.id : await generateSequentialId();

  // Check if ID already exists
  const existingDoc = await getDoc(doc(db, COLLECTIONS.SALES_ORDERS, id));
  if (existingDoc.exists()) {
    throw new Error(`Sales Order with id ${id} already exists`);
  }

  const totalAmount = input.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalReceived = input.totalReceived ?? 0;
  const amountPaid = input.amountPaid ?? 0;
  const soBalance = totalAmount - totalReceived;
  const soDate = input.soDate ?? new Date().toISOString().split("T")[0];

  // Determine receipt status based on payment
  let receiptStatus: ReceiptStatus = input.receiptStatus ?? "Unpaid";
  if (!input.receiptStatus) {
    if (totalReceived >= totalAmount) {
      receiptStatus = "Paid";
    } else if (totalReceived > 0) {
      receiptStatus = "Partially Paid";
    }
  }

  const salesOrder: SalesOrder = {
    id,
    soDate,
    customerId: input.customerId,
    customerName: input.customerName,
    customerCountry: input.customerCountry ?? "",
    customerCity: input.customerCity ?? "",
    deliveryAddress: input.deliveryAddress ?? "",
    invoiceNumber: input.invoiceNumber ?? "",
    items: input.items.map(item => ({ ...item, quantityShipped: 0 })),
    totalAmount,
    totalReceived,
    amountPaid,
    soBalance,
    receiptStatus,
    shippingStatus: input.shippingStatus ?? "Pending",
    createdBy: input.createdBy,
    createdDate: soDate,
    notes: input.notes ?? "",
    expectedDeliveryDate: input.expectedDeliveryDate ?? "",
  };

  await setDoc(doc(db, COLLECTIONS.SALES_ORDERS, id), removeUndefinedFields(salesOrder));
  return salesOrder;
}

/**
 * Update an existing sales order in Firestore
 */
export async function updateFirebaseSalesOrder(input: UpdateSalesOrderInput): Promise<SalesOrder> {
  const docRef = doc(db, COLLECTIONS.SALES_ORDERS, input.id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Sales Order not found");
  }

  const prev = existingDoc.data() as SalesOrder;
  const next: SalesOrder = { ...prev, ...removeUndefinedFields(input) } as SalesOrder;

  // Recalculate totalAmount if items changed
  if (input.items) {
    next.totalAmount = input.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  // Recalculate soBalance
  next.soBalance = next.totalAmount - next.totalReceived;

  // Auto-update receiptStatus based on payment if not explicitly set
  if (input.totalReceived !== undefined && input.receiptStatus === undefined) {
    if (next.totalReceived >= next.totalAmount && next.totalAmount > 0) {
      next.receiptStatus = "Paid";
    } else if (next.totalReceived > 0) {
      next.receiptStatus = "Partially Paid";
    } else {
      if (prev.receiptStatus !== "Overdue") {
        next.receiptStatus = "Unpaid";
      }
    }
  }

  await updateDoc(docRef, removeUndefinedFields(next));
  return next;
}

/**
 * Delete a sales order from Firestore
 */
export async function deleteFirebaseSalesOrder(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SALES_ORDERS, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Sales Order not found");
  }

  await deleteDoc(docRef);
}

/**
 * Archive a sales order (soft delete)
 */
export async function archiveFirebaseSalesOrder(id: string): Promise<SalesOrder> {
  const docRef = doc(db, COLLECTIONS.SALES_ORDERS, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Sales Order not found");
  }

  const prev = existingDoc.data() as SalesOrder;
  const updated: SalesOrder = {
    ...prev,
    archived: true,
    archivedAt: new Date().toISOString(),
  };

  await updateDoc(docRef, { archived: true, archivedAt: updated.archivedAt });
  return updated;
}

/**
 * Restore an archived sales order
 */
export async function restoreFirebaseSalesOrder(id: string): Promise<SalesOrder> {
  const docRef = doc(db, COLLECTIONS.SALES_ORDERS, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Sales Order not found");
  }

  const prev = existingDoc.data() as SalesOrder;
  const updated: SalesOrder = {
    ...prev,
    archived: false,
    archivedAt: undefined,
  };

  await updateDoc(docRef, { archived: false, archivedAt: null });
  return updated;
}

/**
 * Permanently delete a sales order
 */
export async function permanentlyDeleteFirebaseSalesOrder(id: string): Promise<void> {
  await deleteFirebaseSalesOrder(id);
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk archive sales orders
 */
export async function bulkArchiveFirebaseSalesOrders(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;
  const archivedAt = new Date().toISOString();

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.SALES_ORDERS, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Sales Order ${id} not found`);
      continue;
    }

    batch.update(docRef, { archived: true, archivedAt });
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
 * Bulk restore sales orders
 */
export async function bulkRestoreFirebaseSalesOrders(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.SALES_ORDERS, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Sales Order ${id} not found`);
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
 * Bulk permanently delete sales orders
 */
export async function bulkPermanentlyDeleteFirebaseSalesOrders(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.SALES_ORDERS, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Sales Order ${id} not found`);
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

