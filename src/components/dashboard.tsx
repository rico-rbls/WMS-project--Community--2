import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Package, ShoppingCart, TrendingUp, AlertTriangle, Truck, Users, Clock, CheckCircle2, XCircle, Inbox, Boxes, ClipboardCheck, ArrowUpRight, ArrowDownRight, ClipboardList, ShoppingBag, ExternalLink } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAppContext } from "../context/app-context";
import { useIsMobile } from "./ui/use-mobile";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { toast } from "sonner";
import type { InventoryCategory, PurchaseOrder } from "../types";
import type { ViewType } from "../App";
import { getPurchaseOrders } from "../services/api";
import { useAuth } from "../context/auth-context";
import { canWrite } from "../lib/permissions";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

interface DashboardProps {
  navigateToView?: (view: ViewType, openDialog?: boolean) => void;
}

export function Dashboard({ navigateToView }: DashboardProps) {
  const { inventory, orders, shipments, suppliers, isLoading, refreshInventory, refreshOrders, refreshShipments, refreshSuppliers } = useAppContext();
  const { user } = useAuth();
  const canModify = user ? canWrite(user.role) : false;
  const isMobile = useIsMobile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // Fetch purchase orders
  useEffect(() => {
    getPurchaseOrders().then(setPurchaseOrders).catch(console.error);
  }, []);

  const handleRefresh = async (silent = false) => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshInventory(),
        refreshOrders(),
        refreshShipments(),
        refreshSuppliers(),
        getPurchaseOrders().then(setPurchaseOrders),
      ]);
      if (!silent) {
        toast.success("Dashboard refreshed");
      }
    } catch (error) {
      toast.error("Failed to refresh dashboard");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate real-time stats
  const stats = useMemo(() => {
    if (!inventory || !orders || !shipments) return null;

    const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const activeOrders = orders.filter(o => o.status !== "Delivered").length;
    const inTransit = shipments.filter(s => s.status === "In Transit").length;
    const lowStockItems = inventory.filter(i => i.status === "Low Stock" || i.status === "Critical");

    // Enhanced low stock items with additional calculations
    const enhancedLowStockItems = lowStockItems.map(item => {
      const supplier = suppliers?.find(s => s.id === item.supplierId);
      const recommendedQty = Math.max(0, (item.maintainStockAt || item.reorderLevel * 2) - item.quantity);
      const stockPercentage = item.reorderLevel > 0 ? Math.round((item.quantity / item.reorderLevel) * 100) : 0;
      const restockCost = recommendedQty * (item.pricePerPiece || 0);

      return {
        ...item,
        supplierName: supplier?.name || "Unknown Supplier",
        recommendedQty,
        stockPercentage,
        restockCost,
        urgencyScore: item.status === "Critical" ? 2 : 1, // For sorting
      };
    }).sort((a, b) => {
      // Sort by urgency (Critical first), then by stock percentage (lowest first)
      if (a.urgencyScore !== b.urgencyScore) return b.urgencyScore - a.urgencyScore;
      return a.stockPercentage - b.stockPercentage;
    });

    // Calculate total restock cost
    const totalRestockCost = enhancedLowStockItems.reduce((sum, item) => sum + item.restockCost, 0);

    // PO stats
    const pendingPOs = purchaseOrders.filter(po =>
      ["Pending Approval", "Approved", "Ordered"].includes(po.status)
    );
    const pendingPOValue = pendingPOs.reduce((sum, po) => sum + po.totalAmount, 0);

    return {
      totalItems,
      activeOrders,
      inTransit,
      lowStockCount: lowStockItems.length,
      lowStockItems: enhancedLowStockItems,
      totalRestockCost,
      totalOrders: orders.length,
      deliveredOrders: orders.filter(o => o.status === "Delivered").length,
      pendingShipments: shipments.filter(s => s.status === "Pending").length,
      activeSuppliers: suppliers?.filter(s => s.status === "Active").length || 0,
      pendingPOCount: pendingPOs.length,
      pendingPOValue,
    };
  }, [inventory, orders, shipments, suppliers, purchaseOrders]);

  // Calculate category distribution
  const categoryData = useMemo(() => {
    if (!inventory) return [];

    const categories: Record<InventoryCategory, number> = {
      Electronics: 0,
      Furniture: 0,
      Clothing: 0,
      Food: 0,
    };

    inventory.forEach(item => {
      categories[item.category] += item.quantity;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [inventory]);

  // Calculate order status distribution
  const orderStatusData = useMemo(() => {
    if (!orders) return [];

    const statuses = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Show loading skeleton
  if (isLoading.inventory || isLoading.orders || isLoading.shipments) {
    return <DashboardSkeleton />;
  }

  // Show error state
  if (!inventory || !orders || !shipments || !stats) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error loading dashboard</AlertTitle>
        <AlertDescription>
          Failed to load dashboard data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Warehouse Management System Overview</p>
      </div>

      {/* Alerts Section */}
      {stats.lowStockCount > 0 && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900 dark:text-orange-100">Low Stock Alert</AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                {stats.lowStockCount} item{stats.lowStockCount > 1 ? 's are' : ' is'} below reorder level.
                {stats.totalRestockCost > 0 && (
                  <span className="ml-1 font-medium">
                    Estimated restock: ₱{stats.totalRestockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </span>
              <Button
                variant="link"
                className="h-auto p-0 text-orange-700 dark:text-orange-300 underline-offset-4 hover:underline"
                onClick={() => navigateToView?.("inventory")}
              >
                View in Inventory →
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {inventory.length} SKUs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.deliveredOrders} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingShipments} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigateToView?.("purchase-orders")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending POs</CardTitle>
            <ClipboardList className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPOCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ₱{stats.pendingPOValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            {canModify ? "Frequently used operations" : "Read-only mode - Contact an Admin to perform actions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigateToView?.("inventory", true)}
              disabled={!canModify}
              title={!canModify ? "You don't have permission to add inventory" : undefined}
            >
              <Package className="h-5 w-5" />
              <span className="text-sm">Add Inventory</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigateToView?.("orders", true)}
              disabled={!canModify}
              title={!canModify ? "You don't have permission to create orders" : undefined}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-sm">New Order</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigateToView?.("purchase-orders", true)}
              disabled={!canModify}
              title={!canModify ? "You don't have permission to create purchase orders" : undefined}
            >
              <ClipboardList className="h-5 w-5" />
              <span className="text-sm">Create PO</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigateToView?.("shipments", true)}
              disabled={!canModify}
              title={!canModify ? "You don't have permission to create shipments" : undefined}
            >
              <Truck className="h-5 w-5" />
              <span className="text-sm">New Shipment</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigateToView?.("suppliers", true)}
              disabled={!canModify}
              title={!canModify ? "You don't have permission to add suppliers" : undefined}
            >
              <Users className="h-5 w-5" />
              <span className="text-sm">Add Supplier</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
          <Card>
            <CardHeader>
              <CardTitle>Inventory by Category</CardTitle>
              <CardDescription>Distribution of items across categories</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={isMobile ? 70 : 90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No inventory data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
              <CardDescription>Current order pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              {orderStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                  <BarChart data={orderStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No order data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      {/* Low Stock Items List - Enhanced */}
      {stats.lowStockItems.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Low Stock Items
                  <Badge variant="outline" className="ml-2 text-orange-600 border-orange-300">
                    {stats.lowStockCount} items
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Items below reorder level requiring attention
                  {stats.totalRestockCost > 0 && (
                    <span className="ml-2 font-medium text-orange-700 dark:text-orange-400">
                      • Est. restock cost: ₱{stats.totalRestockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToView?.("purchase-orders", true)}
                className="hidden sm:flex"
                disabled={!canModify}
                title={!canModify ? "You don't have permission to create purchase orders" : undefined}
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Create PO
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.lowStockItems.slice(0, 5).map((item) => {
                const progressColor = item.status === "Critical"
                  ? "bg-red-500"
                  : item.stockPercentage < 50
                    ? "bg-orange-500"
                    : "bg-yellow-500";

                return (
                  <div key={item.id} className="space-y-2 pb-4 border-b last:border-0 last:pb-0">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{item.name}</p>
                          <Badge variant={item.status === "Critical" ? "destructive" : "secondary"} className="shrink-0">
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {item.supplierName} • {item.location} • {item.category}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                        onClick={() => navigateToView?.("purchase-orders", true)}
                        title={!canModify ? "You don't have permission to create purchase orders" : `Create PO for ${item.name}`}
                        disabled={!canModify}
                      >
                        <ShoppingBag className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Reorder</span>
                      </Button>
                    </div>

                    {/* Stock Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Stock: <span className="font-medium text-foreground">{item.quantity}</span> / {item.reorderLevel} (reorder level)
                        </span>
                        <span className={`font-medium ${item.status === "Critical" ? "text-red-600" : "text-orange-600"}`}>
                          {item.stockPercentage}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${progressColor}`}
                          style={{ width: `${Math.min(100, item.stockPercentage)}%` }}
                        />
                      </div>
                    </div>

                    {/* Reorder Info Row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Recommended order: <span className="font-medium text-foreground">{item.recommendedQty} units</span>
                      </span>
                      {item.restockCost > 0 && (
                        <span>
                          Est. cost: <span className="font-medium text-foreground">₱{item.restockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </span>
                      )}
                      {item.pricePerPiece > 0 && (
                        <span>
                          Unit price: ₱{item.pricePerPiece.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Footer with View All link */}
              <div className="flex items-center justify-between pt-2">
                {stats.lowStockItems.length > 5 ? (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-orange-600 hover:text-orange-700"
                    onClick={() => navigateToView?.("inventory")}
                  >
                    View all {stats.lowStockItems.length} low stock items →
                  </Button>
                ) : (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-muted-foreground hover:text-foreground"
                    onClick={() => navigateToView?.("inventory")}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View in Inventory
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToView?.("purchase-orders", true)}
                  className="sm:hidden"
                  disabled={!canModify}
                  title={!canModify ? "You don't have permission to create purchase orders" : undefined}
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Create PO
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
