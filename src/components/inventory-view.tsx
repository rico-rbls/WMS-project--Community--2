import { useMemo, useState, useCallback, useEffect, useRef } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";
import { Plus, Search, Filter, Package, Trash2, Edit, Star, Upload, FileSpreadsheet, Image, X, AlertCircle, CheckCircle2, ImageIcon } from "lucide-react";
import * as XLSX from "xlsx";
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
import { useTableSort } from "../hooks/useTableSort";
import { SortableTableHead } from "./ui/sortable-table-head";
import { useAuth } from "../context/auth-context";
import { canWrite } from "../lib/permissions";
import { EditableCell } from "./ui/editable-cell";

const CATEGORIES: InventoryCategory[] = ["Electronics", "Furniture", "Clothing", "Food"];
const STATUSES = ["In Stock", "Low Stock", "Critical"] as const;

// Category prefixes for auto-generating location codes
const CATEGORY_LOCATION_PREFIX: Record<InventoryCategory, string> = {
  Electronics: "E",
  Furniture: "F",
  Clothing: "C",
  Food: "D", // D for Dry goods/Food storage
};

// Generate auto-location code based on category and existing items
function generateLocationCode(category: InventoryCategory, existingItems: InventoryItem[]): string {
  const prefix = CATEGORY_LOCATION_PREFIX[category];

  // Find existing locations with this prefix
  const existingLocations = existingItems
    .filter(item => item.location.startsWith(`${prefix}-`))
    .map(item => {
      const match = item.location.match(new RegExp(`^${prefix}-(\\d+)$`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => !isNaN(num));

  // Find the next available number
  const maxNumber = existingLocations.length > 0 ? Math.max(...existingLocations) : 0;
  const nextNumber = maxNumber + 1;

  // Format with leading zero for numbers < 10
  return `${prefix}-${nextNumber.toString().padStart(2, '0')}`;
}

interface InventoryViewProps {
  initialOpenDialog?: boolean;
  onDialogOpened?: () => void;
}

export function InventoryView({ initialOpenDialog, onDialogOpened }: InventoryViewProps) {
  const { inventory, isLoading, setInventory } = useInventory();
  const { suppliers } = useSuppliers();
  const { isFavorite, getFavoritesByType } = useFavorites();
  const { user } = useAuth();
  const canModify = user ? canWrite(user.role) : false;
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
    photoUrl: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Excel import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<Partial<InventoryItem>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Photo preview states
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  // Sorting - applied before pagination
  const {
    sortedData,
    sortConfig,
    requestSort,
    getSortDirection,
  } = useTableSort<InventoryItem>(filteredItems);

  // Pagination with 25 items per page - uses sorted data
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    totalItems,
    itemsPerPage,
  } = usePagination<InventoryItem>(sortedData, 25);

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
  const [bulkUpdateType, setBulkUpdateType] = useState<"category" | "status" | "location" | "reorderLevel" | "supplier" | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  function resetForm() {
    const defaultCategory: InventoryCategory = "Electronics";
    const autoLocation = generateLocationCode(defaultCategory, inventoryItems);
    setForm({
      id: "",
      name: "",
      category: defaultCategory,
      quantity: 0,
      location: autoLocation,
      reorderLevel: 0,
      brand: "",
      pricePerPiece: 0,
      supplierId: "",
      maintainStockAt: 0,
      minimumStock: 0,
      photoUrl: "",
    });
    setFieldErrors({});
  }

  // Handler to update location when category changes (for Add dialog only)
  function handleCategoryChange(newCategory: InventoryCategory, isEditMode: boolean) {
    if (!isEditMode) {
      // Auto-generate new location for the new category
      const autoLocation = generateLocationCode(newCategory, inventoryItems);
      setForm(prev => ({ ...prev, category: newCategory, location: autoLocation }));
    } else {
      // In edit mode, just change the category without changing location
      setForm(prev => ({ ...prev, category: newCategory }));
    }
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
        if (result.error && result.error.issues) {
          result.error.issues.forEach((err) => {
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
        photoUrl: form.photoUrl || undefined,
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
        photoUrl: form.photoUrl || undefined,
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

  // Inline edit handler for quick cell updates
  const handleInlineUpdate = useCallback(async (itemId: string, field: keyof InventoryItem, value: string | number) => {
    try {
      const updates: Partial<InventoryItem> = { [field]: value };
      const updated = await updateInventoryItem({ id: itemId, ...updates });
      setInventory((prev) => {
        if (!prev) return prev;
        return prev.map((item) => (item.id === itemId ? updated : item));
      });
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
      throw e; // Re-throw so EditableCell can revert
    }
  }, [setInventory]);

  // Excel import handler
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const errors: string[] = [];
        const validItems: Partial<InventoryItem>[] = [];

        jsonData.forEach((row: any, index) => {
          const rowNum = index + 2; // Excel rows start at 1, plus header

          // Map Excel columns to inventory fields (case-insensitive)
          const name = row.Name || row.name || row.NAME;
          const category = row.Category || row.category || row.CATEGORY;
          const quantity = Number(row.Quantity || row.quantity || row.QUANTITY || 0);
          const location = row.Location || row.location || row.LOCATION || "";
          const reorderLevel = Number(row["Reorder Level"] || row.reorderLevel || row.ReorderLevel || 0);
          const brand = row.Brand || row.brand || row.BRAND || "Unknown";
          const pricePerPiece = Number(row["Price Per Piece"] || row.pricePerPiece || row.Price || row.price || 0);
          const supplierId = row["Supplier ID"] || row.supplierId || row.SupplierId || "";
          const maintainStockAt = Number(row["Maintain Stock At"] || row.maintainStockAt || reorderLevel * 2);
          const minimumStock = Number(row["Minimum Stock"] || row.minimumStock || reorderLevel);
          const photoUrl = row["Photo URL"] || row.photoUrl || row.PhotoUrl || "";

          // Validate required fields
          if (!name) {
            errors.push(`Row ${rowNum}: Name is required`);
            return;
          }

          // Validate category
          const validCategories = ["Electronics", "Furniture", "Clothing", "Food"];
          if (!validCategories.includes(category)) {
            errors.push(`Row ${rowNum}: Invalid category "${category}". Must be one of: ${validCategories.join(", ")}`);
            return;
          }

          if (quantity < 0) {
            errors.push(`Row ${rowNum}: Quantity cannot be negative`);
            return;
          }

          validItems.push({
            name,
            category: category as InventoryCategory,
            quantity,
            location,
            reorderLevel,
            brand,
            pricePerPiece,
            supplierId,
            maintainStockAt,
            minimumStock,
            photoUrl: photoUrl || undefined,
          });
        });

        setImportData(validItems);
        setImportErrors(errors);
        setIsImportDialogOpen(true);
      } catch (error) {
        toast.error("Failed to parse file. Please ensure it's a valid Excel or CSV file.");
      }
    };

    reader.readAsArrayBuffer(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (importData.length === 0) return;

    setIsImporting(true);
    try {
      const createdItems: InventoryItem[] = [];
      for (const item of importData) {
        const created = await createInventoryItem({
          name: item.name!,
          category: item.category!,
          quantity: item.quantity ?? 0,
          location: item.location ?? "",
          reorderLevel: item.reorderLevel ?? 0,
          brand: item.brand ?? "Unknown",
          pricePerPiece: item.pricePerPiece ?? 0,
          supplierId: item.supplierId ?? "",
          maintainStockAt: item.maintainStockAt ?? 0,
          minimumStock: item.minimumStock ?? 0,
          photoUrl: item.photoUrl,
        });
        createdItems.push(created);
      }

      setInventory([...createdItems, ...(inventory ?? [])]);
      toast.success(`Successfully imported ${createdItems.length} items`);
      setIsImportDialogOpen(false);
      setImportData([]);
      setImportErrors([]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to import items");
    } finally {
      setIsImporting(false);
    }
  }, [importData, inventory, setInventory]);

  // Photo upload handler
  const handlePhotoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPG, PNG, or WebP images.");
      return;
    }

    // Create a data URL for preview/storage (in a real app, you'd upload to a server/cloud storage)
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setForm(prev => ({ ...prev, photoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }, []);

  const openPhotoPreview = useCallback((url: string) => {
    setPhotoPreviewUrl(url);
    setIsPhotoPreviewOpen(true);
  }, []);

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
      const ids = Array.from(selectedIds) as string[];
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
      const ids = Array.from(selectedIds) as string[];
      let updates: Partial<InventoryItem> = {};

      switch (bulkUpdateType) {
        case "category":
          updates = { category: value as InventoryCategory };
          break;
        case "status":
          updates = { status: value as InventoryItem["status"] };
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
      case "category":
        return {
          type: "select",
          label: "New Category",
          placeholder: "Select category",
          options: CATEGORIES.map(c => ({ value: c, label: c })),
        };
      case "status":
        return {
          type: "select",
          label: "New Status",
          placeholder: "Select status",
          options: STATUSES.map(s => ({ value: s, label: s })),
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
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />
      <input
        type="file"
        ref={photoInputRef}
        onChange={handlePhotoUpload}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inventory Management</CardTitle>
            <div className="flex gap-2">
              {/* Import from Excel Button */}
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canModify}
                title={!canModify ? "You don't have permission to import items" : "Import from Excel/CSV"}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>

              <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); }} disabled={!canModify} title={!canModify ? "You don't have permission to add items" : undefined}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Inventory Item</DialogTitle>
                    <DialogDescription>Enter the details for the new inventory item.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Item Name - Full Width */}
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

                    {/* Category & Brand Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={form.category} onValueChange={(v) => {
                          handleCategoryChange(v as InventoryCategory, false);
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
                    </div>

                    {/* Quantity & Location Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <Label htmlFor="location">Location <span className="text-xs text-muted-foreground font-normal">(auto-assigned, editable)</span></Label>
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
                    </div>

                    {/* Price & Supplier Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    </div>

                    {/* Stock Management Section */}
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="text-sm font-medium text-muted-foreground">Stock Management</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      </div>
                    </div>

                    {/* Product Photo Section */}
                    <div className="space-y-2 border-t pt-4">
                      <Label htmlFor="photo">Product Photo</Label>
                      <div className="flex items-center gap-4">
                        {form.photoUrl ? (
                          <div className="relative h-20 w-20 rounded-md border overflow-hidden">
                            <img
                              src={form.photoUrl}
                              alt="Product preview"
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, photoUrl: "" })}
                              className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="h-20 w-20 rounded-md border border-dashed flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-8 w-8" />
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => photoInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Photo
                          </Button>
                          <p className="text-xs text-muted-foreground">Supports JPG, PNG, WebP</p>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleAdd}
                    >
                      <Plus className="h-4 w-4 mr-2" />
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
                  id: "bulk-update",
                  label: "Bulk Update",
                  icon: <Edit className="h-4 w-4 mr-1" />,
                  options: [
                    { value: "category", label: "Update Category" },
                    { value: "status", label: "Update Status" },
                    { value: "location", label: "Update Location" },
                    { value: "reorderLevel", label: "Update Reorder Level" },
                    { value: "supplier", label: "Update Supplier" },
                  ],
                  onSelect: (value) => setBulkUpdateType(value as "category" | "status" | "location" | "reorderLevel" | "supplier"),
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
                    <TableHead className="w-16">Photo</TableHead>
                    <SortableTableHead
                      sortKey="id"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("id")}
                      onSort={(key) => requestSort(key as keyof InventoryItem)}
                    >
                      Item ID
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="name"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("name")}
                      onSort={(key) => requestSort(key as keyof InventoryItem)}
                    >
                      Name
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="brand"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("brand")}
                      onSort={(key) => requestSort(key as keyof InventoryItem)}
                    >
                      Brand
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="category"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("category")}
                      onSort={(key) => requestSort(key as keyof InventoryItem)}
                    >
                      Category
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="quantity"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("quantity")}
                      onSort={(key) => requestSort(key as keyof InventoryItem)}
                    >
                      Quantity
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="pricePerPiece"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("pricePerPiece")}
                      onSort={(key) => requestSort(key as keyof InventoryItem)}
                    >
                      Price
                    </SortableTableHead>
                    <TableHead>Supplier</TableHead>
                    <SortableTableHead
                      sortKey="location"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("location")}
                      onSort={(key) => requestSort(key as keyof InventoryItem)}
                    >
                      Location
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("status")}
                      onSort={(key) => requestSort(key as keyof InventoryItem)}
                    >
                      Status
                    </SortableTableHead>
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
                        <TableCell>
                          {item.photoUrl ? (
                            <button
                              type="button"
                              onClick={() => openPhotoPreview(item.photoUrl!)}
                              className="h-10 w-10 rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                            >
                              <img
                                src={item.photoUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ) : (
                            <div className="h-10 w-10 rounded-md border border-dashed flex items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.name}
                            type="text"
                            onSave={(v) => handleInlineUpdate(item.id, "name", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.brand || 'Unknown'}
                            type="text"
                            onSave={(v) => handleInlineUpdate(item.id, "brand", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.category}
                            type="select"
                            options={CATEGORIES.map(c => ({ value: c, label: c }))}
                            onSave={(v) => handleInlineUpdate(item.id, "category", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.quantity}
                            type="number"
                            min={0}
                            step={1}
                            onSave={(v) => handleInlineUpdate(item.id, "quantity", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.pricePerPiece ?? 0}
                            displayValue={`₱${(item.pricePerPiece ?? 0).toFixed(2)}`}
                            type="number"
                            min={0}
                            step={0.01}
                            onSave={(v) => handleInlineUpdate(item.id, "pricePerPiece", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.supplierId}
                            displayValue={supplierName}
                            type="select"
                            options={suppliers?.filter(s => s.status === "Active").map(s => ({ value: s.id, label: s.name })) || []}
                            onSave={(v) => handleInlineUpdate(item.id, "supplierId", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.location}
                            type="text"
                            onSave={(v) => handleInlineUpdate(item.id, "location", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.status}
                            type="badge"
                            options={STATUSES.map(s => ({ value: s, label: s }))}
                            badgeClassName={getStatusColor(item.status)}
                            onSave={(v) => handleInlineUpdate(item.id, "status", v)}
                            disabled={!canModify}
                          />
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
                              photoUrl: item.photoUrl || "",
                            });
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={!canModify} title={!canModify ? "You don't have permission to edit items" : undefined}>Edit</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Inventory Item</DialogTitle>
                                <DialogDescription>Update fields and save your changes.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-6 py-4">
                                {/* Item Name - Full Width */}
                                <div className="space-y-2">
                                  <Label htmlFor="edit-name">Item Name</Label>
                                  <Input id="edit-name" placeholder="Enter item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                </div>

                                {/* Category & Brand Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    <Label htmlFor="edit-brand">Brand</Label>
                                    <Input id="edit-brand" placeholder="Enter brand name" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                                  </div>
                                </div>

                                {/* Quantity & Location Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-quantity">Quantity</Label>
                                    <Input id="edit-quantity" type="number" placeholder="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-location">Location</Label>
                                    <Input id="edit-location" placeholder="e.g., A-12" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                                  </div>
                                </div>

                                {/* Price & Supplier Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                </div>

                                {/* Stock Management Section */}
                                <div className="space-y-4 border-t pt-4">
                                  <h4 className="text-sm font-medium text-muted-foreground">Stock Management</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-reorder">Reorder Level</Label>
                                      <Input id="edit-reorder" type="number" placeholder="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-minimumStock">Minimum Stock</Label>
                                      <Input id="edit-minimumStock" type="number" placeholder="0" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-maintainStock">Maintain Stock At</Label>
                                      <Input id="edit-maintainStock" type="number" placeholder="0" value={form.maintainStockAt} onChange={(e) => setForm({ ...form, maintainStockAt: Number(e.target.value) })} />
                                    </div>
                                  </div>
                                </div>

                                {/* Product Photo Section */}
                                <div className="space-y-2 border-t pt-4">
                                  <Label htmlFor="edit-photo">Product Photo</Label>
                                  <div className="flex items-center gap-4">
                                    {form.photoUrl ? (
                                      <div className="relative h-20 w-20 rounded-md border overflow-hidden">
                                        <img
                                          src={form.photoUrl}
                                          alt="Product preview"
                                          className="h-full w-full object-cover"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setForm({ ...form, photoUrl: "" })}
                                          className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="h-20 w-20 rounded-md border border-dashed flex items-center justify-center text-muted-foreground">
                                        <ImageIcon className="h-8 w-8" />
                                      </div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => photoInputRef.current?.click()}
                                      >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload Photo
                                      </Button>
                                      <p className="text-xs text-muted-foreground">Supports JPG, PNG, WebP</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                  <Button className="flex-1" size="lg" onClick={handleEditSave}>Save Changes</Button>
                                  <Button variant="destructive" size="lg" onClick={() => handleDelete(item.id)}>Delete</Button>
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

      {/* Import Preview Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Preview
            </DialogTitle>
            <DialogDescription>
              Review the data before importing. {importData.length} items will be added.
            </DialogDescription>
          </DialogHeader>

          {importErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                <AlertCircle className="h-4 w-4" />
                {importErrors.length} validation error(s) found:
              </div>
              <ScrollArea className="max-h-24">
                <ul className="text-sm text-destructive space-y-1">
                  {importErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>₱{(item.pricePerPiece ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{item.brand || "Unknown"}</TableCell>
                    <TableCell>{item.location || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportData([]);
                setImportErrors([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportConfirm}
              disabled={importData.length === 0 || isImporting}
            >
              {isImporting ? (
                <>Importing...</>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Import {importData.length} Items
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Preview Dialog */}
      <Dialog open={isPhotoPreviewOpen} onOpenChange={setIsPhotoPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Photo</DialogTitle>
          </DialogHeader>
          {photoPreviewUrl && (
            <div className="flex items-center justify-center">
              <img
                src={photoPreviewUrl}
                alt="Product"
                className="max-h-[60vh] max-w-full object-contain rounded-md"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
