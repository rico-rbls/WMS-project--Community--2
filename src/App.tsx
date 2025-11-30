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
const UserManagementView = React.lazy(() => import("./components/user-management-view").then(m => ({ default: m.UserManagementView })));
const AdminProfileView = React.lazy(() => import("./components/admin-profile-view").then(m => ({ default: m.AdminProfileView })));
import { Toaster } from "./components/ui/sonner";
import { ErrorBoundary } from "./components/error-boundary";
import { LoginPage } from "./components/login-page";
import { useAuth } from "./context/auth-context";
import { Loader2, Search, Command } from "lucide-react";
import { reportError } from "./lib/monitoring";
import { CommandPalette, useCommandPalette } from "./components/command-palette";
import { Button } from "./components/ui/button";
export type ViewType = "dashboard" | "inventory" | "orders" | "purchase-orders" | "shipments" | "suppliers" | "users" | "profile";

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState("dashboard" as ViewType);
  const [openAddDialog, setOpenAddDialog] = useState<ViewType | null>(null);
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  // Navigate to a view and optionally open its Add dialog
  const navigateToView = useCallback((view: ViewType, openDialog: boolean = false) => {
    setCurrentView(view);
    if (openDialog && view !== "dashboard") {
      setOpenAddDialog(view);
    }
  }, []);

  // Handle navigation from command palette
  const handleCommandPaletteNavigate = useCallback((view: ViewType, _itemId?: string) => {
    setCurrentView(view);
    // Note: itemId can be used in the future to scroll to/highlight specific item
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
      case "users":
        return <UserManagementView />;
      case "profile":
        return <AdminProfileView />;
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
              {/* Header with Search */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1>Integrated Warehouse Management System</h1>
                  <p className="text-muted-foreground">for Inventory and Supply Chain Coordination</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto justify-start text-muted-foreground gap-2"
                  onClick={() => setCommandPaletteOpen(true)}
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Search everything...</span>
                  <span className="sm:hidden">Search...</span>
                  <kbd className="hidden sm:inline-flex ml-auto pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                    <Command className="h-3 w-3" />K
                  </kbd>
                </Button>
              </div>
              <Suspense fallback={<div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>}>
                {renderView()}
              </Suspense>
            </div>
          </main>
        </div>

        {/* Command Palette / Global Search */}
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          onNavigate={handleCommandPaletteNavigate}
        />

        <Toaster />
      </SidebarProvider>
    </ErrorBoundary>
  );
}
