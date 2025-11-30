import { useMemo, useState, memo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Search, Filter, Package, Trash2, Edit, Star } from "lucide-react";
import { toast } from "sonner";
import { createInventoryItem, deleteInventoryItem, updateInventoryItem, bulkDeleteInventoryItems, bulkUpdateInventoryItems } from "../services/api";
import type { InventoryCategory, InventoryItem, SavedSearch } from "../types";
import { TableLoadingSkeleton } from "./ui/loading-skeleton";
import { EmptyState } from "./ui/empty-state";
import { useInventory, useSuppliers } from "../context/app-context";
import { inventoryItemSchema } from "../lib/validations";
import { cn } from "./ui/utils";

import { useDebounce } from "../hooks/useDebounce";
import { usePagination } from "../hooks/usePagination";
import { useBatchSelection } from "../hooks/useBatchSelection";
import { PaginationControls } from "./ui/pagination-controls";
import { BulkActionsToolbar } from "./ui/bulk-actions-toolbar";
import { BulkDeleteDialog } from "./ui/bulk-delete-dialog";
import { BulkUpdateDialog, type BulkUpdateField } from "./ui/bulk-update-dialog";
import { FavoriteButton } from "./ui/favorite-button";
import { SaveSearchDialog } from "./ui/save-search-dialog";
import { useFavorites } from "../context/favorites-context";

const CATEGORIES: InventoryCategory[] = ["Electronics", "Furniture", "Clothing", "Food"];

interface InventoryViewProps {
  initialOpenDialog?: boolean;
  onDialogOpened?: () => void;
}

export function InventoryView({ initialOpenDialog, onDialogOpened }: InventoryViewProps) {
  const { inventory, isLoading, setInventory } = useInventory();
  const { suppliers } = useSuppliers();
  const { isFavorite, getFavoritesByType } = useFavorites();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(null);
  const [form, setForm] = useState({
    id: "",
    name: "",
    category: "Electronics" as InventoryCategory,
    quantity: 0,
    location: "",
    reorderLevel: 0,
    brand: "",
    pricePerPiece: 0,
    supplierId: "",
    maintainStockAt: 0,
    minimumStock: 0,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Open dialog when triggered from Dashboard Quick Actions
  useEffect(() => {
    if (initialOpenDialog && !isAddOpen) {
      setIsAddOpen(true);
      onDialogOpened?.();
    }
  }, [initialOpenDialog, onDialogOpened, isAddOpen]);

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Migrate old inventory items to include new fields
  const inventoryItems = useMemo(() => {
    if (!inventory) return [];

    return inventory.map(item => {
      // Check if item has new fields, if not, add defaults
      if (!item.brand || item.pricePerPiece === undefined || !item.supplierId ||
        item.maintainStockAt === undefined || item.minimumStock === undefined) {
        return {
          ...item,
          brand: item.brand || "Unknown",
          pricePerPiece: item.pricePerPiece ?? 0,
          supplierId: item.supplierId || "SUP-001",
          maintainStockAt: item.maintainStockAt ?? (item.reorderLevel * 2),
          minimumStock: item.minimumStock ?? item.reorderLevel,
        };
      }
      return item;
    });
  }, [inventory]);

  // Optimized filtering with early returns and debounced search
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      // Early return for favorites filter
      if (showFavoritesOnly && !isFavorite("inventory", item.id)) {
        return false;
      }

      // Early return for category filter
      if (filterCategory !== "all" && item.category !== filterCategory) {
        return false;
      }

      // Early return if no search term
      if (!debouncedSearchTerm) {
        return true;
      }

      // Search in name and id
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower)
      );
    });
  }, [inventoryItems, debouncedSearchTerm, filterCategory, showFavoritesOnly, isFavorite]);

  // Handle applying saved searches
  const handleApplySavedSearch = useCallback((search: SavedSearch) => {
    if (search.searchTerm) {
      setSearchTerm(search.searchTerm);
    }
    if (search.filters.category && typeof search.filters.category === "string") {
      setFilterCategory(search.filters.category);
    }
    if (search.filters.favoritesOnly === "true") {
      setShowFavoritesOnly(true);
    }
  }, []);

  // Get current filter configuration for saving
  const getCurrentFilters = useMemo(() => {
    const filters: Record<string, string | string[]> = {};
    if (filterCategory !== "all") {
      filters.category = filterCategory;
    }
    if (showFavoritesOnly) {
      filters.favoritesOnly = "true";
    }
    return filters;
  }, [filterCategory, showFavoritesOnly]);

  // Pagination with 25 items per page
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    totalItems,
    itemsPerPage,
  } = usePagination<InventoryItem>(filteredItems, 25);

  const supplierById = useMemo(() => {
    const map = new Map<string, string>();
    suppliers?.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [suppliers]);

  // Batch selection
  const {
    selectedIds,
    toggleItem,
    toggleAll,
    deselectAll,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    selectionCount,
    hasSelection,
    selectedItems,
  } = useBatchSelection<InventoryItem>(paginatedData);

  // Bulk operation states
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkUpdateType, setBulkUpdateType] = useState<"price" | "location" | "reorderLevel" | "supplier" | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  function resetForm() {
    setForm({
      id: "",
      name: "",
      category: "Electronics",
      quantity: 0,
      location: "",
      reorderLevel: 0,
      brand: "",
      pricePerPiece: 0,
      supplierId: "",
      maintainStockAt: 0,
      minimumStock: 0,
    });
    setFieldErrors({});
  }

  function clearFieldError(field: string) {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }

  function validateForm() {
    try {
      const result = inventoryItemSchema.safeParse({
        name: form.name,
        category: form.category,
        quantity: form.quantity,
        location: form.location,
        reorderLevel: form.reorderLevel,
        brand: form.brand,
        pricePerPiece: form.pricePerPiece,
        supplierId: form.supplierId,
        maintainStockAt: form.maintainStockAt,
        minimumStock: form.minimumStock,
      });

      if (!result.success) {
        const errors: Record<string, string> = {};
        if (result.error && result.error.errors) {
          result.error.errors.forEach((err) => {
            const path = err.path.join(".");
            errors[path] = err.message;
          });
        }
        setFieldErrors(errors);
        return Object.values(errors)[0] || "Validation failed"; // Return first error message
      }

      setFieldErrors({});
      return null;
    } catch (error) {
      console.error('Validation error:', error);
      return "Validation error occurred";
    }
  }

  async function handleAdd() {
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    try {
      const created = await createInventoryItem({
        name: form.name,
        category: form.category,
        quantity: form.quantity,
        location: form.location,
        reorderLevel: form.reorderLevel,
        brand: form.brand,
        pricePerPiece: form.pricePerPiece,
        supplierId: form.supplierId,
        maintainStockAt: form.maintainStockAt,
        minimumStock: form.minimumStock,
      });
      setInventory([created, ...(inventory ?? [])]);
      setIsAddOpen(false);
      toast.success("Item added successfully");
      resetForm();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add item");
    }
  }

  async function handleEditSave() {
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    if (!form.id) {
      toast.error("Missing item id");
      return;
    }
    try {
      const updated = await updateInventoryItem({
        id: form.id,
        name: form.name,
        category: form.category,
        quantity: form.quantity,
        location: form.location,
        reorderLevel: form.reorderLevel,
        brand: form.brand,
        pricePerPiece: form.pricePerPiece,
        supplierId: form.supplierId,
        maintainStockAt: form.maintainStockAt,
        minimumStock: form.minimumStock,
      });
      setInventory((inventory ?? []).map((i) => (i.id === updated.id ? updated : i)));
      setIsEditOpen(null);
      toast.success("Item updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update item");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteInventoryItem(id);
      setInventory((inventory ?? []).filter((i) => i.id !== id));
      setIsEditOpen(null);
      toast.success("Item deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete item");
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock":
        return "bg-green-500/10 text-green-700";
      case "Low Stock":
        return "bg-orange-500/10 text-orange-700";
      case "Critical":
        return "bg-red-500/10 text-red-700";
      default:
        return "bg-gray-500/10 text-gray-700";
    }
  };

  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkDeleteInventoryItems(ids);

      // Update local state - remove deleted items
      setInventory((prev) => prev?.filter((item) => !ids.includes(item.id)) ?? []);

      if (result.failedCount > 0) {
        toast.warning(`Deleted ${result.successCount} items. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully deleted ${result.successCount} item${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete items");
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  }, [selectedIds, setInventory, deselectAll]);

  // Bulk update handler
  const handleBulkUpdate = useCallback(async (value: string) => {
    if (!bulkUpdateType) return;

    setIsBulkUpdating(true);
    try {
      const ids = Array.from(selectedIds);
      let updates: Partial<InventoryItem> = {};

      switch (bulkUpdateType) {
        case "price":
          updates = { pricePerPiece: parseFloat(value) };
          break;
        case "location":
          updates = { location: value };
          break;
        case "reorderLevel":
          updates = { reorderLevel: parseInt(value, 10) };
          break;
        case "supplier":
          updates = { supplierId: value };
          break;
      }

      const result = await bulkUpdateInventoryItems(ids, updates);

      // Update local state with the changes
      setInventory((prev) => {
        if (!prev) return prev;
        return prev.map((item) => {
          if (ids.includes(item.id)) {
            return { ...item, ...updates };
          }
          return item;
        });
      });

      if (result.failedCount > 0) {
        toast.warning(`Updated ${result.successCount} items. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully updated ${result.successCount} item${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update items");
    } finally {
      setIsBulkUpdating(false);
      setBulkUpdateType(null);
    }
  }, [bulkUpdateType, selectedIds, setInventory, deselectAll]);

  // Get bulk update field config
  const getBulkUpdateField = (): BulkUpdateField | null => {
    switch (bulkUpdateType) {
      case "price":
        return {
          type: "number",
          label: "New Price (₱)",
          placeholder: "Enter new price",
          min: 0,
          step: 0.01,
          validate: (v) => parseFloat(v) < 0 ? "Price must be positive" : null,
        };
      case "location":
        return {
          type: "text",
          label: "New Location",
          placeholder: "e.g., A-12",
          validate: (v) => v.trim().length === 0 ? "Location is required" : null,
        };
      case "reorderLevel":
        return {
          type: "number",
          label: "New Reorder Level",
          placeholder: "Enter reorder level",
          min: 0,
          step: 1,
          validate: (v) => parseInt(v, 10) < 0 ? "Reorder level must be positive" : null,
        };
      case "supplier":
        return {
          type: "select",
          label: "New Supplier",
          placeholder: "Select supplier",
          options: suppliers?.filter(s => s.status === "Active").map(s => ({
            value: s.id,
            label: s.name,
          })) || [],
        };
      default:
        return null;
    }
  };

  // Get names of selected items for dialogs
  const selectedItemNames = useMemo(() => {
    return selectedItems.map(item => item.name);
  }, [selectedItems]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inventory Management</CardTitle>
            <div className="flex gap-2">

              <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Inventory Item</DialogTitle>
                    <DialogDescription>Enter the details for the new inventory item.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="item-name">Item Name</Label>
                      <Input
                        id="item-name"
                        placeholder="Enter item name"
                        value={form.name}
                        onChange={(e) => {
                          setForm({ ...form, name: e.target.value });
                          clearFieldError("name");
                        }}
                        className={fieldErrors.name ? "border-red-500" : ""}
                      />
                      {fieldErrors.name && <p className="text-sm text-red-500">{fieldErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={form.category} onValueChange={(v) => {
                        setForm({ ...form, category: v as InventoryCategory });
                        clearFieldError("category");
                      }}>
                        <SelectTrigger id="category" className={fieldErrors.category ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.category && <p className="text-sm text-red-500">{fieldErrors.category}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="0"
                        value={form.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setForm({ ...form, quantity: val });
                          clearFieldError("quantity");
                        }}
                        className={fieldErrors.quantity ? "border-red-500" : ""}
                      />
                      {fieldErrors.quantity && <p className="text-sm text-red-500">{fieldErrors.quantity}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        placeholder="e.g., A-12"
                        value={form.location}
                        onChange={(e) => {
                          setForm({ ...form, location: e.target.value });
                          clearFieldError("location");
                        }}
                        className={fieldErrors.location ? "border-red-500" : ""}
                      />
                      {fieldErrors.location && <p className="text-sm text-red-500">{fieldErrors.location}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reorder">Reorder Level</Label>
                      <Input
                        id="reorder"
                        type="number"
                        placeholder="0"
                        value={form.reorderLevel}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setForm({ ...form, reorderLevel: val });
                          clearFieldError("reorderLevel");
                        }}
                        className={fieldErrors.reorderLevel ? "border-red-500" : ""}
                      />
                      {fieldErrors.reorderLevel && <p className="text-sm text-red-500">{fieldErrors.reorderLevel}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        placeholder="Enter brand name"
                        value={form.brand}
                        onChange={(e) => {
                          setForm({ ...form, brand: e.target.value });
                          clearFieldError("brand");
                        }}
                        className={fieldErrors.brand ? "border-red-500" : ""}
                      />
                      {fieldErrors.brand && <p className="text-sm text-red-500">{fieldErrors.brand}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price Per Piece (PHP ₱)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.pricePerPiece}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setForm({ ...form, pricePerPiece: val });
                          clearFieldError("pricePerPiece");
                        }}
                        className={fieldErrors.pricePerPiece ? "border-red-500" : ""}
                      />
                      {fieldErrors.pricePerPiece && <p className="text-sm text-red-500">{fieldErrors.pricePerPiece}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Supplier</Label>
                      <Select value={form.supplierId} onValueChange={(v) => {
                        setForm({ ...form, supplierId: v });
                        clearFieldError("supplierId");
                      }}>
                        <SelectTrigger id="supplier" className={fieldErrors.supplierId ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers?.filter(s => s.status === "Active").map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.supplierId && <p className="text-sm text-red-500">{fieldErrors.supplierId}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minimumStock">Minimum Stock</Label>
                      <Input
                        id="minimumStock"
                        type="number"
                        placeholder="0"
                        value={form.minimumStock}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setForm({ ...form, minimumStock: val });
                          clearFieldError("minimumStock");
                        }}
                        className={fieldErrors.minimumStock ? "border-red-500" : ""}
                      />
                      {fieldErrors.minimumStock && <p className="text-sm text-red-500">{fieldErrors.minimumStock}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maintainStock">Maintain Stock At</Label>
                      <Input
                        id="maintainStock"
                        type="number"
                        placeholder="0"
                        value={form.maintainStockAt}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setForm({ ...form, maintainStockAt: val });
                          clearFieldError("maintainStockAt");
                        }}
                        className={fieldErrors.maintainStockAt ? "border-red-500" : ""}
                      />
                      {fieldErrors.maintainStockAt && <p className="text-sm text-red-500">{fieldErrors.maintainStockAt}</p>}
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleAdd}
                    >
                      Add Item
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Electronics">Electronics</SelectItem>
                <SelectItem value="Furniture">Furniture</SelectItem>
                <SelectItem value="Clothing">Clothing</SelectItem>
                <SelectItem value="Food">Food</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="gap-1"
            >
              <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
              Favorites
              {getFavoritesByType("inventory").length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {getFavoritesByType("inventory").length}
                </Badge>
              )}
            </Button>
            <SaveSearchDialog
              entityType="inventory"
              currentSearchTerm={searchTerm}
              currentFilters={getCurrentFilters}
              onApplySearch={handleApplySavedSearch}
            />
          </div>

          {/* Bulk Actions Toolbar */}
          {hasSelection && (
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
                  id: "bulk-update",
                  label: "Bulk Update",
                  icon: <Edit className="h-4 w-4 mr-1" />,
                  options: [
                    { value: "price", label: "Update Price" },
                    { value: "location", label: "Update Location" },
                    { value: "reorderLevel", label: "Update Reorder Level" },
                    { value: "supplier", label: "Update Supplier" },
                  ],
                  onSelect: (value) => setBulkUpdateType(value as "price" | "location" | "reorderLevel" | "supplier"),
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
            itemType="item"
            itemNames={selectedItemNames}
            onConfirm={handleBulkDelete}
            isLoading={isBulkDeleting}
          />

          {/* Bulk Update Dialog */}
          {bulkUpdateType && getBulkUpdateField() && (
            <BulkUpdateDialog
              open={!!bulkUpdateType}
              onOpenChange={(open) => !open && setBulkUpdateType(null)}
              title={`Update ${bulkUpdateType === "price" ? "Price" : bulkUpdateType === "location" ? "Location" : bulkUpdateType === "reorderLevel" ? "Reorder Level" : "Supplier"}`}
              description={`Set new ${bulkUpdateType === "price" ? "price" : bulkUpdateType === "location" ? "location" : bulkUpdateType === "reorderLevel" ? "reorder level" : "supplier"} for selected items`}
              itemCount={selectionCount}
              itemNames={selectedItemNames}
              field={getBulkUpdateField()!}
              onConfirm={handleBulkUpdate}
              isLoading={isBulkUpdating}
            />
          )}

          {isLoading ? (
            <TableLoadingSkeleton rows={8} />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No inventory items found"
              description={searchTerm || filterCategory !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Get started by adding your first inventory item"}
              actionLabel={!searchTerm && filterCategory === "all" ? "Add Item" : undefined}
              onAction={!searchTerm && filterCategory === "all" ? () => setIsAddOpen(true) : undefined}
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
                        aria-label="Select all items"
                      />
                    </TableHead>
                    <TableHead>Item ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((item) => {
                    const supplierName = supplierById.get(item.supplierId) ?? (item.supplierId || 'N/A');
                    const itemIsSelected = isSelected(item.id);

                    return (
                      <TableRow
                        key={item.id}
                        className={cn(itemIsSelected && "bg-muted/50")}
                      >
                        <TableCell>
                          <Checkbox
                            checked={itemIsSelected}
                            onCheckedChange={() => toggleItem(item.id)}
                            aria-label={`Select ${item.name}`}
                          />
                        </TableCell>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.brand || 'Unknown'}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₱{(item.pricePerPiece ?? 0).toFixed(2)}</TableCell>
                        <TableCell>{supplierName}</TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FavoriteButton
                              entityType="inventory"
                              entityId={item.id}
                              entityName={item.name}
                            />
                          <Dialog open={isEditOpen === item.id} onOpenChange={(o: boolean) => {
                            setIsEditOpen(o ? item.id : null);
                            if (o) setForm({
                              id: item.id,
                              name: item.name,
                              category: item.category,
                              quantity: item.quantity,
                              location: item.location,
                              reorderLevel: item.reorderLevel,
                              brand: item.brand || "Unknown",
                              pricePerPiece: item.pricePerPiece ?? 0,
                              supplierId: item.supplierId || "SUP-001",
                              maintainStockAt: item.maintainStockAt ?? (item.reorderLevel * 2),
                              minimumStock: item.minimumStock ?? item.reorderLevel,
                            });
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">Edit</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Inventory Item</DialogTitle>
                                <DialogDescription>Update fields and save your changes.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-name">Item Name</Label>
                                  <Input id="edit-name" placeholder="Enter item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-category">Category</Label>
                                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as InventoryCategory })}>
                                    <SelectTrigger id="edit-category">
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CATEGORIES.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-quantity">Quantity</Label>
                                  <Input id="edit-quantity" type="number" placeholder="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-location">Location</Label>
                                  <Input id="edit-location" placeholder="e.g., A-12" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-reorder">Reorder Level</Label>
                                  <Input id="edit-reorder" type="number" placeholder="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-brand">Brand</Label>
                                  <Input id="edit-brand" placeholder="Enter brand name" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-price">Price Per Piece (PHP ₱)</Label>
                                  <Input id="edit-price" type="number" step="0.01" placeholder="0.00" value={form.pricePerPiece} onChange={(e) => setForm({ ...form, pricePerPiece: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-supplier">Supplier</Label>
                                  <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                                    <SelectTrigger id="edit-supplier">
                                      <SelectValue placeholder="Select supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {suppliers?.filter(s => s.status === "Active").map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-minimumStock">Minimum Stock</Label>
                                  <Input id="edit-minimumStock" type="number" placeholder="0" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-maintainStock">Maintain Stock At</Label>
                                  <Input id="edit-maintainStock" type="number" placeholder="0" value={form.maintainStockAt} onChange={(e) => setForm({ ...form, maintainStockAt: Number(e.target.value) })} />
                                </div>
                                <div className="flex gap-2">
                                  <Button className="flex-1" onClick={handleEditSave}>Save Changes</Button>
                                  <Button variant="destructive" onClick={() => handleDelete(item.id)}>Delete</Button>
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
              {filteredItems.length > 0 && (
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
