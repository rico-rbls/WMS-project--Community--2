/**
 * Firebase Shipments API Service
 *
 * This module provides CRUD operations for shipments using Firestore.
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

import type { Shipment } from "../types";

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
 * Generate a sequential ID for shipments (e.g., "SHIP-0001", "SHIP-0002")
 */
async function generateSequentialId(): Promise<string> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.SHIPMENTS));
  let maxNum = 0;

  snapshot.forEach((docSnap) => {
    const id = docSnap.id;
    const match = id.match(/SHIP-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  return `SHIP-${String(maxNum + 1).padStart(4, "0")}`;
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
// SHIPMENTS CRUD OPERATIONS
// ============================================================================

/**
 * Get all shipments from Firestore
 */
export async function getFirebaseShipments(): Promise<Shipment[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.SHIPMENTS));
  const shipments: Shipment[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    shipments.push({
      id: docSnap.id,
      salesOrderId: data.salesOrderId || "",
      destination: data.destination || "",
      carrier: data.carrier || "",
      status: data.status || "Pending",
      eta: data.eta || "",
      archived: data.archived || false,
      archivedAt: data.archivedAt,
    });
  });

  return shipments;
}

/**
 * Subscribe to shipments changes (real-time updates)
 * Returns an unsubscribe function
 */
export function subscribeToShipments(
  callback: (shipments: Shipment[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(db, COLLECTIONS.SHIPMENTS),
    (snapshot) => {
      const shipments: Shipment[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        shipments.push({
          id: docSnap.id,
          salesOrderId: data.salesOrderId || "",
          destination: data.destination || "",
          carrier: data.carrier || "",
          status: data.status || "Pending",
          eta: data.eta || "",
          archived: data.archived || false,
          archivedAt: data.archivedAt,
        });
      });
      callback(shipments);
    },
    (error) => {
      console.error("Shipments subscription error:", error);
      onError?.(error);
    }
  );
}

// Create shipment input type
export interface CreateShipmentInput {
  id?: string;
  salesOrderId: string;
  destination: string;
  carrier: string;
  status?: "Pending" | "Processing" | "In Transit" | "Delivered";
  eta: string;
}

// Update shipment input type
export interface UpdateShipmentInput {
  id: string;
  salesOrderId?: string;
  destination?: string;
  carrier?: string;
  status?: "Pending" | "Processing" | "In Transit" | "Delivered";
  eta?: string;
}

/**
 * Create a new shipment in Firestore
 */
export async function createFirebaseShipment(input: CreateShipmentInput): Promise<Shipment> {
  const id = input.id && input.id.trim() !== "" ? input.id : await generateSequentialId();

  // Check if ID already exists
  const existingDoc = await getDoc(doc(db, COLLECTIONS.SHIPMENTS, id));
  if (existingDoc.exists()) {
    throw new Error(`Shipment with id ${id} already exists`);
  }

  const shipment: Shipment = {
    id,
    salesOrderId: input.salesOrderId,
    destination: input.destination,
    carrier: input.carrier,
    status: input.status ?? "Pending",
    eta: input.eta,
  };

  await setDoc(doc(db, COLLECTIONS.SHIPMENTS, id), removeUndefinedFields(shipment));
  return shipment;
}

/**
 * Update an existing shipment in Firestore
 */
export async function updateFirebaseShipment(input: UpdateShipmentInput): Promise<Shipment> {
  const docRef = doc(db, COLLECTIONS.SHIPMENTS, input.id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Shipment not found");
  }

  const prev = existingDoc.data() as Shipment;
  const next: Shipment = { ...prev, ...removeUndefinedFields(input) } as Shipment;

  await updateDoc(docRef, removeUndefinedFields(next));
  return next;
}

/**
 * Delete a shipment from Firestore
 */
export async function deleteFirebaseShipment(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SHIPMENTS, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Shipment not found");
  }

  await deleteDoc(docRef);
}

/**
 * Archive a shipment (soft delete)
 */
export async function archiveFirebaseShipment(id: string): Promise<Shipment> {
  const docRef = doc(db, COLLECTIONS.SHIPMENTS, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Shipment not found");
  }

  const prev = existingDoc.data() as Shipment;
  const updated: Shipment = {
    ...prev,
    archived: true,
    archivedAt: new Date().toISOString(),
  };

  await updateDoc(docRef, { archived: true, archivedAt: updated.archivedAt });
  return updated;
}

/**
 * Restore an archived shipment
 */
export async function restoreFirebaseShipment(id: string): Promise<Shipment> {
  const docRef = doc(db, COLLECTIONS.SHIPMENTS, id);
  const existingDoc = await getDoc(docRef);

  if (!existingDoc.exists()) {
    throw new Error("Shipment not found");
  }

  const prev = existingDoc.data() as Shipment;
  const updated: Shipment = {
    ...prev,
    archived: false,
    archivedAt: undefined,
  };

  await updateDoc(docRef, { archived: false, archivedAt: null });
  return updated;
}

/**
 * Permanently delete a shipment
 */
export async function permanentlyDeleteFirebaseShipment(id: string): Promise<void> {
  await deleteFirebaseShipment(id);
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk archive shipments
 */
export async function bulkArchiveFirebaseShipments(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;
  const archivedAt = new Date().toISOString();

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.SHIPMENTS, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Shipment ${id} not found`);
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
 * Bulk restore shipments
 */
export async function bulkRestoreFirebaseShipments(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.SHIPMENTS, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Shipment ${id} not found`);
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
 * Bulk permanently delete shipments
 */
export async function bulkPermanentlyDeleteFirebaseShipments(ids: string[]): Promise<BulkOperationResult> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    const docRef = doc(db, COLLECTIONS.SHIPMENTS, id);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      errors.push(`Shipment ${id} not found`);
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

