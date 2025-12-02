import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, MapPin, Package, Plus, Truck, X, Trash2, RefreshCw, Star, TrendingUp, Clock, CheckCircle, Filter, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { TableLoadingSkeleton } from "./ui/loading-skeleton";
import { EmptyState } from "./ui/empty-state";
import { DateRangeFilter } from "./ui/date-range-filter";
import { createShipment, deleteShipment, getShipments, updateShipment, bulkDeleteShipments, bulkUpdateShipmentStatus } from "../services/api";
import type { Shipment } from "../types";

import { usePagination } from "../hooks/usePagination";
import { useDebounce } from "../hooks/useDebounce";
import { useBatchSelection } from "../hooks/useBatchSelection";
import { PaginationControls } from "./ui/pagination-controls";
import { BulkActionsToolbar } from "./ui/bulk-actions-toolbar";
import { BulkDeleteDialog } from "./ui/bulk-delete-dialog";
import { cn } from "./ui/utils";
import { FavoriteButton } from "./ui/favorite-button";

import { useFavorites } from "../context/favorites-context";
import { useTableSort } from "../hooks/useTableSort";
import { SortableTableHead } from "./ui/sortable-table-head";
import { useAuth } from "../context/auth-context";
import { canWrite } from "../lib/permissions";
import { EditableCell } from "./ui/editable-cell";

const SHIPMENT_STATUSES = ["Pending", "In Transit", "Delivered"] as const;
type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

// Common carriers for suggestions
const COMMON_CARRIERS = ["FedEx", "UPS", "DHL", "USPS", "LBC Express", "J&T Express", "Ninja Van", "Grab Express"] as const;

interface ShipmentsViewProps {
  initialOpenDialog?: boolean;
  onDialogOpened?: () => void;
}

export function ShipmentsView({ initialOpenDialog, onDialogOpened }: ShipmentsViewProps) {
  const { isFavorite, getFavoritesByType } = useFavorites();
  const { user } = useAuth();
  const canModify = user ? canWrite(user.role) : false;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [shipmentsData, setShipmentsData] = useState<Shipment[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: "",
    orderId: "",
    destination: "",
    carrier: "",
    status: "Pending" as Shipment["status"],
    eta: "",
  });

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const data = await getShipments();
      setShipmentsData(data);
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

  const list = useMemo<Shipment[]>(() => shipmentsData ?? [], [shipmentsData]);

  // Calculate shipment statistics dynamically
  const shipmentStats = useMemo(() => {
    const totalShipments = list.length;

    // Status breakdown
    const pendingShipments = list.filter(s => s.status === "Pending").length;
    const inTransitShipments = list.filter(s => s.status === "In Transit").length;
    const deliveredShipments = list.filter(s => s.status === "Delivered").length;

    // Active shipments (Pending + In Transit)
    const activeShipments = pendingShipments + inTransitShipments;

    // Recent shipments (ETA in last 7 days and 30 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const recentDeliveries7Days = list.filter(shipment => {
      if (shipment.status !== "Delivered") return false;
      try {
        const etaDate = new Date(shipment.eta);
        return etaDate >= sevenDaysAgo && etaDate <= now;
      } catch {
        return false;
      }
    }).length;

    const upcomingDeliveries = list.filter(shipment => {
      if (shipment.status === "Delivered") return false;
      try {
        const etaDate = new Date(shipment.eta);
        return etaDate >= now && etaDate <= sevenDaysFromNow;
      } catch {
        return false;
      }
    }).length;

    // On-time delivery rate calculation
    // Consider a shipment on-time if it was delivered on or before ETA
    const deliveredWithEta = list.filter(s => s.status === "Delivered");
    const onTimeDeliveries = deliveredWithEta.length; // Assuming all delivered are on-time for now
    const onTimeRate = deliveredWithEta.length > 0 ? Math.round((onTimeDeliveries / deliveredWithEta.length) * 100) : 0;

    // Fulfillment rate (Delivered / Total)
    const fulfillmentRate = totalShipments > 0 ? Math.round((deliveredShipments / totalShipments) * 100) : 0;

    // Top carriers by shipment count
    const carrierCounts = list.reduce((acc, shipment) => {
      acc[shipment.carrier] = (acc[shipment.carrier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCarriers = Object.entries(carrierCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Top destinations by shipment count
    const destinationCounts = list.reduce((acc, shipment) => {
      acc[shipment.destination] = (acc[shipment.destination] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topDestinations = Object.entries(destinationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Average transit time (would need actual dates for real calculation)
    const avgTransitDays = 3; // Placeholder - would calculate from actual shipment/delivery dates

    return {
      totalShipments,
      pendingShipments,
      inTransitShipments,
      deliveredShipments,
      activeShipments,
      recentDeliveries7Days,
      upcomingDeliveries,
      onTimeRate,
      fulfillmentRate,
      topCarriers,
      topDestinations,
      avgTransitDays,
    };
  }, [list]);

  // Optimized filtering with early returns and debounced search
  const filteredShipments = useMemo(() => {
    return list.filter(shipment => {
      // Early return for favorites filter
      if (showFavoritesOnly && !isFavorite("shipments", shipment.id)) {
        return false;
      }

      // Status filter
      if (filterStatus !== "all" && shipment.status !== filterStatus) {
        return false;
      }

      // Early return for search filter
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const matchesSearch =
          shipment.id.toLowerCase().includes(searchLower) ||
          shipment.orderId.toLowerCase().includes(searchLower) ||
          shipment.destination.toLowerCase().includes(searchLower) ||
          shipment.carrier.toLowerCase().includes(searchLower);

        if (!matchesSearch) {
          return false;
        }
      }

      // Date range filter (by ETA)
      if (fromDate || toDate) {
        try {
          const etaDate = new Date(shipment.eta);

          if (fromDate) {
            const from = new Date(fromDate);
            if (etaDate < from) {
              return false;
            }
          }

          if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999); // Include the entire end date
            if (etaDate > to) {
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
  } = useTableSort<Shipment>(filteredShipments);

  // Pagination with 25 items per page
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    totalItems,
    itemsPerPage,
  } = usePagination(sortedData, 25);

  // Batch selection
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
    setForm({
      id: "",
      orderId: "",
      destination: "",
      carrier: "",
      status: "Pending",
      eta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // Default ETA: 7 days from now
    });
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
    if (!form.orderId.trim()) return "Order ID is required";
    if (!form.destination.trim()) return "Destination is required";
    if (!form.carrier.trim()) return "Carrier is required";
    if (!form.eta.trim()) return "ETA is required";
    return null;
  }

  async function handleAdd() {
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    try {
      const created = await createShipment({ orderId: form.orderId, destination: form.destination, carrier: form.carrier, status: form.status, eta: form.eta });
      setShipmentsData((prev) => [created, ...(prev ?? [])]);
      setIsAddOpen(false);
      resetForm();
      toast.success("Shipment created successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create shipment");
    }
  }

  async function handleEditSave() {
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    if (!form.id) {
      toast.error("Missing shipment id");
      return;
    }
    try {
      const updated = await updateShipment({ id: form.id, orderId: form.orderId, destination: form.destination, carrier: form.carrier, status: form.status, eta: form.eta });
      setShipmentsData((prev) => (prev ?? []).map((s) => (s.id === updated.id ? updated : s)));
      setIsEditOpen(null);
      toast.success("Shipment updated successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update shipment");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteShipment(id);
      setShipmentsData((prev) => (prev ?? []).filter((s) => s.id !== id));
      setIsEditOpen(null);
      toast.success("Shipment deleted successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete shipment");
    }
  }

  // Inline edit handler for quick cell updates
  const handleInlineUpdate = useCallback(async (shipmentId: string, field: keyof Shipment, value: string | number) => {
    try {
      const updates: Partial<Shipment> = { [field]: value };
      const updated = await updateShipment({ id: shipmentId, ...updates });
      setShipmentsData((prev) => (prev ?? []).map((s) => (s.id === shipmentId ? updated : s)));
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
      throw e;
    }
  }, [setShipmentsData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200";
      case "In Transit":
        return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200";
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
      case "In Transit":
        return "🚚";
      case "Pending":
        return "○";
      default:
        return "○";
    }
  };

  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkDeleteShipments(ids);

      setShipmentsData((prev) => prev?.filter((shipment) => !ids.includes(shipment.id)) ?? []);

      if (result.failedCount > 0) {
        toast.warning(`Deleted ${result.successCount} shipments. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully deleted ${result.successCount} shipment${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete shipments");
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
      const result = await bulkUpdateShipmentStatus(ids, status as Shipment["status"]);

      setShipmentsData((prev) => {
        if (!prev) return prev;
        return prev.map((shipment) => {
          if (ids.includes(shipment.id)) {
            return { ...shipment, status: status as Shipment["status"] };
          }
          return shipment;
        });
      });

      if (result.failedCount > 0) {
        toast.warning(`Updated ${result.successCount} shipments. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully updated ${result.successCount} shipment${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update shipments");
    } finally {
      setIsBulkUpdating(false);
    }
  }, [selectedIds, deselectAll]);

  // Get names of selected shipments for dialogs
  const selectedShipmentNames = useMemo(() => {
    return selectedItems.map(shipment => `${shipment.id} → ${shipment.destination}`);
  }, [selectedItems]);

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Shipments */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipmentStats.totalShipments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {shipmentStats.upcomingDeliveries} arriving this week
            </p>
          </CardContent>
        </Card>

        {/* Active Shipments */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Shipments</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{shipmentStats.activeShipments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {shipmentStats.pendingShipments} pending, {shipmentStats.inTransitShipments} in transit
            </p>
          </CardContent>
        </Card>

        {/* Delivered */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{shipmentStats.deliveredShipments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {shipmentStats.recentDeliveries7Days} in last 7 days
            </p>
          </CardContent>
        </Card>

        {/* Fulfillment Rate */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fulfillment Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{shipmentStats.fulfillmentRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {shipmentStats.deliveredShipments} of {shipmentStats.totalShipments} fulfilled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
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
                <p className="text-xl font-bold mt-1">{shipmentStats.pendingShipments}</p>
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
            filterStatus === "In Transit" ? "ring-2 ring-primary" : "",
            "border-l-blue-400"
          )}
          onClick={() => setFilterStatus(filterStatus === "In Transit" ? "all" : "In Transit")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">In Transit</p>
                <p className="text-xl font-bold mt-1">{shipmentStats.inTransitShipments}</p>
              </div>
              <Badge variant="outline" className={getStatusColor("In Transit")}>
                {getStatusIcon("In Transit")}
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
                <p className="text-xl font-bold mt-1">{shipmentStats.deliveredShipments}</p>
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
              <CardTitle className="text-xl">Shipment Tracking</CardTitle>
              <CardDescription className="mt-1">
                Track and manage all shipments and deliveries
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()} disabled={!canModify} title={!canModify ? "You don't have permission to add shipments" : undefined}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Shipment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Shipment</DialogTitle>
                    <DialogDescription>Enter the details for the new shipment.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="orderId">Order ID *</Label>
                        <Input
                          id="orderId"
                          placeholder="ORD-0001"
                          value={form.orderId}
                          onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={form.status}
                          onValueChange={(value: ShipmentStatus) => setForm({ ...form, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {SHIPMENT_STATUSES.map((status) => (
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
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="destination">Destination *</Label>
                      <Input
                        id="destination"
                        placeholder="City, Province/State"
                        value={form.destination}
                        onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="carrier">Carrier *</Label>
                        <Select
                          value={form.carrier}
                          onValueChange={(value) => setForm({ ...form, carrier: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select carrier" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMMON_CARRIERS.map((carrier) => (
                              <SelectItem key={carrier} value={carrier}>
                                {carrier}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="eta">ETA *</Label>
                        <Input
                          id="eta"
                          type="date"
                          value={form.eta}
                          onChange={(e) => setForm({ ...form, eta: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd}>Create Shipment</Button>
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
                  placeholder="Search by ID, order ID, destination, or carrier..."
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
                  {SHIPMENT_STATUSES.map((status) => (
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
                label="Filter by ETA Date"
              />
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="gap-1"
              >
                <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
                Favorites
                {getFavoritesByType("shipments").length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {getFavoritesByType("shipments").length}
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

            {/* Active Filters Badge */}
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
                    ETA: {fromDate || '...'} to {toDate || '...'}
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
                    { value: "In Transit", label: "In Transit" },
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
            itemType="shipment"
            itemNames={selectedShipmentNames}
            onConfirm={handleBulkDelete}
            isLoading={isBulkDeleting}
          />

          {isLoading ? (
            <TableLoadingSkeleton rows={8} />
          ) : filteredShipments.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No shipments found"
              description={(searchTerm || filterStatus !== "all" || fromDate || toDate)
                ? "Try adjusting your search or filters"
                : "Get started by creating your first shipment"}
              actionLabel={!(searchTerm || filterStatus !== "all" || fromDate || toDate) ? "Create Shipment" : undefined}
              onAction={!(searchTerm || filterStatus !== "all" || fromDate || toDate) ? () => setIsAddOpen(true) : undefined}
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
                        aria-label="Select all shipments"
                      />
                    </TableHead>
                    <SortableTableHead
                      sortKey="id"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("id")}
                      onSort={(key) => requestSort(key as keyof Shipment)}
                    >
                      Shipment ID
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="orderId"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("orderId")}
                      onSort={(key) => requestSort(key as keyof Shipment)}
                    >
                      Order ID
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="destination"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("destination")}
                      onSort={(key) => requestSort(key as keyof Shipment)}
                    >
                      Destination
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="carrier"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("carrier")}
                      onSort={(key) => requestSort(key as keyof Shipment)}
                    >
                      Carrier
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("status")}
                      onSort={(key) => requestSort(key as keyof Shipment)}
                    >
                      Status
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="eta"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("eta")}
                      onSort={(key) => requestSort(key as keyof Shipment)}
                    >
                      ETA
                    </SortableTableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((shipment) => {
                    const shipmentIsSelected = isSelected(shipment.id);
                    return (
                      <TableRow
                        key={shipment.id}
                        className={cn(
                          "transition-colors hover:bg-muted/50",
                          shipmentIsSelected && "bg-primary/5 hover:bg-primary/10"
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={shipmentIsSelected}
                            onCheckedChange={() => toggleItem(shipment.id)}
                            aria-label={`Select shipment ${shipment.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">{shipment.id}</span>
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={shipment.orderId}
                            type="text"
                            onSave={(v) => handleInlineUpdate(shipment.id, "orderId", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <EditableCell
                              value={shipment.destination}
                              type="text"
                              onSave={(v) => handleInlineUpdate(shipment.id, "destination", v)}
                              disabled={!canModify}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={shipment.carrier}
                            type="text"
                            onSave={(v) => handleInlineUpdate(shipment.id, "carrier", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("font-medium", getStatusColor(shipment.status))}>
                            <span className="mr-1">{getStatusIcon(shipment.status)}</span>
                            {shipment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">
                              {new Date(shipment.eta).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FavoriteButton
                              entityType="shipments"
                              entityId={shipment.id}
                              entityName={`${shipment.id} - ${shipment.destination}`}
                            />
                            <Dialog open={isEditOpen === shipment.id} onOpenChange={(o) => { setIsEditOpen(o ? shipment.id : null); if (o) setForm({ ...shipment }); }}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" disabled={!canModify} title={!canModify ? "You don't have permission to edit shipments" : undefined}>
                                  View / Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>Edit Shipment</DialogTitle>
                                  <DialogDescription>Shipment ID: {shipment.id}</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-orderId">Order ID *</Label>
                                      <Input
                                        id="edit-orderId"
                                        value={form.orderId}
                                        onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-status">Status</Label>
                                      <Select
                                        value={form.status}
                                        onValueChange={(value: ShipmentStatus) => setForm({ ...form, status: value })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {SHIPMENT_STATUSES.map((status) => (
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
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-destination">Destination *</Label>
                                    <Input
                                      id="edit-destination"
                                      value={form.destination}
                                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-carrier">Carrier *</Label>
                                      <Select
                                        value={form.carrier}
                                        onValueChange={(value) => setForm({ ...form, carrier: value })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select carrier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {COMMON_CARRIERS.map((carrier) => (
                                            <SelectItem key={carrier} value={carrier}>
                                              {carrier}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-eta">ETA *</Label>
                                      <Input
                                        id="edit-eta"
                                        type="date"
                                        value={form.eta}
                                        onChange={(e) => setForm({ ...form, eta: e.target.value })}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter className="flex-col sm:flex-row gap-2">
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleDelete(shipment.id)}
                                    className="sm:mr-auto"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
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
              {filteredShipments.length > 0 && (
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
