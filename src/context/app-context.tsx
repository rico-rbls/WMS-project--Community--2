import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import type { InventoryItem, Shipment, Supplier, SalesOrder, Customer, PaymentTransaction } from "../types";
import { subscribeToInventory, subscribeToSuppliers } from "../services/firebase-inventory-api";
import { subscribeToSalesOrders } from "../services/firebase-sales-orders-api";
import { subscribeToCustomers } from "../services/firebase-customers-api";
import { subscribeToShipments } from "../services/firebase-shipments-api";
import { subscribeToPayments } from "../services/firebase-payments-api";

interface AppState {
  inventory: InventoryItem[] | null;
  shipments: Shipment[] | null;
  suppliers: Supplier[] | null;
  salesOrders: SalesOrder[] | null;
  customers: Customer[] | null;
  payments: PaymentTransaction[] | null;
  isLoading: {
    inventory: boolean;
    shipments: boolean;
    suppliers: boolean;
    salesOrders: boolean;
    customers: boolean;
    payments: boolean;
  };
}

interface AppContextType extends AppState {
  setInventory: (inventory: InventoryItem[] | null) => void;
  setShipments: (shipments: Shipment[] | null) => void;
  setSuppliers: (suppliers: Supplier[] | null) => void;
  setSalesOrders: (salesOrders: SalesOrder[] | null) => void;
  setCustomers: (customers: Customer[] | null) => void;
  setPayments: (payments: PaymentTransaction[] | null) => void;
  refreshInventory: () => Promise<void>;
  refreshShipments: () => Promise<void>;
  refreshSuppliers: () => Promise<void>;
  refreshSalesOrders: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshPayments: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[] | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [payments, setPayments] = useState<PaymentTransaction[] | null>(null);

  const [isLoading, setIsLoading] = useState({
    inventory: true,
    shipments: true,
    suppliers: true,
    salesOrders: true,
    customers: true,
    payments: true,
  });

  // Track Firebase subscriptions
  const inventoryUnsubscribeRef = useRef<(() => void) | null>(null);
  const suppliersUnsubscribeRef = useRef<(() => void) | null>(null);
  const salesOrdersUnsubscribeRef = useRef<(() => void) | null>(null);
  const customersUnsubscribeRef = useRef<(() => void) | null>(null);
  const shipmentsUnsubscribeRef = useRef<(() => void) | null>(null);
  const paymentsUnsubscribeRef = useRef<(() => void) | null>(null);

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

    return () => {
      if (suppliersUnsubscribeRef.current) {
        suppliersUnsubscribeRef.current();
      }
    };
  }, []);

  // Set up real-time Firebase subscription for sales orders
  useEffect(() => {
    salesOrdersUnsubscribeRef.current = subscribeToSalesOrders(
      (orders) => {
        setSalesOrders(orders);
        setIsLoading(prev => ({ ...prev, salesOrders: false }));
      },
      (error) => {
        console.error("Firebase sales orders subscription error:", error);
        setIsLoading(prev => ({ ...prev, salesOrders: false }));
      }
    );

    return () => {
      if (salesOrdersUnsubscribeRef.current) {
        salesOrdersUnsubscribeRef.current();
      }
    };
  }, []);

  // Set up real-time Firebase subscription for customers
  useEffect(() => {
    customersUnsubscribeRef.current = subscribeToCustomers(
      (items) => {
        setCustomers(items);
        setIsLoading(prev => ({ ...prev, customers: false }));
      },
      (error) => {
        console.error("Firebase customers subscription error:", error);
        setIsLoading(prev => ({ ...prev, customers: false }));
      }
    );

    return () => {
      if (customersUnsubscribeRef.current) {
        customersUnsubscribeRef.current();
      }
    };
  }, []);

  // Set up real-time Firebase subscription for shipments
  useEffect(() => {
    shipmentsUnsubscribeRef.current = subscribeToShipments(
      (items) => {
        setShipments(items);
        setIsLoading(prev => ({ ...prev, shipments: false }));
      },
      (error) => {
        console.error("Firebase shipments subscription error:", error);
        setIsLoading(prev => ({ ...prev, shipments: false }));
      }
    );

    return () => {
      if (shipmentsUnsubscribeRef.current) {
        shipmentsUnsubscribeRef.current();
      }
    };
  }, []);

  // Set up real-time Firebase subscription for payments
  useEffect(() => {
    paymentsUnsubscribeRef.current = subscribeToPayments(
      (items) => {
        setPayments(items);
        setIsLoading(prev => ({ ...prev, payments: false }));
      },
      (error) => {
        console.error("Firebase payments subscription error:", error);
        setIsLoading(prev => ({ ...prev, payments: false }));
      }
    );

    return () => {
      if (paymentsUnsubscribeRef.current) {
        paymentsUnsubscribeRef.current();
      }
    };
  }, []);

  // For Firebase data, refresh is a no-op since we use real-time subscription
  // But we keep the functions for compatibility
  async function refreshInventory() {
    // No-op: Firebase real-time subscription handles updates automatically
  }

  async function refreshShipments() {
    // No-op: Firebase real-time subscription handles updates automatically
  }

  async function refreshSuppliers() {
    // No-op: Firebase real-time subscription handles updates automatically
  }

  async function refreshSalesOrders() {
    // No-op: Firebase real-time subscription handles updates automatically
  }

  async function refreshCustomers() {
    // No-op: Firebase real-time subscription handles updates automatically
  }

  async function refreshPayments() {
    // No-op: Firebase real-time subscription handles updates automatically
  }

  const value: AppContextType = {
    inventory,
    shipments,
    suppliers,
    salesOrders,
    customers,
    payments,
    isLoading,
    setInventory,
    setShipments,
    setSuppliers,
    setSalesOrders,
    setCustomers,
    setPayments,
    refreshInventory,
    refreshShipments,
    refreshSuppliers,
    refreshSalesOrders,
    refreshCustomers,
    refreshPayments,
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

export function useSalesOrders() {
  const { salesOrders, isLoading, setSalesOrders, refreshSalesOrders } = useAppContext();
  return { salesOrders, isLoading: isLoading.salesOrders, setSalesOrders, refreshSalesOrders };
}

export function useCustomers() {
  const { customers, isLoading, setCustomers, refreshCustomers } = useAppContext();
  return { customers, isLoading: isLoading.customers, setCustomers, refreshCustomers };
}

export function usePayments() {
  const { payments, isLoading, setPayments, refreshPayments } = useAppContext();
  return { payments, isLoading: isLoading.payments, setPayments, refreshPayments };
}

