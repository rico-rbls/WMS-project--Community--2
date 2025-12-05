import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Search, Plus, Users, Mail, Phone, Trash2, RefreshCw, Star, TrendingUp, Package, ShoppingCart, Filter, X, CheckCircle, XCircle, Archive, ArchiveRestore, Eye, Building2, Tag, Hash, Calendar, Edit, MapPin, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { TableLoadingSkeleton } from "./ui/loading-skeleton";
import { EmptyState } from "./ui/empty-state";
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier, bulkDeleteSuppliers, bulkUpdateSupplierStatus, getPurchaseOrders, getInventory, archiveSupplier, restoreSupplier, permanentlyDeleteSupplier, bulkArchiveSuppliers, bulkRestoreSuppliers, bulkPermanentlyDeleteSuppliers } from "../services/api";
import type { Supplier, PurchaseOrder, InventoryItem } from "../types";

import { usePagination } from "../hooks/usePagination";
import { useDebounce } from "../hooks/useDebounce";
import { useBatchSelection } from "../hooks/useBatchSelection";
import { PaginationControls } from "./ui/pagination-controls";
import { BulkActionsToolbar } from "./ui/bulk-actions-toolbar";
import { BulkDeleteDialog } from "./ui/bulk-delete-dialog";
import { SelectAllBanner } from "./ui/select-all-banner";
import { cn } from "./ui/utils";
import { FavoriteButton } from "./ui/favorite-button";

import { useFavorites } from "../context/favorites-context";
import { useTableSort } from "../hooks/useTableSort";
import { SortableTableHead } from "./ui/sortable-table-head";
import { useAuth } from "../context/auth-context";
import { canWrite, isAdmin } from "../lib/permissions";
import { EditableCell } from "./ui/editable-cell";

const SUPPLIER_STATUSES = ["Active", "Inactive"] as const;
const SUPPLIER_CATEGORIES = ["Electronics", "Furniture", "Clothing", "Food & Beverages", "Other"] as const;

interface SuppliersViewProps {
  initialOpenDialog?: boolean;
  onDialogOpened?: () => void;
  initialSupplierId?: string;
  onSupplierDialogOpened?: () => void;
}

type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export function SuppliersView({ initialOpenDialog, onDialogOpened, initialSupplierId, onSupplierDialogOpened }: SuppliersViewProps) {
  const { isFavorite, getFavoritesByType } = useFavorites();
  const { user } = useAuth();
  const canModify = user ? canWrite(user.role) : false;
  const canPermanentlyDelete = user ? isAdmin(user.role) : false;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [suppliersData, setSuppliersData] = useState<Supplier[] | null>(null);
  const [purchaseOrdersData, setPurchaseOrdersData] = useState<PurchaseOrder[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: "",
    name: "",
    contact: "",
    email: "",
    phone: "",
    category: "",
    status: "Active" as Supplier["status"],
    country: "",
    city: "",
    address: "",
    purchases: 0,
    payments: 0,
  });

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [suppliers, purchaseOrders, inventory] = await Promise.all([
        getSuppliers(),
        getPurchaseOrders(),
        getInventory(),
      ]);
      setSuppliersData(suppliers);
      setPurchaseOrdersData(purchaseOrders);
      setInventoryData(inventory);
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

  // Open detail dialog when triggered from Command Palette search
  useEffect(() => {
    if (initialSupplierId && suppliersData) {
      // Find the supplier and open the detail dialog
      const supplier = suppliersData.find(s => s.id === initialSupplierId);
      if (supplier) {
        setIsDetailOpen(initialSupplierId);
        onSupplierDialogOpened?.();
      }
    }
  }, [initialSupplierId, suppliersData, onSupplierDialogOpened]);

  const list = useMemo<Supplier[]>(() => suppliersData ?? [], [suppliersData]);

  // Calculate supplier statistics
  const supplierStats = useMemo(() => {
    const totalSuppliers = list.length;
    const activeSuppliers = list.filter(s => s.status === "Active").length;
    const inactiveSuppliers = list.filter(s => s.status === "Inactive").length;
    const uniqueCategories = new Set(list.map(s => s.category)).size;

    // Calculate PO-related stats
    const totalPurchaseOrders = purchaseOrdersData.length;
    const poBySupplier = purchaseOrdersData.reduce((acc, po) => {
      acc[po.supplierId] = (acc[po.supplierId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find top supplier by PO count
    let topSupplierByPO: { id: string; name: string; count: number } | null = null;
    if (Object.keys(poBySupplier).length > 0) {
      const topSupplierId = Object.entries(poBySupplier).sort((a, b) => b[1] - a[1])[0];
      const supplier = list.find(s => s.id === topSupplierId[0]);
      if (supplier) {
        topSupplierByPO = { id: supplier.id, name: supplier.name, count: topSupplierId[1] };
      }
    }

    // Calculate total PO value by supplier
    const poValueBySupplier = purchaseOrdersData.reduce((acc, po) => {
      acc[po.supplierId] = (acc[po.supplierId] || 0) + po.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    // Find top supplier by value
    let topSupplierByValue: { id: string; name: string; value: number } | null = null;
    if (Object.keys(poValueBySupplier).length > 0) {
      const topSupplierId = Object.entries(poValueBySupplier).sort((a, b) => b[1] - a[1])[0];
      const supplier = list.find(s => s.id === topSupplierId[0]);
      if (supplier) {
        topSupplierByValue = { id: supplier.id, name: supplier.name, value: topSupplierId[1] };
      }
    }

    // Count products per supplier
    const productsBySupplier = inventoryData.reduce((acc, item) => {
      if (item.supplierId) {
        acc[item.supplierId] = (acc[item.supplierId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const suppliersWithProducts = Object.keys(productsBySupplier).length;

    return {
      totalSuppliers,
      activeSuppliers,
      inactiveSuppliers,
      uniqueCategories,
      totalPurchaseOrders,
      topSupplierByPO,
      topSupplierByValue,
      suppliersWithProducts,
    };
  }, [list, purchaseOrdersData, inventoryData]);

  // Optimized filtering with early returns and debounced search
  const filteredSuppliers = useMemo(() => {
    return list.filter(supplier => {
      // Filter by archived status
      // Handle undefined archived field (treat as not archived)
      const isArchived = supplier.archived === true;
      if (isArchived !== showArchived) {
        return false;
      }

      // Early return for favorites filter
      if (showFavoritesOnly && !isFavorite("suppliers", supplier.id)) {
        return false;
      }

      // Status filter
      if (filterStatus !== "all" && supplier.status !== filterStatus) {
        return false;
      }

      // Early return for search filter
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const matchesSearch =
          supplier.name.toLowerCase().includes(searchLower) ||
          supplier.id.toLowerCase().includes(searchLower) ||
          supplier.category.toLowerCase().includes(searchLower) ||
          supplier.contact.toLowerCase().includes(searchLower) ||
          supplier.email.toLowerCase().includes(searchLower);

        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }, [list, debouncedSearchTerm, filterStatus, showFavoritesOnly, isFavorite, showArchived]);



  // Clear all filters
  function clearAllFilters() {
    setSearchTerm("");
    setFilterStatus("all");
    setShowFavoritesOnly(false);
    setShowArchived(false);
  }

  // Archive handler
  async function handleArchive(id: string) {
    try {
      const archived = await archiveSupplier(id);
      setSuppliersData((prev) => (prev ?? []).map((s) => (s.id === id ? archived : s)));
      setIsEditOpen(null);
      toast.success("Supplier archived successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to archive supplier");
    }
  }

  // Restore handler
  async function handleRestore(id: string) {
    try {
      const restored = await restoreSupplier(id);
      setSuppliersData((prev) => (prev ?? []).map((s) => (s.id === id ? restored : s)));
      setIsEditOpen(null);
      toast.success("Supplier restored successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to restore supplier");
    }
  }

  // Permanent delete handler
  async function handlePermanentDelete(id: string) {
    try {
      await permanentlyDeleteSupplier(id);
      setSuppliersData((prev) => (prev ?? []).filter((s) => s.id !== id));
      setIsEditOpen(null);
      toast.success("Supplier permanently deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to permanently delete supplier");
    }
  }

  // Status helper functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return "✓";
      case "Inactive":
        return "○";
      default:
        return "○";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200";
      case "Inactive":
        return "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-200";
      default:
        return "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-200";
    }
  };

  // Sorting - applied before pagination
  const {
    sortedData,
    sortConfig,
    requestSort,
    getSortDirection,
  } = useTableSort<Supplier>(filteredSuppliers);

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
    isAllPageSelected,
    isAllPagesSelected,
    isPartiallySelected,
    hasSelection,
    toggleItem,
    toggleAll,
    selectAllPages,
    deselectAll,
    isSelected,
    totalItemCount,
    pageItemCount,
  } = useBatchSelection(paginatedData, sortedData);

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

  // Inline edit handler for quick cell updates
  const handleInlineUpdate = useCallback(async (supplierId: string, field: keyof Supplier, value: string | number) => {
    try {
      const updates: Partial<Supplier> = { [field]: value };
      const updated = await updateSupplier({ id: supplierId, ...updates });
      setSuppliersData((prev) => (prev ?? []).map((s) => (s.id === supplierId ? updated : s)));
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
      throw e;
    }
  }, [setSuppliersData]);

  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkDeleteSuppliers(ids);

      setSuppliersData((prev) => prev?.filter((supplier) => !ids.includes(supplier.id)) ?? []);

      if (result.failedCount > 0) {
        toast.warning(`Deleted ${result.successCount} suppliers. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully deleted ${result.successCount} supplier${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete suppliers");
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  }, [selectedIds, deselectAll]);

  // Bulk archive handler
  const handleBulkArchive = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkArchiveSuppliers(ids);

      setSuppliersData((prev) => {
        if (!prev) return prev;
        return prev.map((supplier) => {
          if (ids.includes(supplier.id)) {
            return { ...supplier, archived: true, archivedAt: new Date().toISOString() };
          }
          return supplier;
        });
      });

      if (result.failedCount > 0) {
        toast.warning(`Archived ${result.successCount} suppliers. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully archived ${result.successCount} supplier${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to archive suppliers");
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  }, [selectedIds, deselectAll]);

  // Bulk restore handler
  const handleBulkRestore = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkRestoreSuppliers(ids);

      setSuppliersData((prev) => {
        if (!prev) return prev;
        return prev.map((supplier) => {
          if (ids.includes(supplier.id)) {
            return { ...supplier, archived: false, archivedAt: undefined };
          }
          return supplier;
        });
      });

      if (result.failedCount > 0) {
        toast.warning(`Restored ${result.successCount} suppliers. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully restored ${result.successCount} supplier${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to restore suppliers");
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  }, [selectedIds, deselectAll]);

  // Bulk permanent delete handler
  const handleBulkPermanentDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkPermanentlyDeleteSuppliers(ids);

      setSuppliersData((prev) => prev?.filter((supplier) => !ids.includes(supplier.id)) ?? []);

      if (result.failedCount > 0) {
        toast.warning(`Permanently deleted ${result.successCount} suppliers. ${result.failedCount} failed.`);
      } else {
        toast.success(`Permanently deleted ${result.successCount} supplier${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to permanently delete suppliers");
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
      const result = await bulkUpdateSupplierStatus(ids, status as Supplier["status"]);

      setSuppliersData((prev) => {
        if (!prev) return prev;
        return prev.map((supplier) => {
          if (ids.includes(supplier.id)) {
            return { ...supplier, status: status as Supplier["status"] };
          }
          return supplier;
        });
      });

      if (result.failedCount > 0) {
        toast.warning(`Updated ${result.successCount} suppliers. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully updated ${result.successCount} supplier${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update suppliers");
    } finally {
      setIsBulkUpdating(false);
    }
  }, [selectedIds, deselectAll]);

  // Handle edit from detail dialog
  const handleEdit = useCallback((supplier: Supplier) => {
    setForm({
      id: supplier.id,
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      phone: supplier.phone,
      category: supplier.category,
      status: supplier.status,
      country: supplier.country || "",
      city: supplier.city || "",
      address: supplier.address || "",
      purchases: supplier.purchases || 0,
      payments: supplier.payments || 0,
    });
    setIsEditOpen(supplier.id);
  }, []);

  // Get names of selected suppliers for dialogs
  const selectedSupplierNames = useMemo(() => {
    return selectedItems.map(supplier => supplier.name);
  }, [selectedItems]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
        <p className="text-muted-foreground">Manage supplier profiles, contact information, and purchasing relationships</p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Suppliers */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierStats.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {supplierStats.activeSuppliers} active, {supplierStats.inactiveSuppliers} inactive
            </p>
          </CardContent>
        </Card>

        {/* Active Suppliers */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Suppliers</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{supplierStats.activeSuppliers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {supplierStats.totalSuppliers > 0
                ? `${Math.round((supplierStats.activeSuppliers / supplierStats.totalSuppliers) * 100)}% of total`
                : "No suppliers yet"}
            </p>
          </CardContent>
        </Card>

        {/* Total Purchase Orders */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchase Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{supplierStats.totalPurchaseOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {supplierStats.topSupplierByPO
                ? `Top: ${supplierStats.topSupplierByPO.name} (${supplierStats.topSupplierByPO.count})`
                : "No orders yet"}
            </p>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{supplierStats.uniqueCategories}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {supplierStats.suppliersWithProducts} suppliers with products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4",
            filterStatus === "Active" ? "ring-2 ring-primary" : "",
            "border-l-emerald-400"
          )}
          onClick={() => setFilterStatus(filterStatus === "Active" ? "all" : "Active")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</p>
                <p className="text-xl font-bold mt-1">{supplierStats.activeSuppliers}</p>
              </div>
              <Badge variant="outline" className={getStatusColor("Active")}>
                {getStatusIcon("Active")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4",
            filterStatus === "Inactive" ? "ring-2 ring-primary" : "",
            "border-l-slate-400"
          )}
          onClick={() => setFilterStatus(filterStatus === "Inactive" ? "all" : "Inactive")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inactive</p>
                <p className="text-xl font-bold mt-1">{supplierStats.inactiveSuppliers}</p>
              </div>
              <Badge variant="outline" className={getStatusColor("Inactive")}>
                {getStatusIcon("Inactive")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Supplier Management</CardTitle>
              <CardDescription className="mt-1">
                Manage your supplier relationships and contacts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) setForm({ id: "", name: "", contact: "", email: "", phone: "", category: "", status: "Active", country: "", city: "", address: "", purchases: 0, payments: 0 }); }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setForm({ id: "", name: "", contact: "", email: "", phone: "", category: "", status: "Active", country: "", city: "", address: "", purchases: 0, payments: 0 })} disabled={!canModify} title={!canModify ? "You don't have permission to add suppliers" : undefined}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supplier
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Supplier</DialogTitle>
                    <DialogDescription>Enter the details for the new supplier.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="supplier-name">Company Name *</Label>
                        <Input id="supplier-name" placeholder="Enter company name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="supplier-status">Status</Label>
                        <Select
                          value={form.status}
                          onValueChange={(value: SupplierStatus) => setForm({ ...form, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPLIER_STATUSES.map((status) => (
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
                      <Label htmlFor="contact-name">Contact Person *</Label>
                      <Input id="contact-name" placeholder="Enter contact name" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input id="phone" placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={form.category}
                        onValueChange={(value) => setForm({ ...form, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPLIER_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Location Fields */}
                    <div className="border-t pt-4 mt-2">
                      <Label className="text-sm font-medium text-muted-foreground mb-3 block">Location Information</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="country">Country</Label>
                          <Input id="country" placeholder="e.g., United States" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="city">City</Label>
                          <Input id="city" placeholder="e.g., San Francisco" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid gap-2 mt-4">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" placeholder="Full street address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                      </div>
                    </div>

                    {/* Financial Fields */}
                    <div className="border-t pt-4 mt-2">
                      <Label className="text-sm font-medium text-muted-foreground mb-3 block">Financial Information</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="purchases">Total Purchases (₱)</Label>
                          <Input id="purchases" type="number" min="0" step="0.01" placeholder="0.00" value={form.purchases} onChange={(e) => setForm({ ...form, purchases: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="payments">Total Payments (₱)</Label>
                          <Input id="payments" type="number" min="0" step="0.01" placeholder="0.00" value={form.payments} onChange={(e) => setForm({ ...form, payments: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!form.name.trim() || !form.contact.trim() || !form.email.trim() || !form.phone.trim() || !form.category.trim()) {
                          toast.error("Please fill all required fields");
                          return;
                        }
                        try {
                          const created = await createSupplier({
                            name: form.name,
                            contact: form.contact,
                            email: form.email,
                            phone: form.phone,
                            category: form.category,
                            status: form.status,
                            country: form.country,
                            city: form.city,
                            address: form.address,
                            purchases: form.purchases,
                            payments: form.payments,
                          });
                          setSuppliersData((prev) => [created, ...(prev ?? [])]);
                          setIsAddOpen(false);
                          toast.success("Supplier added successfully");
                          setForm({ id: "", name: "", contact: "", email: "", phone: "", category: "", status: "Active", country: "", city: "", address: "", purchases: 0, payments: 0 });
                        } catch (e: any) {
                          toast.error(e?.message || "Failed to add supplier");
                        }
                      }}
                    >
                      Create Supplier
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers by name, contact, email..."
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
                  {SUPPLIER_STATUSES.map((status) => (
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
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="gap-1"
              >
                <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
                Favorites
                {getFavoritesByType("suppliers").length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {getFavoritesByType("suppliers").length}
                  </Badge>
                )}
              </Button>
              {/* Archive Toggle */}
              <Button
                variant={showArchived ? "default" : "outline"}
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className={showArchived ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
              >
                <Archive className="h-4 w-4 mr-1" />
                {showArchived ? "Viewing Archived" : "View Archived"}
              </Button>

              {(searchTerm || filterStatus !== "all" || showFavoritesOnly || showArchived) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="gap-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Clear All Filters
                </Button>
              )}
            </div>
          </div>

          {/* Bulk Actions Toolbar */}
          {hasSelection && canModify && (
            <BulkActionsToolbar
              selectionCount={selectionCount}
              onClearSelection={deselectAll}
              isLoading={isBulkDeleting || isBulkUpdating}
              actions={showArchived ? [
                {
                  id: "restore",
                  label: "Restore",
                  icon: <ArchiveRestore className="h-4 w-4 mr-1" />,
                  variant: "outline",
                  onClick: handleBulkRestore,
                },
                ...(canPermanentlyDelete ? [{
                  id: "permanent-delete",
                  label: "Permanently Delete",
                  icon: <Trash2 className="h-4 w-4 mr-1" />,
                  variant: "destructive" as const,
                  onClick: () => setShowBulkDeleteDialog(true),
                }] : []),
              ] : [
                {
                  id: "archive",
                  label: "Archive",
                  icon: <Archive className="h-4 w-4 mr-1" />,
                  variant: "outline",
                  onClick: () => setShowBulkDeleteDialog(true),
                },
              ]}
              actionGroups={showArchived ? [] : [
                {
                  id: "status-update",
                  label: "Update Status",
                  icon: <RefreshCw className="h-4 w-4 mr-1" />,
                  options: [
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                  ],
                  onSelect: (value) => handleBulkStatusUpdate(value),
                },
              ]}
              className="mb-4"
            />
          )}

          {/* Bulk Delete/Archive Dialog */}
          <BulkDeleteDialog
            open={showBulkDeleteDialog}
            onOpenChange={setShowBulkDeleteDialog}
            itemCount={selectionCount}
            itemType="supplier"
            itemNames={selectedSupplierNames}
            onConfirm={showArchived ? handleBulkPermanentDelete : handleBulkArchive}
            isLoading={isBulkDeleting}
            title={showArchived ? "Permanently Delete Suppliers" : "Archive Suppliers"}
            description={showArchived
              ? `Are you sure you want to permanently delete ${selectionCount} supplier${selectionCount !== 1 ? "s" : ""}? This action cannot be undone.`
              : `Are you sure you want to archive ${selectionCount} supplier${selectionCount !== 1 ? "s" : ""}? Archived suppliers can be restored later.`
            }
            confirmLabel={showArchived ? "Permanently Delete" : "Archive"}
          />

          {isLoading ? (
            <TableLoadingSkeleton rows={8} />
          ) : filteredSuppliers.length === 0 ? (
            <EmptyState
              icon={showArchived ? Archive : Users}
              title={showArchived ? "No archived suppliers" : "No suppliers found"}
              description={showArchived
                ? "Archived suppliers will appear here"
                : searchTerm
                  ? "Try adjusting your search criteria"
                  : "Get started by adding your first supplier"}
              actionLabel={!showArchived && !searchTerm ? "Add Supplier" : undefined}
              onAction={!showArchived && !searchTerm ? () => setIsAddOpen(true) : undefined}
            />
          ) : (
            <div className="rounded-md border overflow-hidden">
              {/* Select All Pages Banner */}
              <SelectAllBanner
                pageItemCount={pageItemCount}
                totalItemCount={totalItemCount}
                isAllPagesSelected={isAllPagesSelected}
                show={isAllPageSelected && totalItemCount > pageItemCount}
                onSelectAllPages={selectAllPages}
                onClearSelection={deselectAll}
                itemLabel="suppliers"
              />

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
                        aria-label="Select all suppliers"
                      />
                    </TableHead>
                    <SortableTableHead
                      sortKey="id"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("id")}
                      onSort={(key) => requestSort(key as keyof Supplier)}
                    >
                      Supplier ID
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="name"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("name")}
                      onSort={(key) => requestSort(key as keyof Supplier)}
                    >
                      Company Name
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="contact"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("contact")}
                      onSort={(key) => requestSort(key as keyof Supplier)}
                    >
                      Contact
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="category"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("category")}
                      onSort={(key) => requestSort(key as keyof Supplier)}
                    >
                      Category
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("status")}
                      onSort={(key) => requestSort(key as keyof Supplier)}
                    >
                      Status
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="country"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("country")}
                      onSort={(key) => requestSort(key as keyof Supplier)}
                    >
                      Location
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="purchases"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("purchases")}
                      onSort={(key) => requestSort(key as keyof Supplier)}
                    >
                      Purchases
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="payments"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("payments")}
                      onSort={(key) => requestSort(key as keyof Supplier)}
                    >
                      Payments
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="balance"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("balance")}
                      onSort={(key) => requestSort(key as keyof Supplier)}
                    >
                      Balance
                    </SortableTableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((supplier) => {
                    const supplierIsSelected = isSelected(supplier.id);
                    return (
                      <TableRow
                        key={supplier.id}
                        className={cn(
                          "hover:bg-muted/50 transition-colors",
                          supplierIsSelected && "bg-muted/50"
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={supplierIsSelected}
                            onCheckedChange={() => toggleItem(supplier.id)}
                            aria-label={`Select supplier ${supplier.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{supplier.id}</TableCell>
                        <TableCell>
                          <button
                            className="text-left font-medium text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                            onClick={() => setIsDetailOpen(supplier.id)}
                          >
                            {supplier.name}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <EditableCell
                                value={supplier.email}
                                type="text"
                                onSave={(v) => handleInlineUpdate(supplier.id, "email", v)}
                                disabled={!canModify}
                                className="text-xs text-muted-foreground"
                              />
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <EditableCell
                                value={supplier.phone}
                                type="text"
                                onSave={(v) => handleInlineUpdate(supplier.id, "phone", v)}
                                disabled={!canModify}
                                className="text-xs text-muted-foreground"
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={supplier.category}
                            type="select"
                            options={SUPPLIER_CATEGORIES.map(c => ({ value: c, label: c }))}
                            onSave={(v) => handleInlineUpdate(supplier.id, "category", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1", getStatusColor(supplier.status))}>
                            <span>{getStatusIcon(supplier.status)}</span>
                            {supplier.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {supplier.city && supplier.country ? (
                              <span>{supplier.city}, {supplier.country}</span>
                            ) : supplier.city || supplier.country ? (
                              <span>{supplier.city || supplier.country}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{supplier.purchases.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{supplier.payments.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={cn("text-right font-medium", supplier.balance > 0 ? "text-amber-600" : supplier.balance < 0 ? "text-emerald-600" : "")}>
                          ₱{supplier.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FavoriteButton
                              entityType="suppliers"
                              entityId={supplier.id}
                              entityName={supplier.name}
                            />
                          <Dialog open={isEditOpen === supplier.id} onOpenChange={(o) => { setIsEditOpen(o ? supplier.id : null); if (o) setForm({ ...supplier, country: supplier.country || "", city: supplier.city || "", address: supplier.address || "", purchases: supplier.purchases || 0, payments: supplier.payments || 0 }); }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={!canModify} title={!canModify ? "You don't have permission to edit suppliers" : undefined}>Edit</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Supplier</DialogTitle>
                                <DialogDescription>Supplier ID: {supplier.id}</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Company Name *</Label>
                                    <Input id="edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-status">Status</Label>
                                    <Select
                                      value={form.status}
                                      onValueChange={(value: SupplierStatus) => setForm({ ...form, status: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {SUPPLIER_STATUSES.map((status) => (
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
                                  <Label htmlFor="edit-contact">Contact Person *</Label>
                                  <Input id="edit-contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-email">Email *</Label>
                                    <Input id="edit-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-phone">Phone *</Label>
                                    <Input id="edit-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="edit-category">Category *</Label>
                                  <Select
                                    value={form.category}
                                    onValueChange={(value) => setForm({ ...form, category: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {SUPPLIER_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Location Fields */}
                                <div className="border-t pt-4 mt-2">
                                  <Label className="text-sm font-medium text-muted-foreground mb-3 block">Location Information</Label>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-country">Country</Label>
                                      <Input id="edit-country" placeholder="e.g., United States" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-city">City</Label>
                                      <Input id="edit-city" placeholder="e.g., San Francisco" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                                    </div>
                                  </div>
                                  <div className="grid gap-2 mt-4">
                                    <Label htmlFor="edit-address">Address</Label>
                                    <Input id="edit-address" placeholder="Full street address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                                  </div>
                                </div>

                                {/* Financial Fields */}
                                <div className="border-t pt-4 mt-2">
                                  <Label className="text-sm font-medium text-muted-foreground mb-3 block">Financial Information</Label>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-purchases">Total Purchases (₱)</Label>
                                      <Input id="edit-purchases" type="number" min="0" step="0.01" placeholder="0.00" value={form.purchases} onChange={(e) => setForm({ ...form, purchases: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-payments">Total Payments (₱)</Label>
                                      <Input id="edit-payments" type="number" min="0" step="0.01" placeholder="0.00" value={form.payments} onChange={(e) => setForm({ ...form, payments: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
                                {supplier.archived ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      onClick={() => handleRestore(supplier.id)}
                                    >
                                      <ArchiveRestore className="h-4 w-4 mr-2" />
                                      Restore
                                    </Button>
                                    {canPermanentlyDelete && (
                                      <Button
                                        variant="destructive"
                                        onClick={() => handlePermanentDelete(supplier.id)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Permanently Delete
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    onClick={() => handleArchive(supplier.id)}
                                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </Button>
                                )}
                                <div className="flex gap-2">
                                  <Button variant="outline" onClick={() => setIsEditOpen(null)}>
                                    Cancel
                                  </Button>
                                  {!supplier.archived && (
                                    <Button onClick={async () => {
                                      if (!form.id) { toast.error("Missing supplier id"); return; }
                                      if (!form.name.trim() || !form.contact.trim() || !form.email.trim() || !form.phone.trim() || !form.category.trim()) {
                                        toast.error("Please fill all required fields");
                                        return;
                                      }
                                      try {
                                        const updated = await updateSupplier({
                                          id: form.id,
                                          name: form.name,
                                          contact: form.contact,
                                          email: form.email,
                                          phone: form.phone,
                                          category: form.category,
                                          status: form.status,
                                          country: form.country,
                                          city: form.city,
                                          address: form.address,
                                          purchases: form.purchases,
                                          payments: form.payments,
                                        });
                                        setSuppliersData((prev) => (prev ?? []).map((s) => (s.id === updated.id ? updated : s)));
                                        setIsEditOpen(null);
                                        toast.success("Supplier updated");
                                      } catch (e: any) {
                                        toast.error(e?.message || "Failed to update supplier");
                                      }
                                    }}>Save Changes</Button>
                                  )}
                                </div>
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
              {filteredSuppliers.length > 0 && (
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

      {/* Supplier Detail Dialog (Read-Only) */}
      <Dialog open={isDetailOpen !== null} onOpenChange={(open) => !open && setIsDetailOpen(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {isDetailOpen && (() => {
            const supplier = list.find(s => s.id === isDetailOpen);
            if (!supplier) return null;

            // Get related purchase orders for this supplier
            const supplierPOs = purchaseOrdersData.filter(po => po.supplierId === supplier.id);
            const totalPOValue = supplierPOs.reduce((sum, po) => sum + po.totalAmount, 0);

            // Get products from this supplier
            const supplierProducts = inventoryData.filter(item => item.supplierId === supplier.id);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Supplier Details
                  </DialogTitle>
                  <DialogDescription>
                    View supplier information and statistics
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Hash className="h-3 w-3" />
                          Supplier ID
                        </div>
                        <p className="font-mono text-sm">{supplier.id}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          Name
                        </div>
                        <p className="font-medium">{supplier.name}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Tag className="h-3 w-3" />
                          Category
                        </div>
                        <Badge variant="outline">{supplier.category}</Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3" />
                          Status
                        </div>
                        <Badge variant={supplier.status === "Active" ? "default" : "secondary"}>
                          {supplier.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Contact Person</p>
                          <p className="font-medium">{supplier.contact}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium">{supplier.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium">{supplier.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  {(supplier.country || supplier.city || supplier.address) && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Location</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {(supplier.city || supplier.country) && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">City / Country</p>
                              <p className="font-medium">
                                {supplier.city && supplier.country
                                  ? `${supplier.city}, ${supplier.country}`
                                  : supplier.city || supplier.country}
                              </p>
                            </div>
                          </div>
                        )}
                        {supplier.address && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Address</p>
                              <p className="font-medium">{supplier.address}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Financial Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Financial Summary</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
                        <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                        <p className="text-lg font-bold text-blue-600">
                          ₱{supplier.purchases.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">Total Purchases</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
                        <DollarSign className="h-4 w-4 mx-auto mb-1 text-green-600" />
                        <p className="text-lg font-bold text-green-600">
                          ₱{supplier.payments.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">Total Payments</p>
                      </div>
                      <div className={cn("p-3 rounded-lg text-center", supplier.balance > 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-emerald-50 dark:bg-emerald-950/30")}>
                        <DollarSign className={cn("h-4 w-4 mx-auto mb-1", supplier.balance > 0 ? "text-amber-600" : "text-emerald-600")} />
                        <p className={cn("text-lg font-bold", supplier.balance > 0 ? "text-amber-600" : "text-emerald-600")}>
                          ₱{supplier.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">Balance</p>
                      </div>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Statistics</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
                        <ShoppingCart className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                        <p className="text-lg font-bold text-blue-600">{supplierPOs.length}</p>
                        <p className="text-xs text-muted-foreground">Purchase Orders</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
                        <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-600" />
                        <p className="text-lg font-bold text-green-600">
                          ${totalPOValue.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Total Value</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-center">
                        <Package className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                        <p className="text-lg font-bold text-purple-600">{supplierProducts.length}</p>
                        <p className="text-xs text-muted-foreground">Products</p>
                      </div>
                    </div>
                  </div>

                  {/* Archive Status */}
                  {supplier.archived && (
                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                        <Archive className="h-4 w-4" />
                        <span className="font-medium">Archived</span>
                      </div>
                      {supplier.archivedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Archived on {new Date(supplier.archivedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDetailOpen(null)}>
                    Close
                  </Button>
                  {canModify && !supplier.archived && (
                    <Button onClick={() => { setIsDetailOpen(null); handleEdit(supplier); }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Supplier
                    </Button>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
