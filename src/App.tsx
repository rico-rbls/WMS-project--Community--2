import { useState, Suspense, useCallback } from "react";
import { SidebarProvider } from "./components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import React from "react";
const Dashboard = React.lazy(() => import("./components/dashboard").then(m => ({ default: m.Dashboard })));
const InventoryView = React.lazy(() => import("./components/inventory-view").then(m => ({ default: m.InventoryView })));
const OrdersView = React.lazy(() => import("./components/orders-view").then(m => ({ default: m.OrdersView })));
const PurchaseOrdersView = React.lazy(() => import("./components/purchase-orders-view").then(m => ({ default: m.PurchaseOrdersView })));
const ShipmentsView = React.lazy(() => import("./components/shipments-view").then(m => ({ default: m.ShipmentsView })));
const SuppliersView = React.lazy(() => import("./components/suppliers-view").then(m => ({ default: m.SuppliersView })));
import { Toaster } from "./components/ui/sonner";
import { ErrorBoundary } from "./components/error-boundary";
import { LoginPage } from "./components/login-page";
import { useAuth } from "./context/auth-context";
import { Loader2 } from "lucide-react";
import { reportError } from "./lib/monitoring";
export type ViewType = "dashboard" | "inventory" | "orders" | "purchase-orders" | "shipments" | "suppliers";

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState("dashboard" as ViewType);
  const [openAddDialog, setOpenAddDialog] = useState<ViewType | null>(null);

  // Navigate to a view and optionally open its Add dialog
  const navigateToView = useCallback((view: ViewType, openDialog: boolean = false) => {
    setCurrentView(view);
    if (openDialog && view !== "dashboard") {
      setOpenAddDialog(view);
    }
  }, []);

  // Clear the pending dialog state after it's been consumed
  const clearOpenAddDialog = useCallback(() => {
    setOpenAddDialog(null);
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <ErrorBoundary onError={reportError}>
        <LoginPage />
        <Toaster />
      </ErrorBoundary>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard navigateToView={navigateToView} />;
      case "inventory":
        return (
          <InventoryView
            initialOpenDialog={openAddDialog === "inventory"}
            onDialogOpened={clearOpenAddDialog}
          />
        );
      case "orders":
        return (
          <OrdersView
            initialOpenDialog={openAddDialog === "orders"}
            onDialogOpened={clearOpenAddDialog}
          />
        );
      case "purchase-orders":
        return (
          <PurchaseOrdersView
            initialOpenDialog={openAddDialog === "purchase-orders"}
            onDialogOpened={clearOpenAddDialog}
          />
        );
      case "shipments":
        return (
          <ShipmentsView
            initialOpenDialog={openAddDialog === "shipments"}
            onDialogOpened={clearOpenAddDialog}
          />
        );
      case "suppliers":
        return (
          <SuppliersView
            initialOpenDialog={openAddDialog === "suppliers"}
            onDialogOpened={clearOpenAddDialog}
          />
        );
      default:
        return <Dashboard navigateToView={navigateToView} />;
    }
  };

  return (
    <ErrorBoundary onError={reportError}>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar currentView={currentView} setCurrentView={setCurrentView} />
          <main className="flex-1 overflow-auto bg-muted/30">
            <div className="p-6">
              <div className="mb-6">
                <h1>Integrated Warehouse Management System</h1>
                <p className="text-muted-foreground">for Inventory and Supply Chain Coordination</p>
              </div>
              <Suspense fallback={<div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>}>
                {renderView()}
              </Suspense>
            </div>
          </main>
        </div>
        <Toaster />
      </SidebarProvider>
    </ErrorBoundary>
  );
}
