/**
 * Firebase Payments API Service
 *
 * This module provides CRUD operations for payment transactions using Firestore.
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
  PaymentTransaction,
  CreatePaymentTransactionInput,
  UpdatePaymentTransactionInput,
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
 * Generate a sequential ID for payments (e.g., "TRX-001", "TRX-002")
 */
async function generateSequentialId(): Promise<string> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.PAYMENT_TRANSACTIONS));
  let maxNum = 0;

  snapshot.forEach((docSnap) => {
    const id = docSnap.id;
    const match = id.match(/TRX-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  return `TRX-${String(maxNum + 1).padStart(3, "0")}`;
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
// PAYMENT TRANSACTIONS CRUD OPERATIONS
// ============================================================================

/**
 * Get all payment transactions from Firestore
 */
export async function getFirebasePayments(): Promise<PaymentTransaction[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.PAYMENT_TRANSACTIONS));
  const payments: PaymentTransaction[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    payments.push({
      id: docSnap.id,
      trxDate: data.trxDate || "",
      supplierId: data.supplierId || "",
      supplierName: data.supplierName || "",
      country: data.country || "",
      city: data.city || "",
      poId: data.poId || "",
      billNumber: data.billNumber || "",
      paymentMode: data.paymentMode || "Cash",
      amountPaid: data.amountPaid || 0,
      notes: data.notes || "",
      createdAt: data.createdAt || "",
      createdBy: data.createdBy || "",
      updatedAt: data.updatedAt,
      archived: data.archived || false,
      archivedAt: data.archivedAt,
    });
  });

  return payments;
}

/**
 * Subscribe to payment transactions changes (real-time updates)
 * Returns an unsubscribe function
 */
export function subscribeToPayments(
  callback: (payments: PaymentTransaction[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(db, COLLECTIONS.PAYMENT_TRANSACTIONS),
    (snapshot) => {
      const payments: PaymentTransaction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        payments.push({
          id: docSnap.id,
          trxDate: data.trxDate || "",
          supplierId: data.supplierId || "",
          supplierName: data.supplierName || "",
          country: data.country || "",
          city: data.city || "",
          poId: data.poId || "",
          billNumber: data.billNumber || "",
          paymentMode: data.paymentMode || "Cash",
          amountPaid: data.amountPaid || 0,
          notes: data.notes || "",
          createdAt: data.createdAt || "",
          createdBy: data.createdBy || "",
          updatedAt: data.updatedAt,
          archived: data.archived || false,
          archivedAt: data.archivedAt,
        });
      });
      callback(payments);
    },
    (error) => {
      console.error("Payments subscription error:", error);
      onError?.(error);
    }
  );
}

/**
 * Create a new payment transaction in Firestore
 */
export async function createFirebasePayment(input: CreatePaymentTransactionInput): Promise<PaymentTransaction> {
  const id = input.id && input.id.trim() !== "" ? input.id : await generateSequentialId();

  // Check if ID already exists
  const existingDoc = await getDoc(doc(db, COLLECTIONS.PAYMENT_TRANSACTIONS, id));
  if (existingDoc.exists()) {
    throw new Error(`Payment with id ${id} already exists`);
  }

  const payment: PaymentTransaction = {
    id,
    trxDate: input.trxDate,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    country: input.country ?? "",
    city: input.city ?? "",
    poId: input.poId,
    billNumber: input.billNumber ?? "",
    paymentMode: input.paymentMode,
    amountPaid: input.amountPaid,
    notes: input.notes ?? "",
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };

  await setDoc(doc(db, COLLECTIONS.PAYMENT_TRANSACTIONS, id), removeUndefinedFields(payment));
  return payment;
}

/**
 * Update an existing payment transaction in Firestore
 */
export async function updateFirebasePayment(input: UpdatePaymentTransactionInput): Promise<PaymentTransaction> {
  const docRef = doc(db, COLLECTIONS.PAYMENT_TRANSACTIONS, input.id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Payment not found");
  }

  const prev = existingDoc.data() as PaymentTransaction;
  const next: PaymentTransaction = {
    ...prev,
    ...removeUndefinedFields(input),
    updatedAt: new Date().toISOString(),
  } as PaymentTransaction;

  await updateDoc(docRef, removeUndefinedFields(next));
  return next;
}

/**
 * Delete a payment transaction from Firestore
 */
export async function deleteFirebasePayment(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PAYMENT_TRANSACTIONS, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Payment not found");
  }

  await deleteDoc(docRef);
}

/**
 * Archive a payment (soft delete)
 */
export async function archiveFirebasePayment(id: string): Promise<PaymentTransaction> {
  const docRef = doc(db, COLLECTIONS.PAYMENT_TRANSACTIONS, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Payment not found");
  }

  const prev = existingDoc.data() as PaymentTransaction;
  const updated: PaymentTransaction = {
    ...prev,
    archived: true,
    archivedAt: new Date().toISOString(),
  };

  await updateDoc(docRef, { archived: true, archivedAt: updated.archivedAt });
  return updated;
}

/**
 * Restore an archived payment
 */
export async function restoreFirebasePayment(id: string): Promise<PaymentTransaction> {
  const docRef = doc(db, COLLECTIONS.PAYMENT_TRANSACTIONS, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Payment not found");
  }

  const prev = existingDoc.data() as PaymentTransaction;
  const updated: PaymentTransaction = {
    ...prev,
    archived: false,
    archivedAt: undefined,
  };

  await updateDoc(docRef, { archived: false, archivedAt: null });
  return updated;
}

/**
 * Permanently delete a payment
 */
export async function permanentlyDeleteFirebasePayment(id: string): Promise<void> {
  await deleteFirebasePayment(id);
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk archive payments
 */
export async function bulkArchiveFirebasePayments(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;
  const archivedAt = new Date().toISOString();

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.PAYMENT_TRANSACTIONS, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Payment ${id} not found`);
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
 * Bulk restore payments
 */
export async function bulkRestoreFirebasePayments(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.PAYMENT_TRANSACTIONS, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Payment ${id} not found`);
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
 * Bulk permanently delete payments
 */
export async function bulkPermanentlyDeleteFirebasePayments(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.PAYMENT_TRANSACTIONS, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Payment ${id} not found`);
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

