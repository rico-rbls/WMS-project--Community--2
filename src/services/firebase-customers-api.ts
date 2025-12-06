/**
 * Firebase Customers API Service
 *
 * This module provides CRUD operations for customers using Firestore.
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
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
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
 * Generate a sequential ID for customers (e.g., "CUST-001", "CUST-002")
 */
async function generateSequentialId(): Promise<string> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.CUSTOMERS));
  let maxNum = 0;

  snapshot.forEach((docSnap) => {
    const id = docSnap.id;
    const match = id.match(/CUST-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  return `CUST-${String(maxNum + 1).padStart(3, "0")}`;
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
// CUSTOMERS CRUD OPERATIONS
// ============================================================================

/**
 * Get all customers from Firestore
 */
export async function getFirebaseCustomers(): Promise<Customer[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.CUSTOMERS));
  const customers: Customer[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    customers.push({
      id: docSnap.id,
      name: data.name || "",
      contact: data.contact || "",
      email: data.email || "",
      phone: data.phone || "",
      category: data.category || "",
      status: data.status || "Active",
      country: data.country || "",
      city: data.city || "",
      address: data.address || "",
      purchases: data.purchases || 0,
      payments: data.payments || 0,
      balance: data.balance || 0,
      archived: data.archived || false,
      archivedAt: data.archivedAt,
    });
  });

  return customers;
}

/**
 * Subscribe to customers changes (real-time updates)
 * Returns an unsubscribe function
 */
export function subscribeToCustomers(
  callback: (customers: Customer[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(db, COLLECTIONS.CUSTOMERS),
    (snapshot) => {
      const customers: Customer[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        customers.push({
          id: docSnap.id,
          name: data.name || "",
          contact: data.contact || "",
          email: data.email || "",
          phone: data.phone || "",
          category: data.category || "",
          status: data.status || "Active",
          country: data.country || "",
          city: data.city || "",
          address: data.address || "",
          purchases: data.purchases || 0,
          payments: data.payments || 0,
          balance: data.balance || 0,
          archived: data.archived || false,
          archivedAt: data.archivedAt,
        });
      });
      callback(customers);
    },
    (error) => {
      console.error("Customers subscription error:", error);
      onError?.(error);
    }
  );
}

/**
 * Create a new customer in Firestore
 */
export async function createFirebaseCustomer(input: CreateCustomerInput): Promise<Customer> {
  const id = input.id && input.id.trim() !== "" ? input.id : await generateSequentialId();

  // Check if ID already exists
  const existingDoc = await getDoc(doc(db, COLLECTIONS.CUSTOMERS, id));
  if (existingDoc.exists()) {
    throw new Error(`Customer with id ${id} already exists`);
  }

  const purchases = input.purchases ?? 0;
  const payments = input.payments ?? 0;
  const balance = purchases - payments;

  const customer: Customer = {
    id,
    name: input.name,
    contact: input.contact || "",
    email: input.email,
    phone: input.phone || "",
    category: input.category || "",
    status: input.status ?? "Active",
    country: input.country ?? "",
    city: input.city ?? "",
    address: input.address ?? "",
    purchases,
    payments,
    balance,
  };

  await setDoc(doc(db, COLLECTIONS.CUSTOMERS, id), removeUndefinedFields(customer));
  return customer;
}

/**
 * Update an existing customer in Firestore
 */
export async function updateFirebaseCustomer(input: UpdateCustomerInput): Promise<Customer> {
  const docRef = doc(db, COLLECTIONS.CUSTOMERS, input.id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Customer not found");
  }

  const prev = existingDoc.data() as Customer;
  const next: Customer = { ...prev, ...removeUndefinedFields(input) } as Customer;

  // Recalculate balance if purchases or payments changed
  if (input.purchases !== undefined || input.payments !== undefined) {
    next.balance = next.purchases - next.payments;
  }

  await updateDoc(docRef, removeUndefinedFields(next));
  return next;
}

/**
 * Delete a customer from Firestore
 */
export async function deleteFirebaseCustomer(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.CUSTOMERS, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Customer not found");
  }

  await deleteDoc(docRef);
}

/**
 * Archive a customer (soft delete)
 */
export async function archiveFirebaseCustomer(id: string): Promise<Customer> {
  const docRef = doc(db, COLLECTIONS.CUSTOMERS, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Customer not found");
  }

  const prev = existingDoc.data() as Customer;
  const updated: Customer = {
    ...prev,
    archived: true,
    archivedAt: new Date().toISOString(),
  };

  await updateDoc(docRef, { archived: true, archivedAt: updated.archivedAt });
  return updated;
}

/**
 * Restore an archived customer
 */
export async function restoreFirebaseCustomer(id: string): Promise<Customer> {
  const docRef = doc(db, COLLECTIONS.CUSTOMERS, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Customer not found");
  }

  const prev = existingDoc.data() as Customer;
  const updated: Customer = {
    ...prev,
    archived: false,
    archivedAt: undefined,
  };

  await updateDoc(docRef, { archived: false, archivedAt: null });
  return updated;
}

/**
 * Permanently delete a customer
 */
export async function permanentlyDeleteFirebaseCustomer(id: string): Promise<void> {
  await deleteFirebaseCustomer(id);
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk archive customers
 */
export async function bulkArchiveFirebaseCustomers(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;
  const archivedAt = new Date().toISOString();

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Customer ${id} not found`);
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
 * Bulk restore customers
 */
export async function bulkRestoreFirebaseCustomers(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Customer ${id} not found`);
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
 * Bulk permanently delete customers
 */
export async function bulkPermanentlyDeleteFirebaseCustomers(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Customer ${id} not found`);
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

