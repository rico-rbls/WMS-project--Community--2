import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { InventoryItem, Order, Shipment, Supplier } from "../types";
import { getInventory, getOrders, getShipments, getSuppliers } from "../services/api";

interface AppState {
  inventory: InventoryItem[] | null;
  orders: Order[] | null;
  shipments: Shipment[] | null;
  suppliers: Supplier[] | null;
  isLoading: {
    inventory: boolean;
    orders: boolean;
    shipments: boolean;
    suppliers: boolean;
  };
}

interface AppContextType extends AppState {
  setInventory: (inventory: InventoryItem[] | null) => void;
  setOrders: (orders: Order[] | null) => void;
  setShipments: (shipments: Shipment[] | null) => void;
  setSuppliers: (suppliers: Supplier[] | null) => void;
  refreshInventory: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshShipments: () => Promise<void>;
  refreshSuppliers: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  
  const [isLoading, setIsLoading] = useState({
    inventory: true,
    orders: true,
    shipments: true,
    suppliers: true,
  });

  // Initial data load
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    await Promise.all([
      refreshInventory(),
      refreshOrders(),
      refreshShipments(),
      refreshSuppliers(),
    ]);
  }

  async function refreshInventory() {
    setIsLoading(prev => ({ ...prev, inventory: true }));
    try {
      const data = await getInventory();
      setInventory(data);
    } finally {
      setIsLoading(prev => ({ ...prev, inventory: false }));
    }
  }

  async function refreshOrders() {
    setIsLoading(prev => ({ ...prev, orders: true }));
    try {
      const data = await getOrders();
      setOrders(data);
    } finally {
      setIsLoading(prev => ({ ...prev, orders: false }));
    }
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

  async function refreshSuppliers() {
    setIsLoading(prev => ({ ...prev, suppliers: true }));
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } finally {
      setIsLoading(prev => ({ ...prev, suppliers: false }));
    }
  }

  const value: AppContextType = {
    inventory,
    orders,
    shipments,
    suppliers,
    isLoading,
    setInventory,
    setOrders,
    setShipments,
    setSuppliers,
    refreshInventory,
    refreshOrders,
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

export function useOrders() {
  const { orders, isLoading, setOrders, refreshOrders } = useAppContext();
  return { orders, isLoading: isLoading.orders, setOrders, refreshOrders };
}

export function useShipments() {
  const { shipments, isLoading, setShipments, refreshShipments } = useAppContext();
  return { shipments, isLoading: isLoading.shipments, setShipments, refreshShipments };
}

export function useSuppliers() {
  const { suppliers, isLoading, setSuppliers, refreshSuppliers } = useAppContext();
  return { suppliers, isLoading: isLoading.suppliers, setSuppliers, refreshSuppliers };
}

