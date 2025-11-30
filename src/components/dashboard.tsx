import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Package, ShoppingCart, TrendingUp, AlertTriangle, RefreshCw, Truck, Users, Clock, CheckCircle2, XCircle, Inbox, Boxes, ClipboardCheck, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAppContext } from "../context/app-context";
import { useIsMobile } from "./ui/use-mobile";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { toast } from "sonner";
import type { InventoryCategory } from "../types";
import type { ViewType } from "../App";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

interface DashboardProps {
  navigateToView?: (view: ViewType, openDialog?: boolean) => void;
}

export function Dashboard({ navigateToView }: DashboardProps) {
  const { inventory, orders, shipments, suppliers, isLoading, refreshInventory, refreshOrders, refreshShipments, refreshSuppliers } = useAppContext();
  const isMobile = useIsMobile();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async (silent = false) => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshInventory(),
        refreshOrders(),
        refreshShipments(),
        refreshSuppliers(),
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

    return {
      totalItems,
      activeOrders,
      inTransit,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      totalOrders: orders.length,
      deliveredOrders: orders.filter(o => o.status === "Delivered").length,
      pendingShipments: shipments.filter(s => s.status === "Pending").length,
      activeSuppliers: suppliers?.filter(s => s.status === "Active").length || 0,
    };
  }, [inventory, orders, shipments, suppliers]);

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
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Warehouse Management System Overview</p>
        </div>
        <Button onClick={() => handleRefresh()} disabled={isRefreshing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Alerts Section */}
      {stats.lowStockCount > 0 && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900 dark:text-orange-100">Low Stock Alert</AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            {stats.lowStockCount} item{stats.lowStockCount > 1 ? 's are' : ' is'} below reorder level.
            <Button variant="link" className="h-auto p-0 ml-2 text-orange-700 dark:text-orange-300" onClick={() => window.location.hash = "#inventory"}>
              View items →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigateToView?.("inventory", true)}
            >
              <Package className="h-5 w-5" />
              <span className="text-sm">Add Inventory</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigateToView?.("orders", true)}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-sm">New Order</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigateToView?.("shipments", true)}
            >
              <Truck className="h-5 w-5" />
              <span className="text-sm">New Shipment</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigateToView?.("suppliers", true)}
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

      {/* Low Stock Items List */}
      {stats.lowStockItems.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Low Stock Items
            </CardTitle>
            <CardDescription>Items that need reordering</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.lowStockItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between pb-3 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.location} • {item.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={item.status === "Critical" ? "destructive" : "secondary"}>
                      {item.quantity} left
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reorder at {item.reorderLevel}
                    </p>
                  </div>
                </div>
              ))}
              {stats.lowStockItems.length > 5 && (
                <Button variant="link" className="w-full" onClick={() => window.location.hash = "#inventory"}>
                  View all {stats.lowStockItems.length} items →
                </Button>
              )}
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
