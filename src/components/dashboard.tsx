import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Package, ShoppingCart, TrendingUp, AlertTriangle, Truck, Users, Clock, CheckCircle2, XCircle, Inbox, Boxes, ClipboardCheck, ArrowUpRight, ArrowDownRight, ClipboardList, ShoppingBag, ExternalLink, DollarSign, Activity, Target, BarChart3, TrendingDown, Gauge, Star, Calendar, RefreshCw, Landmark, Wallet, CreditCard, Banknote } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart, Legend } from "recharts";
import { useAppContext } from "../context/app-context";
import { useIsMobile } from "./ui/use-mobile";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { toast } from "sonner";
import type { InventoryCategory, PurchaseOrder, CashBankTransaction, PaymentTransaction } from "../types";
import type { ViewType } from "../App";
import { getPurchaseOrders, getCashBankTransactions, getPaymentTransactions } from "../services/api";
import { useAuth } from "../context/auth-context";
import { canWrite } from "../lib/permissions";
import { Progress } from "./ui/progress";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];
const CHART_COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
};

// Currency formatting helper for Philippine Peso
const formatCurrency = (value: number, decimals: number = 2): string => {
  return `₱${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
};

// Compact currency format for charts (e.g., ₱125k)
const formatCurrencyCompact = (value: number): string => {
  if (value >= 1000000) return `₱${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₱${(value / 1000).toFixed(0)}k`;
  return `₱${value}`;
};

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
  const [cashBankTransactions, setCashBankTransactions] = useState<CashBankTransaction[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [additionalDataError, setAdditionalDataError] = useState<string | null>(null);

  // Fetch purchase orders, cash/bank transactions, and payment transactions
  useEffect(() => {
    Promise.all([
      getPurchaseOrders(),
      getCashBankTransactions(),
      getPaymentTransactions(),
    ]).then(([pos, cashBank, payments]) => {
      setPurchaseOrders(pos);
      setCashBankTransactions(cashBank);
      setPaymentTransactions(payments);
      setAdditionalDataError(null);
    }).catch((error) => {
      console.error('Failed to load additional dashboard data:', error);
      setAdditionalDataError('Failed to load cash flow and purchase order data. Some metrics may be incomplete.');
    });
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
        getCashBankTransactions().then(setCashBankTransactions),
        getPaymentTransactions().then(setPaymentTransactions),
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
        urgencyScore: item.status === "Critical" ? 2 : 1,
      };
    }).sort((a, b) => {
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

    // NEW: Financial KPIs
    const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.pricePerPiece || 0)), 0);

    // Order fulfillment rate (delivered / total)
    const deliveredOrders = orders.filter(o => o.status === "Delivered").length;
    const fulfillmentRate = orders.length > 0 ? Math.round((deliveredOrders / orders.length) * 100) : 0;

    // Average order value
    const totalOrderValue = orders.reduce((sum, order) => {
      const value = parseFloat(order.total.replace(/[₱,]/g, '')) || 0;
      return sum + value;
    }, 0);
    const avgOrderValue = orders.length > 0 ? totalOrderValue / orders.length : 0;

    // Warehouse capacity (based on maintainStockAt as capacity indicator)
    const currentStock = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const maxCapacity = inventory.reduce((sum, item) => sum + (item.maintainStockAt || item.reorderLevel * 3 || 100), 0);
    const capacityUtilization = maxCapacity > 0 ? Math.round((currentStock / maxCapacity) * 100) : 0;

    // Inventory health metrics
    const inStockItems = inventory.filter(i => i.status === "In Stock").length;
    const criticalItems = inventory.filter(i => i.status === "Critical").length;
    const overstockItems = inventory.filter(i => i.status === "Overstock");
    const healthScore = inventory.length > 0 ? Math.round((inStockItems / inventory.length) * 100) : 0;

    // Enhanced overstock items with additional calculations
    const enhancedOverstockItems = overstockItems.map(item => {
      const supplier = suppliers?.find(s => s.id === item.supplierId);
      const excessQty = Math.max(0, item.quantity - (item.maintainStockAt || item.reorderLevel * 2));
      const overstockPercentage = item.maintainStockAt > 0 ? Math.round((item.quantity / item.maintainStockAt) * 100) : 0;
      const excessValue = excessQty * (item.pricePerPiece || 0);

      return {
        ...item,
        supplierName: supplier?.name || "Unknown Supplier",
        excessQty,
        overstockPercentage,
        excessValue,
      };
    }).sort((a, b) => b.overstockPercentage - a.overstockPercentage);

    // Calculate total excess value
    const totalExcessValue = enhancedOverstockItems.reduce((sum, item) => sum + item.excessValue, 0);

    // Top products by quantity
    const topProducts = [...inventory]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(item => ({
        name: item.name,
        quantity: item.quantity,
        value: item.quantity * (item.pricePerPiece || 0),
        category: item.category,
      }));

    // Supplier performance (based on PO completion)
    const completedPOs = purchaseOrders.filter(po => po.status === "Received").length;
    const supplierPerformance = purchaseOrders.length > 0 ? Math.round((completedPOs / purchaseOrders.length) * 100) : 0;

    return {
      totalItems,
      activeOrders,
      inTransit,
      lowStockCount: lowStockItems.length,
      lowStockItems: enhancedLowStockItems,
      totalRestockCost,
      totalOrders: orders.length,
      deliveredOrders,
      pendingShipments: shipments.filter(s => s.status === "Pending").length,
      activeSuppliers: suppliers?.filter(s => s.status === "Active").length || 0,
      pendingPOCount: pendingPOs.length,
      pendingPOValue,
      // New KPIs
      totalInventoryValue,
      fulfillmentRate,
      avgOrderValue,
      capacityUtilization,
      healthScore,
      criticalItems,
      inStockItems,
      topProducts,
      supplierPerformance,
      totalOrderValue,
      // Overstock KPIs
      overstockCount: overstockItems.length,
      overstockItems: enhancedOverstockItems,
      totalExcessValue,
    };
  }, [inventory, orders, shipments, suppliers, purchaseOrders]);

  // Calculate Cash Flow Statistics
  const cashFlowStats = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Cash & Bank (Receipts) statistics - single pass aggregation
    const activeReceipts = cashBankTransactions.filter(trx => !trx.archived);
    const receiptsAggregated = activeReceipts.reduce((acc, trx) => {
      acc.total += trx.amountReceived;
      if (new Date(trx.createdAt) >= oneWeekAgo) acc.recent++;
      const mode = trx.paymentMode;
      if (mode === "Cash") acc.byMode.cash += trx.amountReceived;
      else if (mode === "Bank Transfer") acc.byMode.bankTransfer += trx.amountReceived;
      else if (mode === "Credit Card") acc.byMode.creditCard += trx.amountReceived;
      else if (mode === "Check") acc.byMode.check += trx.amountReceived;
      else if (mode === "Online Payment") acc.byMode.online += trx.amountReceived;
      return acc;
    }, { total: 0, recent: 0, byMode: { cash: 0, bankTransfer: 0, creditCard: 0, check: 0, online: 0 } });

    const totalReceipts = receiptsAggregated.total;
    const receiptsByMode = receiptsAggregated.byMode;
    const recentReceipts = receiptsAggregated.recent;

    // Payments (Outgoing) statistics - single pass aggregation
    const activePayments = paymentTransactions.filter(trx => !trx.archived);
    const paymentsAggregated = activePayments.reduce((acc, trx) => {
      acc.total += trx.amountPaid;
      if (new Date(trx.createdAt) >= oneWeekAgo) acc.recent++;
      const mode = trx.paymentMode;
      if (mode === "Cash") acc.byMode.cash += trx.amountPaid;
      else if (mode === "Bank Transfer") acc.byMode.bankTransfer += trx.amountPaid;
      else if (mode === "Credit Card") acc.byMode.creditCard += trx.amountPaid;
      else if (mode === "Check") acc.byMode.check += trx.amountPaid;
      else if (mode === "Online Payment") acc.byMode.online += trx.amountPaid;
      return acc;
    }, { total: 0, recent: 0, byMode: { cash: 0, bankTransfer: 0, creditCard: 0, check: 0, online: 0 } });

    const totalPayments = paymentsAggregated.total;
    const paymentsByMode = paymentsAggregated.byMode;
    const recentPayments = paymentsAggregated.recent;

    // Net cash flow
    const netCashFlow = totalReceipts - totalPayments;
    const cashFlowPositive = netCashFlow >= 0;

    // Outstanding payables (unpaid PO amounts)
    const outstandingPayables = purchaseOrders
      .filter(po => !po.archived && ["Ordered", "Partially Received", "Received"].includes(po.status))
      .reduce((sum, po) => sum + Math.max(0, po.totalAmount - (po.totalPaid || 0)), 0);

    return {
      totalReceipts,
      totalPayments,
      netCashFlow,
      cashFlowPositive,
      receiptsByMode,
      paymentsByMode,
      recentReceipts,
      recentPayments,
      outstandingPayables,
      totalReceiptTransactions: activeReceipts.length,
      totalPaymentTransactions: activePayments.length,
    };
  }, [cashBankTransactions, paymentTransactions, purchaseOrders]);

  // Calculate category distribution
  const categoryData = useMemo(() => {
    if (!inventory) return [];

    const categories: Record<InventoryCategory, number> = {
      Electronics: 0,
      Furniture: 0,
      Clothing: 0,
      "Food & Beverages": 0,
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

  // Generate monthly trend data based on actual transaction data
  const monthlyTrendData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // Initialize data for the last 6 months (including current month)
    const monthsData: Record<string, { receipts: number; payments: number; orders: number; shipments: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentDate.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsData[key] = { receipts: 0, payments: 0, orders: 0, shipments: 0 };
    }

    // Aggregate Cash & Bank receipts by month
    (cashBankTransactions || [])
      .filter(trx => !trx.archived)
      .forEach(trx => {
        const date = new Date(trx.trxDate);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthsData[key] !== undefined) {
          monthsData[key].receipts += trx.amountReceived;
        }
      });

    // Aggregate Payments by month
    (paymentTransactions || [])
      .filter(trx => !trx.archived)
      .forEach(trx => {
        const date = new Date(trx.trxDate);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthsData[key] !== undefined) {
          monthsData[key].payments += trx.amountPaid;
        }
      });

    // Aggregate Sales Orders by order date
    (orders || [])
      .filter(order => !order.archived)
      .forEach(order => {
        const date = new Date(order.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthsData[key] !== undefined) {
          monthsData[key].orders += 1;
        }
      });

    // Aggregate Shipments by shipment date
    (shipments || [])
      .filter(shipment => !shipment.archived)
      .forEach(shipment => {
        const date = new Date(shipment.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthsData[key] !== undefined) {
          monthsData[key].shipments += 1;
        }
      });

    // Convert to array format for the chart
    return Object.entries(monthsData).map(([key, data]) => {
      const [year, monthNum] = key.split('-');
      const monthIndex = parseInt(monthNum) - 1;
      return {
        month: monthNames[monthIndex],
        receipts: Math.round(data.receipts),
        payments: Math.round(data.payments),
        netCashFlow: Math.round(data.receipts - data.payments),
        orders: data.orders,
        shipments: data.shipments,
      };
    });
  }, [cashBankTransactions, paymentTransactions, orders, shipments]);

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
      {/* ==================== HEADER SECTION ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Warehouse Management System Overview</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-fit"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Error Alert for Additional Data */}
      {additionalDataError && (
        <Alert variant="destructive" className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Data Loading Warning</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            {additionalDataError}
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto ml-2 text-amber-800 dark:text-amber-200 underline"
              onClick={() => handleRefresh(true)}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ==================== KEY PERFORMANCE INDICATORS ==================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-primary"></div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Key Performance Indicators</h3>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        {/* Primary KPIs - Financial Overview */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Inventory Value</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(stats.totalInventoryValue)}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {inventory.length} unique products
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Order Fulfillment Rate</CardTitle>
            <Target className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.fulfillmentRate}%</div>
            <div className="mt-2">
              <Progress value={stats.fulfillmentRate} className="h-2" indicatorClassName="bg-green-600" />
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {stats.deliveredOrders} of {stats.totalOrders} orders delivered
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Average Order Value</CardTitle>
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {formatCurrency(stats.avgOrderValue)}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              Total: {formatCurrency(stats.totalOrderValue, 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900 border-cyan-200 dark:border-cyan-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Warehouse Capacity</CardTitle>
            <Gauge className="h-5 w-5 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">{stats.capacityUtilization}%</div>
            <div className="mt-2">
              <Progress
                value={stats.capacityUtilization}
                className="h-2"
                indicatorClassName={stats.capacityUtilization > 90 ? "bg-red-600" : stats.capacityUtilization > 70 ? "bg-yellow-600" : "bg-cyan-600"}
              />
            </div>
            <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
              {stats.totalItems.toLocaleString()} items in stock
            </p>
          </CardContent>
        </Card>
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigateToView?.("inventory")}>
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

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigateToView?.("orders")}>
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

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigateToView?.("shipments")}>
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

          <Card className={`cursor-pointer hover:bg-muted/50 transition-colors ${stats.lowStockCount > 0 ? 'border-orange-300 dark:border-orange-800' : ''}`} onClick={() => navigateToView?.("inventory")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${stats.lowStockCount > 0 ? 'text-orange-600' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.lowStockCount > 0 ? 'text-orange-600' : ''}`}>{stats.lowStockCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.criticalItems} critical
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
                {formatCurrency(stats.pendingPOValue, 0)} value
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ==================== QUICK ACTIONS ==================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-primary"></div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardDescription>
              {canModify ? "Frequently used operations for quick access" : "Read-only mode - Contact an Admin to perform actions"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 hover:border-primary hover:bg-primary/5"
                onClick={() => navigateToView?.("inventory", true)}
                disabled={!canModify}
                title={!canModify ? "You don't have permission to add inventory" : undefined}
              >
                <Package className="h-5 w-5" />
                <span className="text-sm">Add Inventory</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 hover:border-primary hover:bg-primary/5"
                onClick={() => navigateToView?.("orders", true)}
                disabled={!canModify}
                title={!canModify ? "You don't have permission to create orders" : undefined}
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="text-sm">New Order</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 hover:border-primary hover:bg-primary/5"
                onClick={() => navigateToView?.("purchase-orders", true)}
                disabled={!canModify}
                title={!canModify ? "You don't have permission to create purchase orders" : undefined}
              >
                <ClipboardList className="h-5 w-5" />
                <span className="text-sm">Create PO</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 hover:border-primary hover:bg-primary/5"
                onClick={() => navigateToView?.("shipments", true)}
                disabled={!canModify}
                title={!canModify ? "You don't have permission to create shipments" : undefined}
              >
                <Truck className="h-5 w-5" />
                <span className="text-sm">New Shipment</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 hover:border-primary hover:bg-primary/5"
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
      </section>

      {/* ==================== CRITICAL ALERTS ==================== */}
      {(stats.lowStockCount > 0 || stats.overstockCount > 0) && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-orange-500"></div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Attention Required</h3>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          <div className="space-y-3">
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
                          Estimated restock: {formatCurrency(stats.totalRestockCost)}
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

            {stats.overstockCount > 0 && (
              <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                <Package className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900 dark:text-blue-100">Overstock Alert</AlertTitle>
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>
                      {stats.overstockCount} item{stats.overstockCount > 1 ? 's exceed' : ' exceeds'} target stock level.
                      {stats.totalExcessValue > 0 && (
                        <span className="ml-1 font-medium">
                          Excess value: {formatCurrency(stats.totalExcessValue)}
                        </span>
                      )}
                    </span>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-blue-700 dark:text-blue-300 underline-offset-4 hover:underline"
                      onClick={() => navigateToView?.("inventory")}
                    >
                      View in Inventory →
                    </Button>
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </section>
      )}

      {/* ==================== CASH FLOW & FINANCIAL METRICS ==================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-emerald-500"></div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cash Flow & Financial Metrics</h3>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        {/* Cash Flow Overview */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToView?.("cash-bank")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Receipts</CardTitle>
            <Landmark className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {formatCurrency(cashFlowStats.totalReceipts)}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              {cashFlowStats.totalReceiptTransactions} transactions • {cashFlowStats.recentReceipts} this week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900 border-rose-200 dark:border-rose-800 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToView?.("payments")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-rose-700 dark:text-rose-300">Total Payments</CardTitle>
            <Wallet className="h-5 w-5 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-900 dark:text-rose-100">
              {formatCurrency(cashFlowStats.totalPayments)}
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3" />
              {cashFlowStats.totalPaymentTransactions} transactions • {cashFlowStats.recentPayments} this week
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${cashFlowStats.cashFlowPositive ? 'from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900 border-teal-200 dark:border-teal-800' : 'from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${cashFlowStats.cashFlowPositive ? 'text-teal-700 dark:text-teal-300' : 'text-amber-700 dark:text-amber-300'}`}>Net Cash Flow</CardTitle>
            {cashFlowStats.cashFlowPositive ? (
              <TrendingUp className="h-5 w-5 text-teal-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-amber-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${cashFlowStats.cashFlowPositive ? 'text-teal-900 dark:text-teal-100' : 'text-amber-900 dark:text-amber-100'}`}>
              {cashFlowStats.cashFlowPositive ? '+' : ''}{formatCurrency(cashFlowStats.netCashFlow)}
            </div>
            <p className={`text-xs mt-1 ${cashFlowStats.cashFlowPositive ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {cashFlowStats.cashFlowPositive ? 'Positive cash flow' : 'Negative cash flow'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToView?.("purchase-orders")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Outstanding Payables</CardTitle>
            <CreditCard className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {formatCurrency(cashFlowStats.outstandingPayables)}
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              From pending purchase orders
            </p>
          </CardContent>
        </Card>
      </div>

        {/* Payment Mode Breakdown */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Receipts by Payment Mode */}
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigateToView?.("cash-bank")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-emerald-600" />
                  Receipts by Payment Mode
                </CardTitle>
                <CardDescription>Cash & Bank collection breakdown</CardDescription>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                {cashFlowStats.totalReceiptTransactions} trx
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cashFlowStats.receiptsByMode.cash > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Cash</span>
                  </div>
                  <span className="font-medium">{formatCurrency(cashFlowStats.receiptsByMode.cash)}</span>
                </div>
              )}
              {cashFlowStats.receiptsByMode.bankTransfer > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Bank Transfer</span>
                  </div>
                  <span className="font-medium">{formatCurrency(cashFlowStats.receiptsByMode.bankTransfer)}</span>
                </div>
              )}
              {cashFlowStats.receiptsByMode.creditCard > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Credit Card</span>
                  </div>
                  <span className="font-medium">{formatCurrency(cashFlowStats.receiptsByMode.creditCard)}</span>
                </div>
              )}
              {cashFlowStats.receiptsByMode.check > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">Check</span>
                  </div>
                  <span className="font-medium">{formatCurrency(cashFlowStats.receiptsByMode.check)}</span>
                </div>
              )}
              {cashFlowStats.receiptsByMode.online > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-cyan-600" />
                    <span className="text-sm">Online Payment</span>
                  </div>
                  <span className="font-medium">{formatCurrency(cashFlowStats.receiptsByMode.online)}</span>
                </div>
              )}
              {cashFlowStats.totalReceipts === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No receipts recorded yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payments by Payment Mode */}
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigateToView?.("payments")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-rose-600" />
                  Payments by Payment Mode
                </CardTitle>
                <CardDescription>Supplier payment breakdown</CardDescription>
              </div>
              <Badge variant="outline" className="text-rose-600 border-rose-300">
                {cashFlowStats.totalPaymentTransactions} trx
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cashFlowStats.paymentsByMode.cash > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Cash</span>
                  </div>
                  <span className="font-medium">{formatCurrency(cashFlowStats.paymentsByMode.cash)}</span>
                </div>
              )}
              {cashFlowStats.paymentsByMode.bankTransfer > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Bank Transfer</span>
                  </div>
                  <span className="font-medium">{formatCurrency(cashFlowStats.paymentsByMode.bankTransfer)}</span>
                </div>
              )}
              {cashFlowStats.paymentsByMode.creditCard > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Credit Card</span>
                  </div>
                  <span className="font-medium">{formatCurrency(cashFlowStats.paymentsByMode.creditCard)}</span>
                </div>
              )}
              {cashFlowStats.paymentsByMode.check > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">Check</span>
                  </div>
                  <span className="font-medium">{formatCurrency(cashFlowStats.paymentsByMode.check)}</span>
                </div>
              )}
              {cashFlowStats.paymentsByMode.online > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-cyan-600" />
                    <span className="text-sm">Online Payment</span>
                  </div>
                  <span className="font-medium">{formatCurrency(cashFlowStats.paymentsByMode.online)}</span>
                </div>
              )}
              {cashFlowStats.totalPayments === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet</p>
              )}
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Monthly Trends Chart - Full Width */}
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Monthly Cash Flow & Activity Trends
              </CardTitle>
              <CardDescription>Receipts, payments, orders, and shipments over the past 6 months</CardDescription>
            </div>
            <Badge variant="outline" className="hidden sm:flex">
              <Calendar className="h-3 w-3 mr-1" />
              Last 6 Months
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={isMobile ? 280 : 350}>
            <AreaChart data={monthlyTrendData}>
              <defs>
                <linearGradient id="colorReceipts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPayments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNetFlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis
                className="text-xs"
                tickFormatter={formatCurrencyCompact}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="receipts"
                stroke={CHART_COLORS.success}
                fillOpacity={1}
                fill="url(#colorReceipts)"
                name="Receipts (Cash & Bank)"
              />
              <Area
                type="monotone"
                dataKey="payments"
                stroke={CHART_COLORS.danger}
                fillOpacity={1}
                fill="url(#colorPayments)"
                name="Payments (Suppliers)"
              />
              <Area
                type="monotone"
                dataKey="netCashFlow"
                stroke={CHART_COLORS.primary}
                fillOpacity={0.5}
                fill="url(#colorNetFlow)"
                name="Net Cash Flow"
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              <span>Orders: {monthlyTrendData.reduce((sum, m) => sum + m.orders, 0)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" />
              <span>Shipments: {monthlyTrendData.reduce((sum, m) => sum + m.shipments, 0)}</span>
            </div>
          </div>
        </CardContent>
        </Card>
      </section>

      {/* ==================== ANALYTICS & INSIGHTS ==================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-purple-500"></div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Analytics & Insights</h3>
          <div className="flex-1 h-px bg-border"></div>
        </div>

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

        {/* Top Products & Inventory Health Row */}
        <div className={`grid gap-4 mt-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
          {/* Top Products by Stock Value */}
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Top Products by Value
            </CardTitle>
            <CardDescription>Highest value items in inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{product.quantity.toLocaleString()} units</span>
                      <span>•</span>
                      <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(product.value, 0)}
                    </p>
                  </div>
                </div>
              ))}
              {stats.topProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No products available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Health Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Inventory Health
            </CardTitle>
            <CardDescription>Overall stock status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Health Score */}
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{stats.healthScore}%</div>
                <p className="text-sm text-muted-foreground">Overall Health Score</p>
              </div>

              {/* Status Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm">In Stock</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stats.inStockItems}</span>
                    <span className="text-xs text-muted-foreground">
                      ({inventory.length > 0 ? Math.round((stats.inStockItems / inventory.length) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Overstock</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-600">{stats.overstockCount}</span>
                    <span className="text-xs text-muted-foreground">
                      ({inventory.length > 0 ? Math.round((stats.overstockCount / inventory.length) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">Low Stock</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stats.lowStockCount - stats.criticalItems}</span>
                    <span className="text-xs text-muted-foreground">
                      ({inventory.length > 0 ? Math.round(((stats.lowStockCount - stats.criticalItems) / inventory.length) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-sm">Critical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-red-600">{stats.criticalItems}</span>
                    <span className="text-xs text-muted-foreground">
                      ({inventory.length > 0 ? Math.round((stats.criticalItems / inventory.length) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Supplier Performance */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Active Suppliers</span>
                  </div>
                  <span className="font-medium">{stats.activeSuppliers}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm">PO Completion Rate</span>
                  </div>
                  <span className="font-medium text-green-600">{stats.supplierPerformance}%</span>
                </div>
              </div>
            </div>
          </CardContent>
          </Card>
        </div>
      </section>

      {/* ==================== DETAILED INVENTORY STATUS ==================== */}
      {(stats.lowStockItems.length > 0 || stats.overstockItems.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-orange-500"></div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Detailed Inventory Status</h3>
            <div className="flex-1 h-px bg-border"></div>
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
                      • Est. restock cost: {formatCurrency(stats.totalRestockCost)}
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
                          Est. cost: <span className="font-medium text-foreground">{formatCurrency(item.restockCost)}</span>
                        </span>
                      )}
                      {item.pricePerPiece > 0 && (
                        <span>
                          Unit price: {formatCurrency(item.pricePerPiece)}
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

          {/* Overstock Items List */}
          {stats.overstockItems.length > 0 && (
          <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Overstock Items
                  <Badge variant="outline" className="ml-2 text-blue-600 border-blue-300">
                    {stats.overstockCount} items
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Items exceeding target stock level
                  {stats.totalExcessValue > 0 && (
                    <span className="ml-2 font-medium text-blue-700 dark:text-blue-400">
                      • Excess value: {formatCurrency(stats.totalExcessValue)}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.overstockItems.slice(0, 5).map((item) => {
                return (
                  <div key={item.id} className="space-y-2 pb-4 border-b last:border-0 last:pb-0">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{item.name}</p>
                          <Badge variant="secondary" className="shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            Overstock
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {item.supplierName} • {item.location} • {item.category}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => navigateToView?.("inventory")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Stock Info */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Stock: <span className="font-medium text-foreground">{item.quantity}</span> / {item.maintainStockAt} (target)
                        </span>
                        <span className="font-medium text-blue-600">
                          {item.overstockPercentage}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-blue-500"
                          style={{ width: `${Math.min(100, (item.maintainStockAt / item.quantity) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Excess Info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Excess: <span className="font-medium text-blue-600">{item.excessQty} units</span></span>
                      <span>Excess value: <span className="font-medium">{formatCurrency(item.excessValue)}</span></span>
                    </div>
                  </div>
                );
              })}

              {/* Footer with View All link */}
              <div className="flex items-center justify-between pt-2">
                {stats.overstockItems.length > 5 ? (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-blue-600 hover:text-blue-700"
                    onClick={() => navigateToView?.("inventory")}
                  >
                    View all {stats.overstockItems.length} overstock items →
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
              </div>
            </div>
          </CardContent>
          </Card>
          )}
        </section>
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
