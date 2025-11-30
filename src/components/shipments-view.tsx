import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, MapPin, Package, Plus, Truck, X, Trash2, RefreshCw, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { TableLoadingSkeleton } from "./ui/loading-skeleton";
import { EmptyState } from "./ui/empty-state";
import { DateRangeFilter } from "./ui/date-range-filter";
import { createShipment, deleteShipment, getShipments, updateShipment, bulkDeleteShipments, bulkUpdateShipmentStatus } from "../services/api";
import type { Shipment, SavedSearch } from "../types";

import { usePagination } from "../hooks/usePagination";
import { useDebounce } from "../hooks/useDebounce";
import { useBatchSelection } from "../hooks/useBatchSelection";
import { PaginationControls } from "./ui/pagination-controls";
import { BulkActionsToolbar } from "./ui/bulk-actions-toolbar";
import { BulkDeleteDialog } from "./ui/bulk-delete-dialog";
import { cn } from "./ui/utils";
import { FavoriteButton } from "./ui/favorite-button";
import { SaveSearchDialog } from "./ui/save-search-dialog";
import { useFavorites } from "../context/favorites-context";
import { useTableSort } from "../hooks/useTableSort";
import { SortableTableHead } from "./ui/sortable-table-head";
import { useAuth } from "../context/auth-context";
import { canWrite } from "../lib/permissions";
import { EditableCell } from "./ui/editable-cell";

const SHIPMENT_STATUSES = ["Pending", "In Transit", "Delivered"] as const;

interface ShipmentsViewProps {
  initialOpenDialog?: boolean;
  onDialogOpened?: () => void;
}

export function ShipmentsView({ initialOpenDialog, onDialogOpened }: ShipmentsViewProps) {
  const { isFavorite, getFavoritesByType } = useFavorites();
  const { user } = useAuth();
  const canModify = user ? canWrite(user.role) : false;
  const [searchTerm, setSearchTerm] = useState("");
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

  // Optimized filtering with early returns and debounced search
  const filteredShipments = useMemo(() => {
    return list.filter(shipment => {
      // Early return for favorites filter
      if (showFavoritesOnly && !isFavorite("shipments", shipment.id)) {
        return false;
      }

      // Early return for search filter
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const matchesSearch =
          shipment.id.toLowerCase().includes(searchLower) ||
          shipment.orderId.toLowerCase().includes(searchLower) ||
          shipment.destination.toLowerCase().includes(searchLower);

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
    setForm({ id: "", orderId: "", destination: "", carrier: "", status: "Pending", eta: "" });
  }

  function clearDateFilter() {
    setFromDate("");
    setToDate("");
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
        return "bg-green-500/10 text-green-700";
      case "In Transit":
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div className="text-2xl">89</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-600" />
              <div className="text-2xl">67</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">On-Time Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">94%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shipment Tracking</CardTitle>
            <div className="flex gap-2">

              <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()} disabled={!canModify} title={!canModify ? "You don't have permission to add shipments" : undefined}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Shipment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Shipment</DialogTitle>
                    <DialogDescription>Enter the details for the new shipment.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="orderId">Order ID</Label>
                      <Input id="orderId" placeholder="ORD-0001" value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destination">Destination</Label>
                      <Input id="destination" placeholder="City, ST" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carrier">Carrier</Label>
                      <Input id="carrier" placeholder="FedEx/UPS/DHL" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Input id="status" placeholder="Pending" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Shipment["status"] })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eta">ETA</Label>
                      <Input id="eta" placeholder="Oct 20, 2025" value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} />
                    </div>
                    <Button className="w-full" onClick={handleAdd}>Add Shipment</Button>
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
                placeholder="Search shipments..."
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
              <SaveSearchDialog
                entityType="shipments"
                currentSearchTerm={searchTerm}
                currentFilters={getCurrentFilters}
                onApplySearch={handleApplySavedSearch}
              />
            </div>

            {/* Active Filters Badge */}
            {(fromDate || toDate) && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  ETA: {fromDate || '...'} to {toDate || '...'}
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
              description={(searchTerm || fromDate || toDate)
                ? "Try adjusting your search or date filters"
                : "Get started by creating your first shipment"}
              actionLabel={!(searchTerm || fromDate || toDate) ? "Create Shipment" : undefined}
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
                      <TableRow key={shipment.id} className={cn(shipmentIsSelected && "bg-muted/50")}>
                        <TableCell>
                          <Checkbox
                            checked={shipmentIsSelected}
                            onCheckedChange={() => toggleItem(shipment.id)}
                            aria-label={`Select shipment ${shipment.id}`}
                          />
                        </TableCell>
                        <TableCell>{shipment.id}</TableCell>
                        <TableCell>
                          <EditableCell
                            value={shipment.orderId}
                            type="text"
                            onSave={(v) => handleInlineUpdate(shipment.id, "orderId", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={shipment.destination}
                            type="text"
                            onSave={(v) => handleInlineUpdate(shipment.id, "destination", v)}
                            disabled={!canModify}
                          />
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
                          <EditableCell
                            value={shipment.status}
                            type="badge"
                            options={SHIPMENT_STATUSES.map(s => ({ value: s, label: s }))}
                            badgeClassName={getStatusColor(shipment.status)}
                            onSave={(v) => handleInlineUpdate(shipment.id, "status", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={shipment.eta}
                            type="text"
                            onSave={(v) => handleInlineUpdate(shipment.id, "eta", v)}
                            disabled={!canModify}
                          />
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
                              <Button variant="ghost" size="sm" disabled={!canModify} title={!canModify ? "You don't have permission to edit shipments" : undefined}>Track</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Shipment - {shipment.id}</DialogTitle>
                                <DialogDescription>Update fields and save your changes.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-orderId">Order ID</Label>
                                  <Input id="edit-orderId" value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-destination">Destination</Label>
                                <Input id="edit-destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-carrier">Carrier</Label>
                                <Input id="edit-carrier" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <Input id="edit-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Shipment["status"] })} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-eta">ETA</Label>
                                <Input id="edit-eta" value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} />
                              </div>
                              <div className="flex gap-2">
                                <Button className="flex-1" onClick={handleEditSave}>Save Changes</Button>
                                <Button variant="destructive" onClick={() => handleDelete(shipment.id)}>Delete</Button>
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
