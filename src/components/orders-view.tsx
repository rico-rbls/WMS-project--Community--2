import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { Search, Eye, Plus, ShoppingCart, X, Trash2, RefreshCw, Star, TrendingUp, Clock, Package, Users, DollarSign, Filter, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { TableLoadingSkeleton } from "./ui/loading-skeleton";
import { EmptyState } from "./ui/empty-state";
import { DateRangeFilter } from "./ui/date-range-filter";

import { createOrder, deleteOrder, getOrders, updateOrder, bulkDeleteOrders, bulkUpdateOrderStatus } from "../services/api";
import type { Order } from "../types";

import { usePagination } from "../hooks/usePagination";
import { useDebounce } from "../hooks/useDebounce";
import { useBatchSelection } from "../hooks/useBatchSelection";
import { PaginationControls } from "./ui/pagination-controls";
import { BulkActionsToolbar } from "./ui/bulk-actions-toolbar";
import { BulkDeleteDialog } from "./ui/bulk-delete-dialog";
import { BulkUpdateDialog } from "./ui/bulk-update-dialog";
import { cn } from "./ui/utils";
import { FavoriteButton } from "./ui/favorite-button";

import { useFavorites } from "../context/favorites-context";
import { useTableSort } from "../hooks/useTableSort";
import { SortableTableHead } from "./ui/sortable-table-head";
import { useAuth } from "../context/auth-context";
import { canWrite } from "../lib/permissions";
import { EditableCell } from "./ui/editable-cell";

const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered"] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

interface OrdersViewProps {
  initialOpenDialog?: boolean;
  onDialogOpened?: () => void;
}

export function OrdersView({ initialOpenDialog, onDialogOpened }: OrdersViewProps) {
  const { isFavorite, getFavoritesByType } = useFavorites();
  const { user } = useAuth();
  const canModify = user ? canWrite(user.role) : false;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [ordersData, setOrdersData] = useState<Order[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: "",
    customer: "",
    items: "" as string | number,
    total: "" as string | number,
    status: "Pending" as Order["status"],
    date: "",
  });

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const data = await getOrders();
      setOrdersData(data);
      setIsLoading(false);
    })();
  }, []);

  // Open dialog when triggered from Dashboard Quick Actions
  useEffect(() => {
    if (initialOpenDialog && !isAddOpen) {
      setIsAddOpen(true);
      onDialogOpened?.();
    }
  }, [initialOpenDialog, onDialogOpened, isAddOpen]);

  const list = useMemo<Order[]>(() => ordersData ?? [], [ordersData]);

  // Calculate order statistics dynamically
  const orderStats = useMemo(() => {
    const totalOrders = list.length;

    // Status breakdown
    const pendingOrders = list.filter(o => o.status === "Pending").length;
    const processingOrders = list.filter(o => o.status === "Processing").length;
    const shippedOrders = list.filter(o => o.status === "Shipped").length;
    const deliveredOrders = list.filter(o => o.status === "Delivered").length;

    // Parse total amounts (handle ₱ prefix and commas)
    const parseOrderTotal = (total: string): number => {
      const cleaned = total.replace(/[₱,\s]/g, "");
      return parseFloat(cleaned) || 0;
    };

    // Revenue calculations
    const totalRevenue = list.reduce((sum, order) => sum + parseOrderTotal(order.total), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Recent orders (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentOrders7Days = list.filter(order => {
      try {
        const orderDate = new Date(order.date);
        return orderDate >= sevenDaysAgo;
      } catch {
        return false;
      }
    }).length;

    const recentOrders30Days = list.filter(order => {
      try {
        const orderDate = new Date(order.date);
        return orderDate >= thirtyDaysAgo;
      } catch {
        return false;
      }
    }).length;

    // Revenue from last 30 days
    const recentRevenue = list.filter(order => {
      try {
        const orderDate = new Date(order.date);
        return orderDate >= thirtyDaysAgo;
      } catch {
        return false;
      }
    }).reduce((sum, order) => sum + parseOrderTotal(order.total), 0);

    // Top customers by order count
    const customerOrderCounts = list.reduce((acc, order) => {
      acc[order.customer] = (acc[order.customer] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCustomers = Object.entries(customerOrderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Top customer by value
    const customerValues = list.reduce((acc, order) => {
      acc[order.customer] = (acc[order.customer] || 0) + parseOrderTotal(order.total);
      return acc;
    }, {} as Record<string, number>);

    const topCustomerByValue = Object.entries(customerValues)
      .sort((a, b) => b[1] - a[1])[0];

    // Fulfillment rate (Delivered / Total)
    const fulfillmentRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

    // In-progress rate (Processing + Shipped)
    const inProgressOrders = processingOrders + shippedOrders;

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      inProgressOrders,
      totalRevenue,
      averageOrderValue,
      recentOrders7Days,
      recentOrders30Days,
      recentRevenue,
      topCustomers,
      topCustomerByValue: topCustomerByValue ? { name: topCustomerByValue[0], value: topCustomerByValue[1] } : null,
      fulfillmentRate,
    };
  }, [list]);

  // Optimized filtering with early returns and debounced search
  const filteredOrders = useMemo(() => {
    return list.filter(order => {
      // Early return for favorites filter
      if (showFavoritesOnly && !isFavorite("orders", order.id)) {
        return false;
      }

      // Status filter
      if (filterStatus !== "all" && order.status !== filterStatus) {
        return false;
      }

      // Early return for search filter
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const matchesSearch =
          order.id.toLowerCase().includes(searchLower) ||
          order.customer.toLowerCase().includes(searchLower);

        if (!matchesSearch) {
          return false;
        }
      }

      // Date range filter
      if (fromDate || toDate) {
        try {
          const orderDate = new Date(order.date);

          if (fromDate) {
            const from = new Date(fromDate);
            if (orderDate < from) {
              return false;
            }
          }

          if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999); // Include the entire end date
            if (orderDate > to) {
              return false;
            }
          }
        } catch (e) {
          // If date parsing fails, exclude the item
          return false;
        }
      }

      return true;
    });
  }, [list, debouncedSearchTerm, filterStatus, fromDate, toDate, showFavoritesOnly, isFavorite]);



  // Sorting - applied before pagination
  const {
    sortedData,
    sortConfig,
    requestSort,
    getSortDirection,
  } = useTableSort<Order>(filteredOrders);

  // Pagination with 25 items per page
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    totalItems,
    itemsPerPage,
  } = usePagination(sortedData, 25);

  // Batch selection for current page items
  const {
    selectedIds,
    selectedItems,
    selectionCount,
    isAllSelected,
    isPartiallySelected,
    hasSelection,
    toggleItem,
    toggleAll,
    deselectAll,
    isSelected,
  } = useBatchSelection(paginatedData);

  // Bulk operation states
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);

  // Clear selection when page changes
  useEffect(() => {
    deselectAll();
  }, [currentPage, deselectAll]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "a" && !isAddOpen && !isEditOpen) {
        e.preventDefault();
        toggleAll();
      }
      if (e.key === "Escape" && hasSelection) {
        deselectAll();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleAll, deselectAll, hasSelection, isAddOpen, isEditOpen]);

  function resetForm() {
    setForm({ id: "", customer: "", items: "", total: "", status: "Pending", date: new Date().toISOString().split("T")[0] });
  }

  function clearDateFilter() {
    setFromDate("");
    setToDate("");
  }

  function clearAllFilters() {
    setSearchTerm("");
    setFilterStatus("all");
    setFromDate("");
    setToDate("");
    setShowFavoritesOnly(false);
  }

  function validateForm() {
    if (!form.customer.trim()) return "Customer is required";
    const totalVal = typeof form.total === "string" ? form.total.trim() : String(form.total);
    if (!totalVal) return "Total is required";
    if (!form.date.trim()) return "Date is required";
    const itemsNum = Number(form.items) || 0;
    if (itemsNum < 0) return "Items cannot be negative";
    return null;
  }

  // Format total value for storage (add ₱ prefix if not present)
  const formatTotal = (value: string | number): string => {
    const strValue = String(value).trim();
    const numericValue = parseFloat(strValue.replace(/[₱,\s]/g, "")) || 0;
    return `₱${numericValue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  async function handleAdd() {
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    try {
      const itemsNum = Number(form.items) || 0;
      const formattedTotal = formatTotal(form.total);
      const created = await createOrder({ customer: form.customer, items: itemsNum, total: formattedTotal, status: form.status, date: form.date });
      setOrdersData((prev) => [created, ...(prev ?? [])]);
      setIsAddOpen(false);
      resetForm();
      toast.success("Order created successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create order");
    }
  }

  async function handleEditSave() {
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    if (!form.id) {
      toast.error("Missing order id");
      return;
    }
    try {
      const itemsNum = Number(form.items) || 0;
      const formattedTotal = formatTotal(form.total);
      const updated = await updateOrder({ id: form.id, customer: form.customer, items: itemsNum, total: formattedTotal, status: form.status, date: form.date });
      setOrdersData((prev) => (prev ?? []).map((o) => (o.id === updated.id ? updated : o)));
      setIsEditOpen(null);
      toast.success("Order updated successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update order");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteOrder(id);
      setOrdersData((prev) => (prev ?? []).filter((o) => o.id !== id));
      setIsEditOpen(null);
      toast.success("Order deleted successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete order");
    }
  }

  // Inline edit handler for quick cell updates
  const handleInlineUpdate = useCallback(async (orderId: string, field: keyof Order, value: string | number) => {
    try {
      const updates: Partial<Order> = { [field]: value };
      const updated = await updateOrder({ id: orderId, ...updates });
      setOrdersData((prev) => (prev ?? []).map((o) => (o.id === orderId ? updated : o)));
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
      throw e;
    }
  }, [setOrdersData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200";
      case "Shipped":
        return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200";
      case "Processing":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200";
      case "Pending":
        return "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-200";
      default:
        return "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Delivered":
        return "✓";
      case "Shipped":
        return "🚚";
      case "Processing":
        return "⏳";
      case "Pending":
        return "○";
      default:
        return "○";
    }
  };

  // Format currency for display
  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkDeleteOrders(ids);

      setOrdersData((prev) => prev?.filter((order) => !ids.includes(order.id)) ?? []);

      if (result.failedCount > 0) {
        toast.warning(`Deleted ${result.successCount} orders. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully deleted ${result.successCount} order${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete orders");
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  }, [selectedIds, deselectAll]);

  // Bulk status update handler
  const handleBulkStatusUpdate = useCallback(async (status: string) => {
    setIsBulkUpdating(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkUpdateOrderStatus(ids, status as Order["status"]);

      setOrdersData((prev) => {
        if (!prev) return prev;
        return prev.map((order) => {
          if (ids.includes(order.id)) {
            return { ...order, status: status as Order["status"] };
          }
          return order;
        });
      });

      if (result.failedCount > 0) {
        toast.warning(`Updated ${result.successCount} orders. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully updated ${result.successCount} order${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update orders");
    } finally {
      setIsBulkUpdating(false);
      setShowBulkStatusDialog(false);
    }
  }, [selectedIds, deselectAll]);

  // Get names of selected orders for dialogs
  const selectedOrderNames = useMemo(() => {
    return selectedItems.map(order => `${order.id} - ${order.customer}`);
  }, [selectedItems]);

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Orders */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {orderStats.recentOrders7Days} new this week
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(orderStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(orderStats.averageOrderValue)} per order
            </p>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{orderStats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {orderStats.processingOrders} processing, {orderStats.shippedOrders} shipped
            </p>
          </CardContent>
        </Card>

        {/* Fulfillment Rate */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fulfillment Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{orderStats.fulfillmentRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {orderStats.deliveredOrders} delivered of {orderStats.totalOrders} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4",
            filterStatus === "Pending" ? "ring-2 ring-primary" : "",
            "border-l-slate-400"
          )}
          onClick={() => setFilterStatus(filterStatus === "Pending" ? "all" : "Pending")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</p>
                <p className="text-xl font-bold mt-1">{orderStats.pendingOrders}</p>
              </div>
              <Badge variant="outline" className={getStatusColor("Pending")}>
                {getStatusIcon("Pending")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4",
            filterStatus === "Processing" ? "ring-2 ring-primary" : "",
            "border-l-amber-400"
          )}
          onClick={() => setFilterStatus(filterStatus === "Processing" ? "all" : "Processing")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Processing</p>
                <p className="text-xl font-bold mt-1">{orderStats.processingOrders}</p>
              </div>
              <Badge variant="outline" className={getStatusColor("Processing")}>
                {getStatusIcon("Processing")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4",
            filterStatus === "Shipped" ? "ring-2 ring-primary" : "",
            "border-l-blue-400"
          )}
          onClick={() => setFilterStatus(filterStatus === "Shipped" ? "all" : "Shipped")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shipped</p>
                <p className="text-xl font-bold mt-1">{orderStats.shippedOrders}</p>
              </div>
              <Badge variant="outline" className={getStatusColor("Shipped")}>
                {getStatusIcon("Shipped")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4",
            filterStatus === "Delivered" ? "ring-2 ring-primary" : "",
            "border-l-emerald-400"
          )}
          onClick={() => setFilterStatus(filterStatus === "Delivered" ? "all" : "Delivered")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivered</p>
                <p className="text-xl font-bold mt-1">{orderStats.deliveredOrders}</p>
              </div>
              <Badge variant="outline" className={getStatusColor("Delivered")}>
                {getStatusIcon("Delivered")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Order Management</CardTitle>
              <CardDescription className="mt-1">
                Manage and track all customer orders
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()} disabled={!canModify} title={!canModify ? "You don't have permission to add orders" : undefined}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Order</DialogTitle>
                    <DialogDescription>Enter the details for the new customer order.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="customer">Customer Name *</Label>
                      <Input
                        id="customer"
                        placeholder="Enter customer name"
                        value={form.customer}
                        onChange={(e) => setForm({ ...form, customer: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="items">Number of Items</Label>
                        <Input
                          id="items"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={form.items}
                          onChange={(e) => setForm({ ...form, items: e.target.value === "" ? "" : e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="total">Order Total (₱) *</Label>
                        <Input
                          id="total"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.total}
                          onChange={(e) => setForm({ ...form, total: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="status">Order Status</Label>
                        <Select
                          value={form.status}
                          onValueChange={(value: OrderStatus) => setForm({ ...form, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                <span className="flex items-center gap-2">
                                  <span>{getStatusIcon(status)}</span>
                                  {status}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="date">Order Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={form.date}
                          onChange={(e) => setForm({ ...form, date: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd}>Create Order</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID or customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      <span className="flex items-center gap-2">
                        <span>{getStatusIcon(status)}</span>
                        {status}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <DateRangeFilter
                fromDate={fromDate}
                toDate={toDate}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}
                onClear={clearDateFilter}
                label="Filter by Order Date"
              />
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="gap-1"
              >
                <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
                Favorites
                {getFavoritesByType("orders").length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {getFavoritesByType("orders").length}
                  </Badge>
                )}
              </Button>

              {/* Clear All Filters */}
              {(searchTerm || filterStatus !== "all" || fromDate || toDate || showFavoritesOnly) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Active Filters Badges */}
            {(filterStatus !== "all" || fromDate || toDate) && (
              <div className="flex flex-wrap gap-2">
                {filterStatus !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {filterStatus}
                    <button
                      onClick={() => setFilterStatus("all")}
                      className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {(fromDate || toDate) && (
                  <Badge variant="secondary" className="gap-1">
                    Date: {fromDate || '...'} to {toDate || '...'}
                    <button
                      onClick={clearDateFilter}
                      className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Bulk Actions Toolbar */}
          {hasSelection && canModify && (
            <BulkActionsToolbar
              selectionCount={selectionCount}
              onClearSelection={deselectAll}
              isLoading={isBulkDeleting || isBulkUpdating}
              actions={[
                {
                  id: "delete",
                  label: "Delete",
                  icon: <Trash2 className="h-4 w-4 mr-1" />,
                  variant: "destructive",
                  onClick: () => setShowBulkDeleteDialog(true),
                },
              ]}
              actionGroups={[
                {
                  id: "status-update",
                  label: "Update Status",
                  icon: <RefreshCw className="h-4 w-4 mr-1" />,
                  options: [
                    { value: "Pending", label: "Pending" },
                    { value: "Processing", label: "Processing" },
                    { value: "Shipped", label: "Shipped" },
                    { value: "Delivered", label: "Delivered" },
                  ],
                  onSelect: (value) => handleBulkStatusUpdate(value),
                },
              ]}
              className="mb-4"
            />
          )}

          {/* Bulk Delete Dialog */}
          <BulkDeleteDialog
            open={showBulkDeleteDialog}
            onOpenChange={setShowBulkDeleteDialog}
            itemCount={selectionCount}
            itemType="order"
            itemNames={selectedOrderNames}
            onConfirm={handleBulkDelete}
            isLoading={isBulkDeleting}
          />

          {isLoading ? (
            <TableLoadingSkeleton rows={8} />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No orders found"
              description={(searchTerm || fromDate || toDate)
                ? "Try adjusting your search or date filters"
                : "Get started by creating your first order"}
              actionLabel={!(searchTerm || fromDate || toDate) ? "Create Order" : undefined}
              onAction={!(searchTerm || fromDate || toDate) ? () => setIsAddOpen(true) : undefined}
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) {
                            (el as any).indeterminate = isPartiallySelected;
                          }
                        }}
                        onCheckedChange={toggleAll}
                        aria-label="Select all orders"
                      />
                    </TableHead>
                    <SortableTableHead
                      sortKey="id"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("id")}
                      onSort={(key) => requestSort(key as keyof Order)}
                    >
                      Order ID
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="customer"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("customer")}
                      onSort={(key) => requestSort(key as keyof Order)}
                    >
                      Customer
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="items"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("items")}
                      onSort={(key) => requestSort(key as keyof Order)}
                    >
                      Items
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="total"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("total")}
                      onSort={(key) => requestSort(key as keyof Order)}
                    >
                      Total
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("status")}
                      onSort={(key) => requestSort(key as keyof Order)}
                    >
                      Status
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="date"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("date")}
                      onSort={(key) => requestSort(key as keyof Order)}
                    >
                      Date
                    </SortableTableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((order) => {
                    const orderIsSelected = isSelected(order.id);
                    return (
                      <TableRow
                        key={order.id}
                        className={cn(
                          "transition-colors hover:bg-muted/50",
                          orderIsSelected && "bg-primary/5 hover:bg-primary/10"
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={orderIsSelected}
                            onCheckedChange={() => toggleItem(order.id)}
                            aria-label={`Select order ${order.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">{order.id}</span>
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={order.customer}
                            type="text"
                            onSave={(v) => handleInlineUpdate(order.id, "customer", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={order.items}
                            type="number"
                            min={0}
                            step={1}
                            onSave={(v) => handleInlineUpdate(order.id, "items", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-emerald-600">{order.total}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-medium border transition-colors",
                              getStatusColor(order.status)
                            )}
                          >
                            <span className="mr-1">{getStatusIcon(order.status)}</span>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {new Date(order.date).toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FavoriteButton
                              entityType="orders"
                              entityId={order.id}
                              entityName={`${order.id} - ${order.customer}`}
                            />
                            <Dialog open={isEditOpen === order.id} onOpenChange={(o) => { setIsEditOpen(o ? order.id : null); if (o) setForm({ ...order }); }}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" disabled={!canModify} title={!canModify ? "You don't have permission to edit orders" : undefined}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>Edit Order</DialogTitle>
                                  <DialogDescription>
                                    Order ID: <span className="font-mono font-medium">{order.id}</span>
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-customer">Customer Name</Label>
                                    <Input
                                      id="edit-customer"
                                      value={form.customer}
                                      onChange={(e) => setForm({ ...form, customer: e.target.value })}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-items">Number of Items</Label>
                                      <Input
                                        id="edit-items"
                                        type="number"
                                        min="0"
                                        value={form.items}
                                        onChange={(e) => setForm({ ...form, items: e.target.value === "" ? "" : e.target.value })}
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-total">Order Total (₱)</Label>
                                      <Input
                                        id="edit-total"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={typeof form.total === "string" ? form.total.replace(/[₱,\s]/g, "") : form.total}
                                        onChange={(e) => setForm({ ...form, total: e.target.value })}
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-status">Order Status</Label>
                                      <Select
                                        value={form.status}
                                        onValueChange={(value: OrderStatus) => setForm({ ...form, status: value })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {ORDER_STATUSES.map((status) => (
                                            <SelectItem key={status} value={status}>
                                              <span className="flex items-center gap-2">
                                                <span>{getStatusIcon(status)}</span>
                                                {status}
                                              </span>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-date">Order Date</Label>
                                      <Input
                                        id="edit-date"
                                        type="date"
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter className="flex-col sm:flex-row gap-2">
                                  <Button variant="destructive" onClick={() => handleDelete(order.id)} className="sm:mr-auto">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Order
                                  </Button>
                                  <Button variant="outline" onClick={() => setIsEditOpen(null)}>Cancel</Button>
                                  <Button onClick={handleEditSave}>Save Changes</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {filteredOrders.length > 0 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalItems}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
