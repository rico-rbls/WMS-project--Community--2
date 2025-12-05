import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import type { InventoryItem, Shipment, Supplier } from "../types";
import { getShipments } from "../services/api";
import { subscribeToInventory, subscribeToSuppliers } from "../services/firebase-inventory-api";

interface AppState {
  inventory: InventoryItem[] | null;
  shipments: Shipment[] | null;
  suppliers: Supplier[] | null;
  isLoading: {
    inventory: boolean;
    shipments: boolean;
    suppliers: boolean;
  };
}

interface AppContextType extends AppState {
  setInventory: (inventory: InventoryItem[] | null) => void;
  setShipments: (shipments: Shipment[] | null) => void;
  setSuppliers: (suppliers: Supplier[] | null) => void;
  refreshInventory: () => Promise<void>;
  refreshShipments: () => Promise<void>;
  refreshSuppliers: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);

  const [isLoading, setIsLoading] = useState({
    inventory: true,
    shipments: true,
    suppliers: true,
  });

  // Track Firebase subscriptions
  const inventoryUnsubscribeRef = useRef<(() => void) | null>(null);
  const suppliersUnsubscribeRef = useRef<(() => void) | null>(null);

  // Set up real-time Firebase subscription for inventory
  useEffect(() => {
    // Subscribe to inventory changes from Firebase
    inventoryUnsubscribeRef.current = subscribeToInventory(
      (items) => {
        setInventory(items);
        setIsLoading(prev => ({ ...prev, inventory: false }));
      },
      (error) => {
        console.error("Firebase inventory subscription error:", error);
        setIsLoading(prev => ({ ...prev, inventory: false }));
      }
    );

    // Cleanup subscription on unmount
    return () => {
      if (inventoryUnsubscribeRef.current) {
        inventoryUnsubscribeRef.current();
      }
    };
  }, []);

  // Set up real-time Firebase subscription for suppliers
  useEffect(() => {
    // Subscribe to supplier changes from Firebase
    suppliersUnsubscribeRef.current = subscribeToSuppliers(
      (items) => {
        setSuppliers(items);
        setIsLoading(prev => ({ ...prev, suppliers: false }));
      },
      (error) => {
        console.error("Firebase suppliers subscription error:", error);
        setIsLoading(prev => ({ ...prev, suppliers: false }));
      }
    );

    // Cleanup subscription on unmount
    return () => {
      if (suppliersUnsubscribeRef.current) {
        suppliersUnsubscribeRef.current();
      }
    };
  }, []);

  // Initial data load for non-Firebase data
  useEffect(() => {
    loadOtherData();
  }, []);

  async function loadOtherData() {
    await refreshShipments();
  }

  // For Firebase inventory, refresh is a no-op since we use real-time subscription
  // But we keep the function for compatibility
  async function refreshInventory() {
    // No-op: Firebase real-time subscription handles updates automatically
    // This function is kept for API compatibility
  }

  async function refreshShipments() {
    setIsLoading(prev => ({ ...prev, shipments: true }));
    try {
      const data = await getShipments();
      setShipments(data);
    } finally {
      setIsLoading(prev => ({ ...prev, shipments: false }));
    }
  }

  // For Firebase suppliers, refresh is a no-op since we use real-time subscription
  async function refreshSuppliers() {
    // No-op: Firebase real-time subscription handles updates automatically
    // This function is kept for API compatibility
  }

  const value: AppContextType = {
    inventory,
    shipments,
    suppliers,
    isLoading,
    setInventory,
    setShipments,
    setSuppliers,
    refreshInventory,
    refreshShipments,
    refreshSuppliers,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

// Convenience hooks for specific data
export function useInventory() {
  const { inventory, isLoading, setInventory, refreshInventory } = useAppContext();
  return { inventory, isLoading: isLoading.inventory, setInventory, refreshInventory };
}

export function useShipments() {
  const { shipments, isLoading, setShipments, refreshShipments } = useAppContext();
  return { shipments, isLoading: isLoading.shipments, setShipments, refreshShipments };
}

export function useSuppliers() {
  const { suppliers, isLoading, setSuppliers, refreshSuppliers } = useAppContext();
  return { suppliers, isLoading: isLoading.suppliers, setSuppliers, refreshSuppliers };
}

