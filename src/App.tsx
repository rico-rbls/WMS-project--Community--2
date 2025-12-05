import { useState, Suspense, useCallback, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import React from "react";
const Dashboard = React.lazy(() => import("./components/dashboard").then(m => ({ default: m.Dashboard })));
const InventoryView = React.lazy(() => import("./components/inventory-view").then(m => ({ default: m.InventoryView })));
const PurchaseOrdersView = React.lazy(() => import("./components/purchase-orders-view").then(m => ({ default: m.PurchaseOrdersView })));
const SalesOrdersView = React.lazy(() => import("./components/sales-orders-view").then(m => ({ default: m.SalesOrdersView })));
const ShipmentsView = React.lazy(() => import("./components/shipments-view").then(m => ({ default: m.ShipmentsView })));
const SuppliersView = React.lazy(() => import("./components/suppliers-view").then(m => ({ default: m.SuppliersView })));
const CustomersView = React.lazy(() => import("./components/customers-view").then(m => ({ default: m.CustomersView })));
const UserManagementView = React.lazy(() => import("./components/user-management-view").then(m => ({ default: m.UserManagementView })));
const AdminProfileView = React.lazy(() => import("./components/admin-profile-view").then(m => ({ default: m.AdminProfileView })));
const CashBankView = React.lazy(() => import("./components/cash-bank-view").then(m => ({ default: m.CashBankView })));
const PaymentsView = React.lazy(() => import("./components/payments-view").then(m => ({ default: m.PaymentsView })));
// Customer-specific views
const CustomerDashboard = React.lazy(() => import("./components/customer-dashboard").then(m => ({ default: m.CustomerDashboard })));
const ProductsCatalogView = React.lazy(() => import("./components/products-catalog-view").then(m => ({ default: m.ProductsCatalogView })));
const CustomerCartView = React.lazy(() => import("./components/customer-cart-view").then(m => ({ default: m.CustomerCartView })));
import { Toaster } from "./components/ui/sonner";
import { ErrorBoundary } from "./components/error-boundary";
import { LoginPage } from "./components/login-page";
import { useAuth } from "./context/auth-context";
import { CartProvider } from "./context/cart-context";
import { Loader2 } from "lucide-react";
import { reportError } from "./lib/monitoring";
import { CommandPalette, useCommandPalette } from "./components/command-palette";
import { Topbar } from "./components/topbar";

export type ViewType = "dashboard" | "inventory" | "purchase-orders" | "sales-orders" | "shipments" | "suppliers" | "customers" | "cash-bank" | "payments" | "users" | "profile" | "customer-dashboard" | "products" | "customer-cart";

// Valid view types for URL parsing
const VALID_VIEWS: ViewType[] = ["dashboard", "inventory", "purchase-orders", "sales-orders", "shipments", "suppliers", "customers", "cash-bank", "payments", "users", "profile", "customer-dashboard", "products", "customer-cart"];

// Get initial view from URL hash
function getViewFromHash(): ViewType {
  const hash = window.location.hash.slice(1); // Remove the '#'
  if (hash && VALID_VIEWS.includes(hash as ViewType)) {
    return hash as ViewType;
  }
  return "dashboard";
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>(getViewFromHash);
  const [openAddDialog, setOpenAddDialog] = useState<ViewType | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  // Sync URL hash with current view
  useEffect(() => {
    // Update the URL hash when view changes
    const newHash = currentView === "dashboard" ? "" : `#${currentView}`;
    if (window.location.hash !== newHash && window.location.hash !== `#${currentView}`) {
      window.history.replaceState(null, "", newHash || window.location.pathname);
    }
  }, [currentView]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const viewFromHash = getViewFromHash();
      setCurrentView(viewFromHash);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Navigate to a view and optionally open its Add dialog
  const navigateToView = useCallback((view: ViewType, openDialog: boolean = false) => {
    setCurrentView(view);
    if (openDialog && view !== "dashboard") {
      setOpenAddDialog(view);
    }
  }, []);

  // Handle navigation from command palette
  const handleCommandPaletteNavigate = useCallback((view: ViewType, itemId?: string) => {
    setCurrentView(view);
    // Pass itemId to open detail dialog in the view
    setSelectedItemId(itemId);
  }, []);

  // Clear the pending dialog state after it's been consumed
  const clearOpenAddDialog = useCallback(() => {
    setOpenAddDialog(null);
  }, []);

  // Clear the selected item ID after it's been consumed
  const clearSelectedItemId = useCallback(() => {
    setSelectedItemId(undefined);
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
            initialItemId={selectedItemId}
            onItemDialogOpened={clearSelectedItemId}
          />
        );
      case "purchase-orders":
        return (
          <PurchaseOrdersView
            initialOpenDialog={openAddDialog === "purchase-orders"}
            onDialogOpened={clearOpenAddDialog}
          />
        );
      case "sales-orders":
        return <SalesOrdersView />;
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
            initialSupplierId={selectedItemId}
            onSupplierDialogOpened={clearSelectedItemId}
          />
        );
      case "customers":
        return (
          <CustomersView
            initialOpenDialog={openAddDialog === "customers"}
            onDialogOpened={clearOpenAddDialog}
            initialCustomerId={selectedItemId}
            onCustomerDialogOpened={clearSelectedItemId}
          />
        );
      case "cash-bank":
        return <CashBankView />;
      case "payments":
        return <PaymentsView />;
      case "users":
        return <UserManagementView />;
      case "profile":
        return <AdminProfileView />;
      // Customer-specific views
      case "customer-dashboard":
        return <CustomerDashboard navigateToView={navigateToView} />;
      case "products":
        return <ProductsCatalogView navigateToView={navigateToView} />;
      case "customer-cart":
        return <CustomerCartView navigateToView={navigateToView} />;
      default:
        return <Dashboard navigateToView={navigateToView} />;
    }
  };

  return (
    <ErrorBoundary onError={reportError}>
      <CartProvider>
        <SidebarProvider>
          <AppSidebar currentView={currentView} setCurrentView={setCurrentView} />
          <SidebarInset className="flex flex-col bg-muted/30 h-screen overflow-hidden">
            <Topbar
              setCurrentView={setCurrentView}
              setCommandPaletteOpen={setCommandPaletteOpen}
            />
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
              <Suspense fallback={<div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>}>
                {renderView()}
              </Suspense>
            </div>
          </SidebarInset>

          {/* Command Palette / Global Search */}
          <CommandPalette
            open={commandPaletteOpen}
            onOpenChange={setCommandPaletteOpen}
            onNavigate={handleCommandPaletteNavigate}
          />

          <Toaster />
        </SidebarProvider>
      </CartProvider>
    </ErrorBoundary>
  );
}
