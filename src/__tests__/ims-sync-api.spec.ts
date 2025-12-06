import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SalesOrder, InventoryItem, Supplier } from '../types';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
  COLLECTIONS: {
    INVENTORY: 'inventory',
    IMS_PRODUCTS: 'products',
    WMS_SUPPLIERS: 'wms_suppliers',
  },
}));

vi.mock('../services/firebase-inventory-api', () => ({
  getFirebaseSuppliers: vi.fn(),
}));

// Import after mocks
import { syncInventoryToIMS } from '../services/ims-sync-api';
import { getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseSuppliers } from '../services/firebase-inventory-api';

// Test data factories
function createMockSalesOrder(overrides: Partial<SalesOrder> = {}): SalesOrder {
  return {
    id: 'SO-001',
    soDate: '2025-01-01',
    customerId: 'CUST-001',
    customerName: 'Test Customer',
    customerCountry: 'Philippines',
    customerCity: 'Manila',
    invoiceNumber: 'INV-001',
    items: [
      {
        inventoryItemId: 'INV-001',
        itemName: 'Test Product',
        quantity: 10,
        unitPrice: 100,
        totalPrice: 1000,
      },
    ],
    totalAmount: 1000,
    totalReceived: 1000,
    amountPaid: 1000,
    soBalance: 0,
    receiptStatus: 'Paid',
    shippingStatus: 'Pending',
    createdBy: 'test@example.com',
    createdDate: '2025-01-01',
    notes: '',
    expectedDeliveryDate: '2025-01-07',
    ...overrides,
  };
}

function createMockInventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'INV-001',
    name: 'Test Product',
    category: 'Electronics',
    quantity: 100,
    location: 'A-1',
    status: 'In Stock',
    brand: 'TestBrand',
    pricePerPiece: 100,
    supplierId: 'SUP-001',
    quantityPurchased: 200,
    quantitySold: 100,
    reorderRequired: false,
    reorderLevel: 10,
    photoUrl: 'https://example.com/photo.jpg',
    description: 'Test product description',
    ...overrides,
  };
}

function createMockSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: 'SUP-001',
    name: 'Test Supplier Co.',
    contact: 'John Doe',
    email: 'supplier@test.com',
    phone: '123-456-7890',
    category: 'Electronics',
    status: 'Active',
    country: 'Philippines',
    city: 'Manila',
    address: '123 Test St',
    purchases: 10000,
    payments: 10000,
    balance: 0,
    ...overrides,
  };
}

describe('IMS Sync API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    (getFirebaseSuppliers as ReturnType<typeof vi.fn>).mockResolvedValue([
      createMockSupplier(),
    ]);
    
    // Mock getDocs to return empty (no existing products)
    (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
      empty: true,
      docs: [],
    });
    
    // Mock setDoc and updateDoc to succeed
    (setDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  describe('syncInventoryToIMS', () => {
    it('should create new IMS product when item does not exist', async () => {
      const salesOrder = createMockSalesOrder();
      const inventoryItems = [createMockInventoryItem()];

      const result = await syncInventoryToIMS(salesOrder, inventoryItems);

      expect(result.success).toBe(true);
      expect(result.syncedItems).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(setDoc).toHaveBeenCalled();
    });

    it('should update existing IMS product and add to quantity', async () => {
      // Mock existing product in IMS
      (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
        empty: false,
        docs: [{
          id: 'existing-product-id',
          data: () => ({
            quantity: 50,
            minQuantity: 10,
            wmsInventoryId: 'INV-001',
          }),
        }],
      });

      const salesOrder = createMockSalesOrder();
      const inventoryItems = [createMockInventoryItem()];

      const result = await syncInventoryToIMS(salesOrder, inventoryItems);

      expect(result.success).toBe(true);
      expect(result.syncedItems).toBe(1);
      expect(updateDoc).toHaveBeenCalled();
      
      // Verify quantity was added (50 existing + 10 from order = 60)
      const updateCall = (updateDoc as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(updateCall[1].quantity).toBe(60);
    });

    it('should handle missing inventory item gracefully', async () => {
      const salesOrder = createMockSalesOrder({
        items: [
          {
            inventoryItemId: 'NON-EXISTENT',
            itemName: 'Missing Product',
            quantity: 5,
            unitPrice: 50,
            totalPrice: 250,
          },
        ],
      });
      const inventoryItems = [createMockInventoryItem()]; // INV-001, not NON-EXISTENT

      const result = await syncInventoryToIMS(salesOrder, inventoryItems);

      expect(result.success).toBe(false);
      expect(result.syncedItems).toBe(0);
      expect(result.errors).toContain('Inventory item NON-EXISTENT not found');
    });

    it('should sync multiple items in a single order', async () => {
      const salesOrder = createMockSalesOrder({
        items: [
          {
            inventoryItemId: 'INV-001',
            itemName: 'Product A',
            quantity: 5,
            unitPrice: 100,
            totalPrice: 500,
          },
          {
            inventoryItemId: 'INV-002',
            itemName: 'Product B',
            quantity: 10,
            unitPrice: 50,
            totalPrice: 500,
          },
        ],
      });
      const inventoryItems = [
        createMockInventoryItem({ id: 'INV-001', name: 'Product A' }),
        createMockInventoryItem({ id: 'INV-002', name: 'Product B', supplierId: 'SUP-002' }),
      ];

      // Add second supplier
      (getFirebaseSuppliers as ReturnType<typeof vi.fn>).mockResolvedValue([
        createMockSupplier({ id: 'SUP-001', name: 'Supplier A' }),
        createMockSupplier({ id: 'SUP-002', name: 'Supplier B' }),
      ]);

      const result = await syncInventoryToIMS(salesOrder, inventoryItems);

      expect(result.success).toBe(true);
      expect(result.syncedItems).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(setDoc).toHaveBeenCalledTimes(2);
    });

    it('should use Unknown Supplier when supplier not found', async () => {
      // Mock no suppliers returned
      (getFirebaseSuppliers as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const salesOrder = createMockSalesOrder();
      const inventoryItems = [createMockInventoryItem()];

      const result = await syncInventoryToIMS(salesOrder, inventoryItems);

      expect(result.success).toBe(true);
      expect(result.syncedItems).toBe(1);

      // Check that the product was created with "Unknown Supplier"
      const setDocCall = (setDoc as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(setDocCall[1].supplier).toBe('Unknown Supplier');
    });

    it('should handle partial sync with some failures', async () => {
      const salesOrder = createMockSalesOrder({
        items: [
          {
            inventoryItemId: 'INV-001',
            itemName: 'Product A',
            quantity: 5,
            unitPrice: 100,
            totalPrice: 500,
          },
          {
            inventoryItemId: 'MISSING',
            itemName: 'Missing Product',
            quantity: 10,
            unitPrice: 50,
            totalPrice: 500,
          },
        ],
      });
      const inventoryItems = [
        createMockInventoryItem({ id: 'INV-001', name: 'Product A' }),
        // INV-002 is missing
      ];

      const result = await syncInventoryToIMS(salesOrder, inventoryItems);

      expect(result.success).toBe(false);
      expect(result.syncedItems).toBe(1); // Only one item synced
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('MISSING');
    });
  });
});

