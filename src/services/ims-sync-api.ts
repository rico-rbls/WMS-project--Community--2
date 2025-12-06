/**
 * IMS (Inventory Management System) Sync API
 * 
 * Handles automatic synchronization of inventory from WMS to IMS
 * when sales orders are marked as delivered.
 * 
 * WMS and IMS share the same Firebase project (nosql-demo-e5885)
 * - WMS collections are prefixed with 'wms_' or use specific names
 * - IMS products collection is named 'products' (no prefix)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db, COLLECTIONS } from "../lib/firebase";
import type { SalesOrder, InventoryItem, Supplier } from "../types";
import { getFirebaseSuppliers } from "./firebase-inventory-api";

// IMS Product interface (matching IMS schema)
export interface IMSProduct {
  brand: string;
  category: string;
  createdAt: ReturnType<typeof serverTimestamp> | Date;
  description: string;
  images: string[];
  minQuantity: number;
  name: string;
  price: number;
  quantity: number;
  sku: string; // Using WMS inventory ID as SKU
  sold: number;
  status: "in-stock" | "out-of-stock" | "low-stock";
  supplier: string;
  updatedAt: ReturnType<typeof serverTimestamp> | Date;
  // WMS reference fields for traceability
  wmsInventoryId: string;
  wmsSalesOrderId?: string;
  lastSyncedFromWMS?: ReturnType<typeof serverTimestamp> | Date;
}

// Helper to compute IMS product status
function computeIMSStatus(quantity: number, minQuantity: number): IMSProduct["status"] {
  if (quantity <= 0) return "out-of-stock";
  if (quantity <= minQuantity) return "low-stock";
  return "in-stock";
}

// Helper to generate IMS SKU from WMS inventory ID
function generateIMSSku(wmsInventoryId: string): string {
  // Convert WMS ID format (INV-001) to IMS SKU format
  return `WMS-${wmsInventoryId.replace("INV-", "")}`;
}

/**
 * Transform WMS Inventory Item to IMS Product format
 */
function transformToIMSProduct(
  inventoryItem: InventoryItem,
  deliveredQuantity: number,
  supplierName: string,
  salesOrderId: string
): Partial<IMSProduct> {
  const minQuantity = inventoryItem.reorderLevel || 10;
  const status = computeIMSStatus(deliveredQuantity, minQuantity);

  return {
    brand: inventoryItem.brand || "",
    category: inventoryItem.category || "Uncategorized",
    description: inventoryItem.description || "",
    images: inventoryItem.photoUrl ? [inventoryItem.photoUrl] : [],
    minQuantity,
    name: inventoryItem.name,
    price: inventoryItem.pricePerPiece || 0,
    quantity: deliveredQuantity,
    sku: generateIMSSku(inventoryItem.id),
    sold: 0,
    status,
    supplier: supplierName,
    wmsInventoryId: inventoryItem.id,
    wmsSalesOrderId: salesOrderId,
  };
}

/**
 * Find existing IMS product by WMS inventory ID
 */
async function findIMSProductByWMSId(wmsInventoryId: string): Promise<{ docId: string; data: IMSProduct } | null> {
  const productsRef = collection(db, COLLECTIONS.IMS_PRODUCTS);
  const q = query(productsRef, where("wmsInventoryId", "==", wmsInventoryId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    // Also check by SKU as fallback
    const sku = generateIMSSku(wmsInventoryId);
    const skuQuery = query(productsRef, where("sku", "==", sku));
    const skuSnapshot = await getDocs(skuQuery);
    
    if (skuSnapshot.empty) return null;
    
    const firstDoc = skuSnapshot.docs[0];
    return { docId: firstDoc.id, data: firstDoc.data() as IMSProduct };
  }

  const firstDoc = snapshot.docs[0];
  return { docId: firstDoc.id, data: firstDoc.data() as IMSProduct };
}

/**
 * Sync inventory items from a delivered sales order to IMS products collection
 */
export async function syncInventoryToIMS(
  salesOrder: SalesOrder,
  inventoryItems: InventoryItem[]
): Promise<{ success: boolean; syncedItems: number; errors: string[] }> {
  const errors: string[] = [];
  let syncedItems = 0;

  try {
    // Get all suppliers for name lookup
    const suppliers = await getFirebaseSuppliers();
    const supplierMap = new Map<string, string>();
    suppliers.forEach((s) => supplierMap.set(s.id, s.name));

    // Create inventory lookup map
    const inventoryMap = new Map<string, InventoryItem>();
    inventoryItems.forEach((item) => inventoryMap.set(item.id, item));

    // Process each item in the sales order
    for (const orderItem of salesOrder.items) {
      try {
        const invItem = inventoryMap.get(orderItem.inventoryItemId);
        if (!invItem) {
          errors.push(`Inventory item ${orderItem.inventoryItemId} not found`);
          continue;
        }

        const supplierName = supplierMap.get(invItem.supplierId) || "Unknown Supplier";
        const deliveredQty = orderItem.quantity;

        // Check if product already exists in IMS
        const existingProduct = await findIMSProductByWMSId(invItem.id);

        if (existingProduct) {
          // Update existing product - ADD to quantity
          const newQuantity = (existingProduct.data.quantity || 0) + deliveredQty;
          const newStatus = computeIMSStatus(newQuantity, existingProduct.data.minQuantity || 10);

          await updateDoc(doc(db, COLLECTIONS.IMS_PRODUCTS, existingProduct.docId), {
            quantity: newQuantity,
            status: newStatus,
            updatedAt: serverTimestamp(),
            lastSyncedFromWMS: serverTimestamp(),
            wmsSalesOrderId: salesOrder.id,
          });

          console.log(`[IMS Sync] Updated product ${invItem.name}: +${deliveredQty} (total: ${newQuantity})`);
        } else {
          // Create new product in IMS
          const newProduct = transformToIMSProduct(invItem, deliveredQty, supplierName, salesOrder.id);
          
          // Generate a unique document ID
          const docId = `wms-${invItem.id.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
          
          await setDoc(doc(db, COLLECTIONS.IMS_PRODUCTS, docId), {
            ...newProduct,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastSyncedFromWMS: serverTimestamp(),
          });

          console.log(`[IMS Sync] Created new product ${invItem.name} with qty ${deliveredQty}`);
        }

        syncedItems++;
      } catch (itemError: any) {
        const errMsg = `Failed to sync item ${orderItem.itemName}: ${itemError.message}`;
        errors.push(errMsg);
        console.error(`[IMS Sync] ${errMsg}`);
      }
    }

    return { success: errors.length === 0, syncedItems, errors };
  } catch (error: any) {
    console.error("[IMS Sync] Fatal error:", error);
    return { success: false, syncedItems: 0, errors: [error.message] };
  }
}

