import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { Search, Eye, Plus, ShoppingCart, X, Trash2, RefreshCw, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { TableLoadingSkeleton } from "./ui/loading-skeleton";
import { EmptyState } from "./ui/empty-state";
import { DateRangeFilter } from "./ui/date-range-filter";

import { createOrder, deleteOrder, getOrders, updateOrder, bulkDeleteOrders, bulkUpdateOrderStatus } from "../services/api";
import type { Order, SavedSearch } from "../types";

import { usePagination } from "../hooks/usePagination";
import { useDebounce } from "../hooks/useDebounce";
import { useBatchSelection } from "../hooks/useBatchSelection";
import { PaginationControls } from "./ui/pagination-controls";
import { BulkActionsToolbar } from "./ui/bulk-actions-toolbar";
import { BulkDeleteDialog } from "./ui/bulk-delete-dialog";
import { BulkUpdateDialog } from "./ui/bulk-update-dialog";
import { cn } from "./ui/utils";
import { FavoriteButton } from "./ui/favorite-button";
import { SaveSearchDialog } from "./ui/save-search-dialog";
import { useFavorites } from "../context/favorites-context";
import { useTableSort } from "../hooks/useTableSort";
import { SortableTableHead } from "./ui/sortable-table-head";
import { useAuth } from "../context/auth-context";
import { canWrite } from "../lib/permissions";
import { EditableCell } from "./ui/editable-cell";

const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered"] as const;

interface OrdersViewProps {
  initialOpenDialog?: boolean;
  onDialogOpened?: () => void;
}

export function OrdersView({ initialOpenDialog, onDialogOpened }: OrdersViewProps) {
  const { isFavorite, getFavoritesByType } = useFavorites();
  const { user } = useAuth();
  const canModify = user ? canWrite(user.role) : false;
  const [searchTerm, setSearchTerm] = useState("");
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
    items: 0,
    total: "",
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

  // Optimized filtering with early returns and debounced search
  const filteredOrders = useMemo(() => {
    return list.filter(order => {
      // Early return for favorites filter
      if (showFavoritesOnly && !isFavorite("orders", order.id)) {
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
  }, [list, debouncedSearchTerm, fromDate, toDate, showFavoritesOnly, isFavorite]);

  // Handle applying saved searches
  const handleApplySavedSearch = useCallback((search: SavedSearch) => {
    if (search.searchTerm) {
      setSearchTerm(search.searchTerm);
    }
    if (search.filters.fromDate && typeof search.filters.fromDate === "string") {
      setFromDate(search.filters.fromDate);
    }
    if (search.filters.toDate && typeof search.filters.toDate === "string") {
      setToDate(search.filters.toDate);
    }
    if (search.filters.favoritesOnly === "true") {
      setShowFavoritesOnly(true);
    }
  }, []);

  // Get current filter configuration for saving
  const getCurrentFilters = useMemo(() => {
    const filters: Record<string, string | string[]> = {};
    if (fromDate) {
      filters.fromDate = fromDate;
    }
    if (toDate) {
      filters.toDate = toDate;
    }
    if (showFavoritesOnly) {
      filters.favoritesOnly = "true";
    }
    return filters;
  }, [fromDate, toDate, showFavoritesOnly]);

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
    setForm({ id: "", customer: "", items: 0, total: "", status: "Pending", date: "" });
  }

  function clearDateFilter() {
    setFromDate("");
    setToDate("");
  }

  function validateForm() {
    if (!form.customer.trim()) return "Customer is required";
    if (!form.total.trim()) return "Total is required";
    if (!form.date.trim()) return "Date is required";
    if (form.items < 0) return "Items cannot be negative";
    return null;
  }

  async function handleAdd() {
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    try {
      const created = await createOrder({ customer: form.customer, items: form.items, total: form.total, status: form.status, date: form.date });
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
      const updated = await updateOrder({ id: form.id, customer: form.customer, items: form.items, total: form.total, status: form.status, date: form.date });
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
        return "bg-green-500/10 text-green-700";
      case "Shipped":
        return "bg-blue-500/10 text-blue-700";
      case "Processing":
        return "bg-orange-500/10 text-orange-700";
      case "Pending":
        return "bg-gray-500/10 text-gray-700";
      default:
        return "bg-gray-500/10 text-gray-700";
    }
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">256</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">42</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">89</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">125</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order Management</CardTitle>
            <div className="flex gap-2">

              <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()} disabled={!canModify} title={!canModify ? "You don't have permission to add orders" : undefined}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Order
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Order</DialogTitle>
                    <DialogDescription>Enter the details for the new order.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer">Customer</Label>
                      <Input id="customer" placeholder="Customer name" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="items">Items</Label>
                      <Input id="items" type="number" placeholder="0" value={form.items} onChange={(e) => setForm({ ...form, items: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="total">Total (PHP ₱)</Label>
                      <Input id="total" placeholder="₱0.00" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Input id="status" placeholder="Pending" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Order["status"] })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input id="date" placeholder="2025-10-15" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                    </div>
                    <Button className="w-full" onClick={handleAdd}>Add Order</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
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
              <SaveSearchDialog
                entityType="orders"
                currentSearchTerm={searchTerm}
                currentFilters={getCurrentFilters}
                onApplySearch={handleApplySavedSearch}
              />
            </div>

            {/* Active Filters Badge */}
            {(fromDate || toDate) && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  Date: {fromDate || '...'} to {toDate || '...'}
                  <button
                    onClick={clearDateFilter}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
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
                      <TableRow key={order.id} className={cn(orderIsSelected && "bg-muted/50")}>
                        <TableCell>
                          <Checkbox
                            checked={orderIsSelected}
                            onCheckedChange={() => toggleItem(order.id)}
                            aria-label={`Select order ${order.id}`}
                          />
                        </TableCell>
                        <TableCell>{order.id}</TableCell>
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
                          <EditableCell
                            value={order.total}
                            type="text"
                            onSave={(v) => handleInlineUpdate(order.id, "total", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={order.status}
                            type="badge"
                            options={ORDER_STATUSES.map(s => ({ value: s, label: s }))}
                            badgeClassName={getStatusColor(order.status)}
                            onSave={(v) => handleInlineUpdate(order.id, "status", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={order.date}
                            type="text"
                            onSave={(v) => handleInlineUpdate(order.id, "date", v)}
                            disabled={!canModify}
                          />
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
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Order - {order.id}</DialogTitle>
                              <DialogDescription>Update fields and save your changes.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-customer">Customer</Label>
                                <Input id="edit-customer" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-items">Items</Label>
                                <Input id="edit-items" type="number" value={form.items} onChange={(e) => setForm({ ...form, items: Number(e.target.value) })} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-total">Total (PHP ₱)</Label>
                                <Input id="edit-total" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <Input id="edit-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Order["status"] })} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-date">Date</Label>
                                <Input id="edit-date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                              </div>
                              <div className="flex gap-2">
                                <Button className="flex-1" onClick={handleEditSave}>Save Changes</Button>
                                <Button variant="destructive" onClick={() => handleDelete(order.id)}>Delete</Button>
                              </div>
                            </div>
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
