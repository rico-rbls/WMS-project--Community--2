import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
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
import { Plus, Search, Filter, Package, Trash2, Edit, Star, Upload, FileSpreadsheet, Image, X, AlertCircle, CheckCircle2, ImageIcon, LayoutGrid, List, MapPin, DollarSign, TrendingUp, Clock, Boxes, Eye, Tag, Hash, Warehouse, Building2, FileText, Archive, ArchiveRestore, Settings2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { getCategories, addCategory, addSubcategory } from "../services/api";
import {
  createInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
  archiveInventoryItem,
  restoreInventoryItem,
  permanentlyDeleteInventoryItem,
  bulkArchiveInventoryItems,
  bulkRestoreInventoryItems,
  bulkDeleteInventoryItems,
  bulkPermanentlyDeleteInventoryItems,
  bulkUpdateInventoryItems,
  createFirebaseSupplier,
} from "../services/firebase-inventory-api";
import type { InventoryCategory, InventoryItem, Supplier, CategoryDefinition } from "../types";
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
import { SelectAllBanner } from "./ui/select-all-banner";
import { BulkUpdateDialog, type BulkUpdateField } from "./ui/bulk-update-dialog";
import { FavoriteButton } from "./ui/favorite-button";

import { useFavorites } from "../context/favorites-context";
import { useTableSort } from "../hooks/useTableSort";
import { SortableTableHead } from "./ui/sortable-table-head";
import { useAuth } from "../context/auth-context";
import { canWrite } from "../lib/permissions";
import { EditableCell } from "./ui/editable-cell";
import { uploadImage, deleteImage, isCloudinaryConfigured } from "../services/cloudinary";

const STATUSES = ["In Stock", "Low Stock", "Critical", "Overstock"] as const;

// Default categories (fallback)
const DEFAULT_CATEGORIES: InventoryCategory[] = ["Electronics", "Furniture", "Clothing", "Food & Beverages"];

// View modes for inventory display
type ViewMode = "table" | "catalog";
const VIEW_MODE_STORAGE_KEY = "inventory-view-mode";

// Column visibility configuration
const COLUMN_VISIBILITY_STORAGE_KEY = "inventory-column-visibility";

// Define optional columns that can be toggled (excluding always-visible: checkbox, photo, item ID, name, actions)
type OptionalColumn = "category" | "subcategory" | "quantityPurchased" | "quantitySold" | "quantity" | "reorderRequired" | "pricePerPiece" | "supplier" | "brand" | "location" | "status";

const OPTIONAL_COLUMNS: { key: OptionalColumn; label: string }[] = [
  { key: "category", label: "Category" },
  { key: "subcategory", label: "Subcategory" },
  { key: "quantityPurchased", label: "Quantity Purchased" },
  { key: "quantitySold", label: "Quantity Sold" },
  { key: "quantity", label: "Remaining Quantity" },
  { key: "reorderRequired", label: "Reorder Required" },
  { key: "pricePerPiece", label: "Price per Piece" },
  { key: "supplier", label: "Supplier" },
  { key: "brand", label: "Brand" },
  { key: "location", label: "Location" },
  { key: "status", label: "Status" },
];

// Default visible columns
const DEFAULT_VISIBLE_COLUMNS: OptionalColumn[] = [
  "category", "subcategory", "quantityPurchased", "quantitySold", "quantity", "reorderRequired", "pricePerPiece", "supplier", "location"
];

// Default category prefixes for auto-generating location codes
const DEFAULT_CATEGORY_LOCATION_PREFIX: Record<string, string> = {
  Electronics: "E",
  Furniture: "F",
  Clothing: "C",
  "Food & Beverages": "D", // D for Dry goods/Food storage
};

// Generate auto-location code based on category and existing items
function generateLocationCode(category: InventoryCategory, existingItems: InventoryItem[]): string {
  const prefix = DEFAULT_CATEGORY_LOCATION_PREFIX[category] || category.charAt(0).toUpperCase();

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
  const { suppliers, setSuppliers } = useSuppliers();
  const { isFavorite, getFavoritesByType } = useFavorites();
  const { user } = useAuth();
  const canModify = user ? canWrite(user.role) : false;
  const canPermanentlyDelete = user?.role === "Admin" || user?.role === "Owner";
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSubcategory, setFilterSubcategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState<string | null>(null);

  // Categories state
  const [categories, setCategories] = useState<CategoryDefinition[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddSubcategoryOpen, setIsAddSubcategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [selectedCategoryForSubcategory, setSelectedCategoryForSubcategory] = useState("");

  // Load categories on mount
  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Use strings for numeric fields to allow empty input during typing
  const [form, setForm] = useState({
    id: "",
    name: "",
    category: "Electronics" as InventoryCategory,
    subcategory: "",
    quantity: "" as string | number,
    location: "",
    brand: "",
    pricePerPiece: "" as string | number,
    supplierId: "",
    quantityPurchased: "" as string | number,
    quantitySold: "" as string | number,
    reorderRequired: false,
    reorderLevel: undefined as string | number | undefined,
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

  // Inline supplier creation states
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
    category: "",
  });

  // Get available subcategories for selected category in form
  const availableSubcategories = useMemo(() => {
    const cat = categories.find(c => c.name === form.category);
    return cat?.subcategories ?? [];
  }, [categories, form.category]);

  // Get category names for dropdowns
  const categoryNames = useMemo(() => {
    return categories.map(c => c.name);
  }, [categories]);

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return (saved === "catalog" || saved === "table") ? saved : "table";
    }
    return "table";
  });

  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Set<OptionalColumn>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return new Set(parsed as OptionalColumn[]);
          }
        } catch {
          // Invalid JSON, use defaults
        }
      }
    }
    return new Set(DEFAULT_VISIBLE_COLUMNS);
  });

  // Save column visibility to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)));
  }, [visibleColumns]);

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((column: OptionalColumn) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  }, []);

  // Check if a column is visible
  const isColumnVisible = useCallback((column: OptionalColumn) => visibleColumns.has(column), [visibleColumns]);

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
      if (item.quantityPurchased === undefined || item.quantitySold === undefined ||
        item.reorderRequired === undefined) {
        return {
          ...item,
          brand: item.brand || "Unknown",
          pricePerPiece: item.pricePerPiece ?? 0,
          supplierId: item.supplierId || "SUP-001",
          quantityPurchased: item.quantityPurchased ?? Math.floor(item.quantity * 1.5),
          quantitySold: item.quantitySold ?? Math.floor(item.quantity * 0.5),
          reorderRequired: item.reorderRequired ?? false,
        };
      }
      return item;
    });
  }, [inventory]);

  // Optimized filtering with early returns and debounced search
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      // Filter by archived status
      if ((item.archived ?? false) !== showArchived) {
        return false;
      }

      // Early return for favorites filter
      if (showFavoritesOnly && !isFavorite("inventory", item.id)) {
        return false;
      }

      // Early return for category filter
      if (filterCategory !== "all" && item.category !== filterCategory) {
        return false;
      }

      // Early return for subcategory filter
      if (filterSubcategory !== "all" && item.subcategory !== filterSubcategory) {
        return false;
      }

      // Early return for status filter
      if (filterStatus !== "all" && item.status !== filterStatus) {
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
  }, [inventoryItems, debouncedSearchTerm, filterCategory, filterSubcategory, filterStatus, showFavoritesOnly, isFavorite, showArchived]);

  // Get available subcategories for the current filter category
  const filterSubcategoryOptions = useMemo(() => {
    if (filterCategory === "all") return [];
    const cat = categories.find(c => c.name === filterCategory);
    return cat?.subcategories ?? [];
  }, [categories, filterCategory]);

  // Clear all filters helper
  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setFilterCategory("all");
    setFilterSubcategory("all");
    setFilterStatus("all");
    setShowFavoritesOnly(false);
    setShowArchived(false);
  }, []);

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

  // Inventory statistics
  const inventoryStats = useMemo(() => {
    const items = inventoryItems;
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => sum + (item.pricePerPiece * item.quantity), 0);

    // Status counts based on reorderRequired and quantity
    const inStockCount = items.filter(item => item.quantity > 0 && !item.reorderRequired).length;
    const lowStockCount = items.filter(item => item.reorderRequired && item.quantity > 0).length;
    const criticalCount = items.filter(item => item.quantity <= 10 && item.quantity > 0).length;
    const outOfStockCount = items.filter(item => item.quantity === 0).length;
    const overstockCount = items.filter(item => item.quantity > 200).length; // Arbitrary threshold for overstock

    // Category breakdown
    const categoryBreakdown = categoryNames.reduce((acc, cat) => {
      acc[cat] = items.filter(item => item.category === cat).length;
      return acc;
    }, {} as Record<string, number>);

    // Health rate (items not requiring reorder)
    const healthyItems = items.filter(item => !item.reorderRequired && item.quantity > 0).length;
    const healthRate = totalItems > 0 ? Math.round((healthyItems / totalItems) * 100) : 0;

    return {
      totalItems,
      totalQuantity,
      totalValue,
      inStockCount,
      lowStockCount,
      criticalCount,
      outOfStockCount,
      overstockCount,
      categoryBreakdown,
      healthRate,
      healthyItems,
    };
  }, [inventoryItems]);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  // Batch selection
  const {
    selectedIds,
    toggleItem,
    toggleAll,
    selectAllPages,
    deselectAll,
    isSelected,
    isAllSelected,
    isAllPageSelected,
    isAllPagesSelected,
    isPartiallySelected,
    selectionCount,
    hasSelection,
    selectedItems,
    totalItemCount,
    pageItemCount,
    canSelectAllPages,
  } = useBatchSelection<InventoryItem>(paginatedData, sortedData);

  // Bulk operation states
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkUpdateType, setBulkUpdateType] = useState<"category" | "status" | "location" | "reorderRequired" | "supplier" | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Single item delete confirmation states
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function resetForm() {
    const defaultCategory: InventoryCategory = categoryNames[0] || "Electronics";
    const autoLocation = generateLocationCode(defaultCategory, inventoryItems);
    setForm({
      id: "",
      name: "",
      category: defaultCategory,
      subcategory: "",
      quantity: "",
      location: autoLocation,
      brand: "",
      pricePerPiece: "",
      supplierId: "",
      quantityPurchased: "",
      quantitySold: "",
      reorderRequired: false,
      reorderLevel: undefined,
      photoUrl: "",
    });
    setFieldErrors({});
  }

  function resetSupplierForm() {
    setSupplierForm({
      name: "",
      contact: "",
      email: "",
      phone: "",
      category: "",
    });
  }

  async function handleCreateSupplier() {
    if (!supplierForm.name.trim() || !supplierForm.contact.trim() || !supplierForm.email.trim() || !supplierForm.phone.trim() || !supplierForm.category.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    setIsCreatingSupplier(true);
    try {
      const created = await createFirebaseSupplier({
        name: supplierForm.name,
        contact: supplierForm.contact,
        email: supplierForm.email,
        phone: supplierForm.phone,
        category: supplierForm.category,
        status: "Active",
      });
      // Add new supplier to the context so it appears in all dropdowns
      setSuppliers((prev: Supplier[] | null) => [created, ...(prev ?? [])]);
      // Select the newly created supplier in the form
      setForm(prev => ({ ...prev, supplierId: created.id }));
      setIsAddSupplierOpen(false);
      resetSupplierForm();
      toast.success(`Supplier "${created.name}" created and selected`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create supplier");
    } finally {
      setIsCreatingSupplier(false);
    }
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
        brand: form.brand,
        pricePerPiece: form.pricePerPiece,
        supplierId: form.supplierId,
        quantityPurchased: form.quantityPurchased,
        quantitySold: form.quantitySold,
        reorderRequired: form.reorderRequired,
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
        subcategory: form.subcategory || undefined,
        quantity: Number(form.quantity) || 0,
        location: form.location,
        brand: form.brand,
        pricePerPiece: Number(form.pricePerPiece) || 0,
        supplierId: form.supplierId,
        quantityPurchased: Number(form.quantityPurchased) || 0,
        quantitySold: Number(form.quantitySold) || 0,
        reorderRequired: form.reorderRequired,
        reorderLevel: form.reorderLevel !== undefined && form.reorderLevel !== "" ? Number(form.reorderLevel) : undefined,
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
        subcategory: form.subcategory || undefined,
        quantity: Number(form.quantity) || 0,
        location: form.location,
        brand: form.brand,
        pricePerPiece: Number(form.pricePerPiece) || 0,
        supplierId: form.supplierId,
        quantityPurchased: Number(form.quantityPurchased) || 0,
        quantitySold: Number(form.quantitySold) || 0,
        reorderRequired: form.reorderRequired,
        reorderLevel: form.reorderLevel !== undefined && form.reorderLevel !== "" ? Number(form.reorderLevel) : undefined,
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

  // Archive handler
  async function handleArchive(id: string) {
    try {
      const archived = await archiveInventoryItem(id);
      setInventory((inventory ?? []).map((i) => (i.id === id ? archived : i)));
      setIsEditOpen(null);
      toast.success("Item archived successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to archive item");
    }
  }

  // Restore handler
  async function handleRestore(id: string) {
    try {
      const restored = await restoreInventoryItem(id);
      setInventory((inventory ?? []).map((i) => (i.id === id ? restored : i)));
      setIsEditOpen(null);
      toast.success("Item restored successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to restore item");
    }
  }

  // Permanent delete handler
  async function handlePermanentDelete(id: string) {
    try {
      await permanentlyDeleteInventoryItem(id);
      setInventory((inventory ?? []).filter((i) => i.id !== id));
      setIsEditOpen(null);
      toast.success("Item permanently deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to permanently delete item");
    }
  }

  // Confirm archive from dialog
  async function handleConfirmArchive() {
    if (!deleteConfirmItem) return;
    setIsDeleting(true);
    try {
      const archived = await archiveInventoryItem(deleteConfirmItem.id);
      setInventory((inventory ?? []).map((i) => (i.id === deleteConfirmItem.id ? archived : i)));
      setIsEditOpen(null);
      setDeleteConfirmItem(null);
      toast.success("Item archived successfully");
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Failed to archive item");
    } finally {
      setIsDeleting(false);
    }
  }

  // Confirm permanent delete from dialog
  async function handleConfirmPermanentDelete() {
    if (!deleteConfirmItem) return;
    setIsDeleting(true);
    try {
      await permanentlyDeleteInventoryItem(deleteConfirmItem.id);
      setInventory((inventory ?? []).filter((i) => i.id !== deleteConfirmItem.id));
      setIsEditOpen(null);
      setDeleteConfirmItem(null);
      toast.success("Item permanently deleted");
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Failed to permanently delete item");
    } finally {
      setIsDeleting(false);
    }
  }

  // Open delete confirmation dialog
  function openDeleteConfirmation(item: InventoryItem) {
    setDeleteConfirmItem(item);
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

  // Excel/CSV import handler
  // Expected column order: Photo, Name, Brand, Category, Sub Category, Quantity, Price, Supplier, Location, Description
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

          // Map Excel/CSV columns to inventory fields (case-insensitive)
          // Expected order: Photo, Name, Brand, Category, Sub Category, Quantity, Price, Supplier, Location, Description
          const photoUrl = row.Photo || row.photo || row.PHOTO || row["Photo URL"] || row.photoUrl || "";
          const name = row.Name || row.name || row.NAME;
          const brand = row.Brand || row.brand || row.BRAND || "Unknown";
          const category = row.Category || row.category || row.CATEGORY;
          const subcategory = row["Sub Category"] || row.Subcategory || row.subcategory || row["SubCategory"] || row.SUBCATEGORY || "";
          const quantity = Number(row.Quantity || row.quantity || row.QUANTITY || 0);
          const pricePerPiece = Number(row.Price || row.price || row.PRICE || row["Price Per Piece"] || row.pricePerPiece || 0);
          const supplier = row.Supplier || row.supplier || row.SUPPLIER || row["Supplier ID"] || row.supplierId || "";
          const location = row.Location || row.location || row.LOCATION || "";
          const description = row.Description || row.description || row.DESCRIPTION || "";

          // Auto-populate quantityPurchased = quantity (imported items are assumed to be already purchased)
          // quantitySold remains 0 for newly imported items
          const quantityPurchased = quantity;
          const quantitySold = 0;

          // Validate required fields
          if (!name) {
            errors.push(`Row ${rowNum}: Name is required`);
            return;
          }

          // Validate category (allow any category since we support custom categories)
          if (!category) {
            errors.push(`Row ${rowNum}: Category is required`);
            return;
          }

          if (quantity < 0) {
            errors.push(`Row ${rowNum}: Quantity cannot be negative`);
            return;
          }

          if (pricePerPiece < 0) {
            errors.push(`Row ${rowNum}: Price cannot be negative`);
            return;
          }

          validItems.push({
            name,
            category: category as InventoryCategory,
            subcategory: subcategory || undefined,
            quantity,
            location: location.trim(), // Parse location from import file
            brand,
            pricePerPiece,
            supplierId: supplier, // Store supplier name - will be resolved during import
            quantityPurchased,
            quantitySold,
            reorderRequired: false,
            photoUrl: photoUrl || undefined,
            description: description || undefined,
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
      // Build a map of existing suppliers by name (case-insensitive) for quick lookup
      const existingSuppliersByName = new Map<string, Supplier>();
      suppliers?.forEach(s => {
        existingSuppliersByName.set(s.name.toLowerCase().trim(), s);
      });

      // Track newly created suppliers during this import
      const newlyCreatedSuppliers = new Map<string, Supplier>();
      let suppliersCreatedCount = 0;

      // Track all items (existing + newly created) for location generation
      let allItemsForLocation = [...inventoryItems];

      const createdItems: InventoryItem[] = [];
      for (const item of importData) {
        // Auto-assign location based on category if empty
        let itemLocation = item.location?.trim() || "";
        if (!itemLocation && item.category) {
          // Generate location code based on category
          itemLocation = generateLocationCode(item.category, allItemsForLocation);
        } else if (!itemLocation) {
          itemLocation = "UNASSIGNED";
        }

        // Auto-create supplier if needed
        let supplierId = "";
        const supplierNameFromImport = (item.supplierId || "").trim();

        if (supplierNameFromImport) {
          // Check if it's already a valid supplier ID (existing supplier)
          const existingById = suppliers?.find(s => s.id === supplierNameFromImport);
          if (existingById) {
            supplierId = existingById.id;
          } else {
            // Check if supplier exists by name (case-insensitive)
            const existingByName = existingSuppliersByName.get(supplierNameFromImport.toLowerCase());
            if (existingByName) {
              supplierId = existingByName.id;
            } else {
              // Check if we already created this supplier in this import batch
              const alreadyCreated = newlyCreatedSuppliers.get(supplierNameFromImport.toLowerCase());
              if (alreadyCreated) {
                supplierId = alreadyCreated.id;
              } else {
                // Auto-create the supplier with minimal info
                try {
                  const newSupplier = await createFirebaseSupplier({
                    name: supplierNameFromImport,
                    contact: "",
                    email: "",
                    phone: "",
                    category: "Imported",
                    status: "Active",
                  });
                  supplierId = newSupplier.id;
                  newlyCreatedSuppliers.set(supplierNameFromImport.toLowerCase(), newSupplier);
                  existingSuppliersByName.set(supplierNameFromImport.toLowerCase(), newSupplier);
                  suppliersCreatedCount++;
                } catch (err) {
                  // If supplier creation fails, continue without supplier
                  console.warn(`Failed to create supplier "${supplierNameFromImport}":`, err);
                  supplierId = "";
                }
              }
            }
          }
        }

        // quantityPurchased is already set to quantity in handleFileSelect
        // quantitySold is already set to 0 in handleFileSelect
        const created = await createInventoryItem({
          name: item.name!,
          category: item.category!,
          subcategory: item.subcategory,
          quantity: item.quantity ?? 0,
          location: itemLocation,
          brand: item.brand ?? "Unknown",
          pricePerPiece: item.pricePerPiece ?? 0,
          supplierId: supplierId,
          quantityPurchased: item.quantityPurchased ?? item.quantity ?? 0, // Default to quantity if not set
          quantitySold: item.quantitySold ?? 0,
          reorderRequired: item.reorderRequired ?? false,
          photoUrl: item.photoUrl,
          description: item.description,
        });
        createdItems.push(created);
        // Add to tracking array so subsequent imports get unique locations
        allItemsForLocation.push(created);
      }

      // Update suppliers context with newly created suppliers
      if (newlyCreatedSuppliers.size > 0) {
        const newSuppliersList = Array.from(newlyCreatedSuppliers.values());
        setSuppliers((prev: Supplier[] | null) => [...newSuppliersList, ...(prev ?? [])]);
      }

      setInventory([...createdItems, ...(inventory ?? [])]);

      // Show success message with details
      let successMessage = `Successfully imported ${createdItems.length} items`;
      if (suppliersCreatedCount > 0) {
        successMessage += ` and created ${suppliersCreatedCount} new supplier${suppliersCreatedCount > 1 ? 's' : ''}`;
      }
      toast.success(successMessage);

      setIsImportDialogOpen(false);
      setImportData([]);
      setImportErrors([]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to import items");
    } finally {
      setIsImporting(false);
    }
  }, [importData, inventory, setInventory, suppliers, setSuppliers]);

  // Photo upload handler - uploads to Cloudinary
  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured()) {
      toast.error("Cloudinary is not configured. Please update your cloud name in src/services/cloudinary.ts");
      return;
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPG, PNG, GIF, or WebP images.");
      return;
    }

    setIsUploadingPhoto(true);

    try {
      // Upload to Cloudinary
      const imageUrl = await uploadImage(file, "wms-products");
      setForm(prev => ({ ...prev, photoUrl: imageUrl }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
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
      case "Overstock":
        return "bg-blue-500/10 text-blue-700";
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

  // Bulk archive handler
  const handleBulkArchive = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds) as string[];
      const result = await bulkArchiveInventoryItems(ids);

      // Update local state
      setInventory((prev) => {
        if (!prev) return prev;
        return prev.map((item) => {
          if (ids.includes(item.id)) {
            return { ...item, archived: true, archivedAt: new Date().toISOString() };
          }
          return item;
        });
      });

      if (result.failedCount > 0) {
        toast.warning(`Archived ${result.successCount} items. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully archived ${result.successCount} item${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to archive items");
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  }, [selectedIds, setInventory, deselectAll]);

  // Bulk restore handler
  const handleBulkRestore = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds) as string[];
      const result = await bulkRestoreInventoryItems(ids);

      // Update local state
      setInventory((prev) => {
        if (!prev) return prev;
        return prev.map((item) => {
          if (ids.includes(item.id)) {
            return { ...item, archived: false, archivedAt: undefined };
          }
          return item;
        });
      });

      if (result.failedCount > 0) {
        toast.warning(`Restored ${result.successCount} items. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully restored ${result.successCount} item${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to restore items");
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedIds, setInventory, deselectAll]);

  // Bulk permanent delete handler
  const handleBulkPermanentDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds) as string[];
      const result = await bulkPermanentlyDeleteInventoryItems(ids);

      // Update local state - remove deleted items
      setInventory((prev) => prev?.filter((item) => !ids.includes(item.id)) ?? []);

      if (result.failedCount > 0) {
        toast.warning(`Permanently deleted ${result.successCount} items. ${result.failedCount} failed.`);
      } else {
        toast.success(`Permanently deleted ${result.successCount} item${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to permanently delete items");
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
        case "reorderRequired":
          updates = { reorderRequired: value === "true" };
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
          options: categoryNames.map(c => ({ value: c, label: c })),
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
      case "reorderRequired":
        return {
          type: "select",
          label: "Reorder Required",
          placeholder: "Select option",
          options: [
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ],
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

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">Track and manage warehouse stock levels, item locations, and product information</p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryStats.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {inventoryStats.totalQuantity.toLocaleString()} units in stock
            </p>
          </CardContent>
        </Card>

        {/* Total Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(inventoryStats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Avg {formatCurrency(inventoryStats.totalItems > 0 ? inventoryStats.totalValue / inventoryStats.totalItems : 0)}/item
            </p>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{inventoryStats.lowStockCount + inventoryStats.criticalCount}</div>
            <p className="text-xs text-muted-foreground">
              {inventoryStats.criticalCount} critical, {inventoryStats.lowStockCount} low stock
            </p>
          </CardContent>
        </Card>

        {/* Inventory Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{inventoryStats.healthRate}%</div>
            <p className="text-xs text-muted-foreground">
              {inventoryStats.healthyItems} of {inventoryStats.totalItems} items healthy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4 border-l-emerald-500",
            filterStatus === "In Stock" && "ring-2 ring-emerald-500"
          )}
          onClick={() => setFilterStatus(filterStatus === "In Stock" ? "all" : "In Stock")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">In Stock</p>
                <p className="text-xl font-bold mt-1">{inventoryStats.inStockCount}</p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200">
                ✓
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4 border-l-amber-500",
            filterStatus === "Low Stock" && "ring-2 ring-amber-500"
          )}
          onClick={() => setFilterStatus(filterStatus === "Low Stock" ? "all" : "Low Stock")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Low Stock</p>
                <p className="text-xl font-bold mt-1">{inventoryStats.lowStockCount}</p>
              </div>
              <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200">
                ⚠
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4 border-l-red-500",
            filterStatus === "Critical" && "ring-2 ring-red-500"
          )}
          onClick={() => setFilterStatus(filterStatus === "Critical" ? "all" : "Critical")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Critical</p>
                <p className="text-xl font-bold mt-1">{inventoryStats.criticalCount}</p>
              </div>
              <Badge variant="outline" className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-200">
                ⚠
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4 border-l-purple-500",
            filterStatus === "Overstock" && "ring-2 ring-purple-500"
          )}
          onClick={() => setFilterStatus(filterStatus === "Overstock" ? "all" : "Overstock")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overstock</p>
                <p className="text-xl font-bold mt-1">{inventoryStats.overstockCount}</p>
              </div>
              <Badge variant="outline" className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200">
                📦
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>Manage your warehouse inventory items and stock levels</CardDescription>
            </div>
            <div className="flex gap-2">
              {/* Import from Excel/CSV Button */}
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

                    {/* Category & Subcategory Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="category">Category</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setIsAddCategoryOpen(true)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        <Select value={form.category} onValueChange={(v) => {
                          handleCategoryChange(v as InventoryCategory, false);
                          setForm(prev => ({ ...prev, subcategory: "" }));
                          clearFieldError("category");
                        }}>
                          <SelectTrigger id="category" className={fieldErrors.category ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryNames.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldErrors.category && <p className="text-sm text-red-500">{fieldErrors.category}</p>}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="subcategory">Subcategory</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              setSelectedCategoryForSubcategory(form.category);
                              setIsAddSubcategoryOpen(true);
                            }}
                            disabled={!form.category}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        <Select
                          value={form.subcategory}
                          onValueChange={(v) => setForm(prev => ({ ...prev, subcategory: v }))}
                          disabled={availableSubcategories.length === 0}
                        >
                          <SelectTrigger id="subcategory">
                            <SelectValue placeholder={availableSubcategories.length === 0 ? "No subcategories" : "Select subcategory"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSubcategories.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Brand Row */}
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
                            setForm({ ...form, quantity: e.target.value });
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
                            setForm({ ...form, pricePerPiece: e.target.value });
                            clearFieldError("pricePerPiece");
                          }}
                          className={fieldErrors.pricePerPiece ? "border-red-500" : ""}
                        />
                        {fieldErrors.pricePerPiece && <p className="text-sm text-red-500">{fieldErrors.pricePerPiece}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supplier">Supplier</Label>
                        <div className="flex gap-2">
                          <Select value={form.supplierId} onValueChange={(v) => {
                            setForm({ ...form, supplierId: v });
                            clearFieldError("supplierId");
                          }}>
                            <SelectTrigger id="supplier" className={cn("flex-1", fieldErrors.supplierId ? "border-red-500" : "")}>
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers?.filter(s => s.status === "Active").map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Dialog open={isAddSupplierOpen} onOpenChange={(open) => {
                            setIsAddSupplierOpen(open);
                            if (!open) resetSupplierForm();
                          }}>
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline" size="icon" title="Add New Supplier">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Add New Supplier</DialogTitle>
                                <DialogDescription>Create a new supplier to use for this inventory item.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="new-supplier-name">Company Name <span className="text-red-500">*</span></Label>
                                  <Input
                                    id="new-supplier-name"
                                    placeholder="Enter company name"
                                    value={supplierForm.name}
                                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="new-supplier-contact">Contact Person <span className="text-red-500">*</span></Label>
                                  <Input
                                    id="new-supplier-contact"
                                    placeholder="Enter contact name"
                                    value={supplierForm.contact}
                                    onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="new-supplier-email">Email <span className="text-red-500">*</span></Label>
                                  <Input
                                    id="new-supplier-email"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={supplierForm.email}
                                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="new-supplier-phone">Phone <span className="text-red-500">*</span></Label>
                                  <Input
                                    id="new-supplier-phone"
                                    placeholder="+1 (555) 000-0000"
                                    value={supplierForm.phone}
                                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="new-supplier-category">Category <span className="text-red-500">*</span></Label>
                                  <Input
                                    id="new-supplier-category"
                                    placeholder="e.g., Electronics"
                                    value={supplierForm.category}
                                    onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleCreateSupplier} disabled={isCreatingSupplier}>
                                  {isCreatingSupplier ? "Creating..." : "Create Supplier"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        {fieldErrors.supplierId && <p className="text-sm text-red-500">{fieldErrors.supplierId}</p>}
                      </div>
                    </div>

                    {/* Stock Management Section */}
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="text-sm font-medium text-muted-foreground">Stock Management</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="quantityPurchased">Quantity Purchased</Label>
                          <Input
                            id="quantityPurchased"
                            type="number"
                            placeholder="0"
                            value={form.quantityPurchased}
                            disabled
                            className="bg-muted cursor-not-allowed"
                            title="This field is calculated from purchase orders"
                          />
                          <p className="text-xs text-muted-foreground">Auto-calculated from purchase orders</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quantitySold">Quantity Sold</Label>
                          <Input
                            id="quantitySold"
                            type="number"
                            placeholder="0"
                            value={form.quantitySold}
                            disabled
                            className="bg-muted cursor-not-allowed"
                            title="This field is calculated from sales orders"
                          />
                          <p className="text-xs text-muted-foreground">Auto-calculated from sales orders</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reorderLevel">Reorder Level</Label>
                          <Input
                            id="reorderLevel"
                            type="number"
                            placeholder="e.g., 10"
                            min="0"
                            value={form.reorderLevel ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setForm({ ...form, reorderLevel: val === "" ? undefined : val });
                            }}
                          />
                          <p className="text-xs text-muted-foreground">Auto-triggers reorder when quantity falls below this level</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reorderRequired">Reorder Required</Label>
                          <Select
                            value={form.reorderRequired ? "true" : "false"}
                            onValueChange={(value) => {
                              setForm({ ...form, reorderRequired: value === "true" });
                            }}
                          >
                            <SelectTrigger id="reorderRequired">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">No</SelectItem>
                              <SelectItem value="true">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Product Photo Section */}
                    <div className="space-y-2 border-t pt-4">
                      <Label htmlFor="photo">Product Photo</Label>
                      <div className="flex items-center gap-4">
                        {isUploadingPhoto ? (
                          <div className="h-20 w-20 rounded-md border border-dashed flex items-center justify-center text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : form.photoUrl ? (
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
                            disabled={isUploadingPhoto}
                          >
                            {isUploadingPhoto ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
                          </Button>
                          <p className="text-xs text-muted-foreground">Uploads to Cloudinary. Max 10MB.</p>
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
            <Select value={filterCategory} onValueChange={(v) => {
              setFilterCategory(v);
              setFilterSubcategory("all");
            }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryNames.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterSubcategoryOptions.length > 0 && (
              <Select value={filterSubcategory} onValueChange={setFilterSubcategory}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Subcategory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {filterSubcategoryOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
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
            {(searchTerm || filterCategory !== "all" || filterStatus !== "all" || showFavoritesOnly || showArchived) && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="rounded-r-none"
                title="Table View"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "catalog" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("catalog")}
                className="rounded-l-none"
                title="Catalog View"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            {/* Column Visibility (Table View Only) */}
            {viewMode === "table" && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-all h-8 px-3 border bg-background text-foreground hover:bg-accent hover:text-accent-foreground">
                  <Settings2 className="h-4 w-4" />
                  Columns
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {OPTIONAL_COLUMNS.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.key}
                      checked={isColumnVisible(column.key)}
                      onCheckedChange={() => toggleColumnVisibility(column.key)}
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
                  id: "delete",
                  label: "Delete",
                  icon: <Trash2 className="h-4 w-4 mr-1" />,
                  variant: "destructive" as const,
                  onClick: () => setShowBulkDeleteDialog(true),
                },
              ]}
              actionGroups={showArchived ? [] : [
                {
                  id: "bulk-update",
                  label: "Bulk Update",
                  icon: <Edit className="h-4 w-4 mr-1" />,
                  options: [
                    { value: "category", label: "Update Category" },
                    { value: "status", label: "Update Status" },
                    { value: "location", label: "Update Location" },
                    { value: "reorderRequired", label: "Update Reorder Required" },
                    { value: "supplier", label: "Update Supplier" },
                  ],
                  onSelect: (value) => setBulkUpdateType(value as "category" | "status" | "location" | "reorderRequired" | "supplier"),
                },
              ]}
              className="mb-4"
            />
          )}

          {/* Bulk Delete/Archive Dialog - Two-tier for active items, single option for archived */}
          <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Delete {selectionCount} Item{selectionCount !== 1 ? "s" : ""}
                </DialogTitle>
                <DialogDescription>
                  {showArchived
                    ? "These items are already archived. This action will permanently remove them from the system."
                    : "Choose how you want to delete the selected items:"}
                </DialogDescription>
              </DialogHeader>

              {/* Show selected item names */}
              {selectedItemNames.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/50">
                  <ul className="text-sm space-y-1">
                    {selectedItemNames.slice(0, 10).map((name, idx) => (
                      <li key={idx} className="truncate">• {name}</li>
                    ))}
                    {selectedItemNames.length > 10 && (
                      <li className="text-muted-foreground">...and {selectedItemNames.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}

              {showArchived ? (
                // Archived items - only permanent delete option
                <div className="space-y-4 pt-2">
                  <div className="p-3 border border-destructive/50 rounded-md bg-destructive/10">
                    <div className="flex items-start gap-2">
                      <Trash2 className="h-4 w-4 mt-0.5 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">Permanent Deletion</p>
                        <p className="text-sm text-muted-foreground">
                          This cannot be undone. All data will be permanently removed.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)} disabled={isBulkDeleting}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleBulkPermanentDelete} disabled={isBulkDeleting}>
                      {isBulkDeleting ? "Deleting..." : "Permanently Delete All"}
                    </Button>
                  </div>
                </div>
              ) : (
                // Active items - show both options
                <div className="space-y-4 pt-2">
                  {/* Archive Option */}
                  <div className="p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-2">
                      <Archive className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">Archive</p>
                        <p className="text-sm text-muted-foreground">
                          Move to archive. Items can be restored later.
                        </p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={handleBulkArchive} disabled={isBulkDeleting}>
                        {isBulkDeleting ? "..." : "Archive"}
                      </Button>
                    </div>
                  </div>

                  {/* Permanent Delete Option */}
                  {canPermanentlyDelete && (
                    <div className="p-3 border border-destructive/50 rounded-md bg-destructive/10">
                      <div className="flex items-start gap-2">
                        <Trash2 className="h-4 w-4 mt-0.5 text-destructive" />
                        <div className="flex-1">
                          <p className="font-medium text-destructive">Delete Permanently</p>
                          <p className="text-sm text-muted-foreground">
                            Cannot be undone. Data will be permanently removed.
                          </p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={handleBulkPermanentDelete} disabled={isBulkDeleting}>
                          {isBulkDeleting ? "..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)} disabled={isBulkDeleting}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Bulk Update Dialog */}
          {bulkUpdateType && getBulkUpdateField() && (
            <BulkUpdateDialog
              open={!!bulkUpdateType}
              onOpenChange={(open) => !open && setBulkUpdateType(null)}
              title={`Update ${bulkUpdateType === "reorderRequired" ? "Reorder Required" : bulkUpdateType === "location" ? "Location" : bulkUpdateType === "category" ? "Category" : "Supplier"}`}
              description={`Set new ${bulkUpdateType === "reorderRequired" ? "reorder required status" : bulkUpdateType === "location" ? "location" : bulkUpdateType === "category" ? "category" : "supplier"} for selected items`}
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
              description={searchTerm || filterCategory !== "all" || filterStatus !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Get started by adding your first inventory item"}
              actionLabel={!searchTerm && filterCategory === "all" && filterStatus === "all" ? "Add Item" : undefined}
              onAction={!searchTerm && filterCategory === "all" && filterStatus === "all" ? () => setIsAddOpen(true) : undefined}
            />
          ) : viewMode === "catalog" ? (
            /* ============ CATALOG VIEW ============ */
            <div>
              {/* Select All Pages Banner */}
              <SelectAllBanner
                pageItemCount={pageItemCount}
                totalItemCount={totalItemCount}
                isAllPagesSelected={isAllPagesSelected}
                show={isAllPageSelected && totalItemCount > pageItemCount}
                onSelectAllPages={selectAllPages}
                onClearSelection={deselectAll}
                itemLabel="items"
              />

              {/* Catalog Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedData.map((item) => {
                  const supplierName = supplierById.get(item.supplierId) ?? (item.supplierId || 'N/A');
                  const itemIsSelected = isSelected(item.id);

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group relative bg-card rounded-lg border overflow-hidden transition-all hover:shadow-lg hover:border-primary/50",
                        itemIsSelected && "ring-2 ring-primary border-primary"
                      )}
                    >
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={itemIsSelected}
                          onCheckedChange={() => toggleItem(item.id)}
                          aria-label={`Select ${item.name}`}
                          className="bg-background/80 backdrop-blur-sm"
                        />
                      </div>

                      {/* Favorite Button */}
                      <div className="absolute top-2 right-2 z-10">
                        <FavoriteButton
                          entityType="inventory"
                          entityId={item.id}
                          entityName={item.name}
                        />
                      </div>

                      {/* Product Image */}
                      <button
                        type="button"
                        onClick={() => setIsDetailOpen(item.id)}
                        className="w-full aspect-square bg-muted flex items-center justify-center overflow-hidden cursor-pointer"
                        title="Click to view product details"
                      >
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-12 w-12 mb-2" />
                            <span className="text-xs">No image</span>
                          </div>
                        )}
                      </button>

                      {/* Product Info */}
                      <div className="p-4 space-y-3">
                        {/* Category Badge & Status */}
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                          <Badge className={cn("text-xs", getStatusColor(item.status))}>
                            {item.status}
                          </Badge>
                        </div>

                        {/* Item Name */}
                        <button
                          type="button"
                          onClick={() => setIsDetailOpen(item.id)}
                          className="text-left w-full"
                          title="Click to view product details"
                        >
                          <h3 className="font-semibold text-base line-clamp-2 min-h-[2.5rem] hover:text-primary transition-colors">
                            {item.name}
                          </h3>
                        </button>

                        {/* Price */}
                        <div className="text-lg font-bold text-primary">
                          ₱{(item.pricePerPiece ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>

                        {/* Stock & Brand */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Stock: <span className="font-medium text-foreground">{item.quantity}</span></span>
                          <span className="truncate max-w-[50%]">{item.brand || 'Unknown'}</span>
                        </div>

                        {/* Location & Supplier */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{item.location}</span>
                          </div>
                          <span className="truncate max-w-[50%]" title={supplierName}>{supplierName}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setIsDetailOpen(item.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                          {canModify && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setIsEditOpen(item.id);
                                setForm({
                                  id: item.id,
                                  name: item.name,
                                  category: item.category,
                                  subcategory: item.subcategory || "",
                                  quantity: item.quantity,
                                  location: item.location,
                                  brand: item.brand || "Unknown",
                                  pricePerPiece: item.pricePerPiece ?? 0,
                                  supplierId: item.supplierId || "SUP-001",
                                  quantityPurchased: item.quantityPurchased ?? 0,
                                  quantitySold: item.quantitySold ?? 0,
                                  reorderRequired: item.reorderRequired ?? false,
                                  reorderLevel: item.reorderLevel,
                                  photoUrl: item.photoUrl || "",
                                });
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

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
          ) : (
            /* ============ TABLE VIEW ============ */
            <div className="rounded-md border overflow-hidden">
              {/* Select All Pages Banner */}
              <SelectAllBanner
                pageItemCount={pageItemCount}
                totalItemCount={totalItemCount}
                isAllPagesSelected={isAllPagesSelected}
                show={isAllPageSelected && totalItemCount > pageItemCount}
                onSelectAllPages={selectAllPages}
                onClearSelection={deselectAll}
                itemLabel="items"
              />

              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Always visible: Checkbox */}
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
                    {/* Always visible: Photo */}
                    <TableHead className="w-16">Photo</TableHead>
                    {/* Always visible: Item ID */}
                    <SortableTableHead
                      sortKey="id"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("id")}
                      onSort={(key) => requestSort(key as keyof InventoryItem)}
                    >
                      Item ID
                    </SortableTableHead>
                    {/* Always visible: Name */}
                    <SortableTableHead
                      sortKey="name"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("name")}
                      onSort={(key) => requestSort(key as keyof InventoryItem)}
                    >
                      Name
                    </SortableTableHead>
                    {/* Optional: Category */}
                    {isColumnVisible("category") && (
                      <SortableTableHead
                        sortKey="category"
                        currentSortKey={sortConfig.key as string | null}
                        sortDirection={getSortDirection("category")}
                        onSort={(key) => requestSort(key as keyof InventoryItem)}
                      >
                        Category
                      </SortableTableHead>
                    )}
                    {/* Optional: Subcategory */}
                    {isColumnVisible("subcategory") && (
                      <SortableTableHead
                        sortKey="subcategory"
                        currentSortKey={sortConfig.key as string | null}
                        sortDirection={getSortDirection("subcategory")}
                        onSort={(key) => requestSort(key as keyof InventoryItem)}
                      >
                        Subcategory
                      </SortableTableHead>
                    )}
                    {/* Optional: Quantity Purchased */}
                    {isColumnVisible("quantityPurchased") && (
                      <SortableTableHead
                        sortKey="quantityPurchased"
                        currentSortKey={sortConfig.key as string | null}
                        sortDirection={getSortDirection("quantityPurchased")}
                        onSort={(key) => requestSort(key as keyof InventoryItem)}
                      >
                        Qty Purchased
                      </SortableTableHead>
                    )}
                    {/* Optional: Quantity Sold */}
                    {isColumnVisible("quantitySold") && (
                      <SortableTableHead
                        sortKey="quantitySold"
                        currentSortKey={sortConfig.key as string | null}
                        sortDirection={getSortDirection("quantitySold")}
                        onSort={(key) => requestSort(key as keyof InventoryItem)}
                      >
                        Qty Sold
                      </SortableTableHead>
                    )}
                    {/* Optional: Remaining Quantity */}
                    {isColumnVisible("quantity") && (
                      <SortableTableHead
                        sortKey="quantity"
                        currentSortKey={sortConfig.key as string | null}
                        sortDirection={getSortDirection("quantity")}
                        onSort={(key) => requestSort(key as keyof InventoryItem)}
                      >
                        Remaining
                      </SortableTableHead>
                    )}
                    {/* Optional: Reorder Required */}
                    {isColumnVisible("reorderRequired") && (
                      <SortableTableHead
                        sortKey="reorderRequired"
                        currentSortKey={sortConfig.key as string | null}
                        sortDirection={getSortDirection("reorderRequired")}
                        onSort={(key) => requestSort(key as keyof InventoryItem)}
                      >
                        Reorder
                      </SortableTableHead>
                    )}
                    {/* Optional: Price */}
                    {isColumnVisible("pricePerPiece") && (
                      <SortableTableHead
                        sortKey="pricePerPiece"
                        currentSortKey={sortConfig.key as string | null}
                        sortDirection={getSortDirection("pricePerPiece")}
                        onSort={(key) => requestSort(key as keyof InventoryItem)}
                      >
                        Price
                      </SortableTableHead>
                    )}
                    {/* Optional: Supplier */}
                    {isColumnVisible("supplier") && (
                      <TableHead>Supplier</TableHead>
                    )}
                    {/* Optional: Brand */}
                    {isColumnVisible("brand") && (
                      <SortableTableHead
                        sortKey="brand"
                        currentSortKey={sortConfig.key as string | null}
                        sortDirection={getSortDirection("brand")}
                        onSort={(key) => requestSort(key as keyof InventoryItem)}
                      >
                        Brand
                      </SortableTableHead>
                    )}
                    {/* Optional: Location */}
                    {isColumnVisible("location") && (
                      <SortableTableHead
                        sortKey="location"
                        currentSortKey={sortConfig.key as string | null}
                        sortDirection={getSortDirection("location")}
                        onSort={(key) => requestSort(key as keyof InventoryItem)}
                      >
                        Location
                      </SortableTableHead>
                    )}
                    {/* Optional: Status */}
                    {isColumnVisible("status") && (
                      <SortableTableHead
                        sortKey="status"
                        currentSortKey={sortConfig.key as string | null}
                        sortDirection={getSortDirection("status")}
                        onSort={(key) => requestSort(key as keyof InventoryItem)}
                      >
                        Status
                      </SortableTableHead>
                    )}
                    {/* Always visible: Actions */}
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
                        {/* Always visible: Checkbox */}
                        <TableCell>
                          <Checkbox
                            checked={itemIsSelected}
                            onCheckedChange={() => toggleItem(item.id)}
                            aria-label={`Select ${item.name}`}
                          />
                        </TableCell>
                        {/* Always visible: Photo */}
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
                        {/* Always visible: Item ID */}
                        <TableCell>{item.id}</TableCell>
                        {/* Always visible: Name */}
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => setIsDetailOpen(item.id)}
                            className="text-left hover:text-primary hover:underline cursor-pointer font-medium transition-colors"
                            title="Click to view product details"
                          >
                            {item.name}
                          </button>
                        </TableCell>
                        {/* Optional: Category */}
                        {isColumnVisible("category") && (
                          <TableCell>
                            <EditableCell
                              value={item.category}
                              type="select"
                              options={categoryNames.map(c => ({ value: c, label: c }))}
                              onSave={(v) => handleInlineUpdate(item.id, "category", v)}
                              disabled={!canModify}
                            />
                          </TableCell>
                        )}
                        {/* Optional: Subcategory */}
                        {isColumnVisible("subcategory") && (
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {item.subcategory || "-"}
                            </span>
                          </TableCell>
                        )}
                        {/* Optional: Quantity Purchased (read-only, calculated from purchase orders) */}
                        {isColumnVisible("quantityPurchased") && (
                          <TableCell>
                            <span className="text-sm text-muted-foreground" title="Auto-calculated from purchase orders">
                              {item.quantityPurchased ?? 0}
                            </span>
                          </TableCell>
                        )}
                        {/* Optional: Quantity Sold (read-only, calculated from sales orders) */}
                        {isColumnVisible("quantitySold") && (
                          <TableCell>
                            <span className="text-sm text-muted-foreground" title="Auto-calculated from sales orders">
                              {item.quantitySold ?? 0}
                            </span>
                          </TableCell>
                        )}
                        {/* Optional: Remaining Quantity */}
                        {isColumnVisible("quantity") && (
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
                        )}
                        {/* Optional: Reorder Required */}
                        {isColumnVisible("reorderRequired") && (
                          <TableCell>
                            <Badge variant={item.reorderRequired ? "destructive" : "secondary"}>
                              {item.reorderRequired ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                        )}
                        {/* Optional: Price */}
                        {isColumnVisible("pricePerPiece") && (
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
                        )}
                        {/* Optional: Supplier */}
                        {isColumnVisible("supplier") && (
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
                        )}
                        {/* Optional: Brand */}
                        {isColumnVisible("brand") && (
                          <TableCell>
                            <EditableCell
                              value={item.brand || 'Unknown'}
                              type="text"
                              onSave={(v) => handleInlineUpdate(item.id, "brand", v)}
                              disabled={!canModify}
                            />
                          </TableCell>
                        )}
                        {/* Optional: Location */}
                        {isColumnVisible("location") && (
                          <TableCell>
                            <EditableCell
                              value={item.location}
                              type="text"
                              onSave={(v) => handleInlineUpdate(item.id, "location", v)}
                              disabled={!canModify}
                            />
                          </TableCell>
                        )}
                        {/* Optional: Status */}
                        {isColumnVisible("status") && (
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
                        )}
                        {/* Always visible: Actions */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FavoriteButton
                              entityType="inventory"
                              entityId={item.id}
                              entityName={item.name}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsDetailOpen(item.id)}
                              title="View product details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          <Dialog open={isEditOpen === item.id} onOpenChange={(o: boolean) => {
                            setIsEditOpen(o ? item.id : null);
                            if (o) setForm({
                              id: item.id,
                              name: item.name,
                              category: item.category,
                              subcategory: item.subcategory || "",
                              quantity: item.quantity,
                              location: item.location,
                              brand: item.brand || "Unknown",
                              pricePerPiece: item.pricePerPiece ?? 0,
                              supplierId: item.supplierId || "SUP-001",
                              quantityPurchased: item.quantityPurchased ?? 0,
                              quantitySold: item.quantitySold ?? 0,
                              reorderRequired: item.reorderRequired ?? false,
                              reorderLevel: item.reorderLevel,
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

                                {/* Category & Subcategory Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label htmlFor="edit-category">Category</Label>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => setIsAddCategoryOpen(true)}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add
                                      </Button>
                                    </div>
                                    <Select value={form.category} onValueChange={(v) => {
                                      setForm({ ...form, category: v as InventoryCategory, subcategory: "" });
                                    }}>
                                      <SelectTrigger id="edit-category">
                                        <SelectValue placeholder="Select category" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {categoryNames.map((c) => (
                                          <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label htmlFor="edit-subcategory">Subcategory</Label>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => {
                                          setSelectedCategoryForSubcategory(form.category);
                                          setIsAddSubcategoryOpen(true);
                                        }}
                                        disabled={!form.category}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add
                                      </Button>
                                    </div>
                                    <Select
                                      value={form.subcategory}
                                      onValueChange={(v) => setForm({ ...form, subcategory: v })}
                                      disabled={availableSubcategories.length === 0}
                                    >
                                      <SelectTrigger id="edit-subcategory">
                                        <SelectValue placeholder={availableSubcategories.length === 0 ? "No subcategories" : "Select subcategory"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableSubcategories.map((s) => (
                                          <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* Brand Row */}
                                <div className="space-y-2">
                                  <Label htmlFor="edit-brand">Brand</Label>
                                  <Input id="edit-brand" placeholder="Enter brand name" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                                </div>

                                {/* Quantity & Location Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-quantity">Quantity</Label>
                                    <Input id="edit-quantity" type="number" placeholder="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
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
                                    <Input id="edit-price" type="number" step="0.01" placeholder="0.00" value={form.pricePerPiece} onChange={(e) => setForm({ ...form, pricePerPiece: e.target.value })} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-supplier">Supplier</Label>
                                    <div className="flex gap-2">
                                      <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                                        <SelectTrigger id="edit-supplier" className="flex-1">
                                          <SelectValue placeholder="Select supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {suppliers?.filter(s => s.status === "Active").map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Dialog open={isAddSupplierOpen} onOpenChange={(open) => {
                                        setIsAddSupplierOpen(open);
                                        if (!open) resetSupplierForm();
                                      }}>
                                        <DialogTrigger asChild>
                                          <Button type="button" variant="outline" size="icon" title="Add New Supplier">
                                            <Plus className="h-4 w-4" />
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md">
                                          <DialogHeader>
                                            <DialogTitle>Add New Supplier</DialogTitle>
                                            <DialogDescription>Create a new supplier to use for this inventory item.</DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                              <Label htmlFor="edit-new-supplier-name">Company Name <span className="text-red-500">*</span></Label>
                                              <Input
                                                id="edit-new-supplier-name"
                                                placeholder="Enter company name"
                                                value={supplierForm.name}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label htmlFor="edit-new-supplier-contact">Contact Person <span className="text-red-500">*</span></Label>
                                              <Input
                                                id="edit-new-supplier-contact"
                                                placeholder="Enter contact name"
                                                value={supplierForm.contact}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label htmlFor="edit-new-supplier-email">Email <span className="text-red-500">*</span></Label>
                                              <Input
                                                id="edit-new-supplier-email"
                                                type="email"
                                                placeholder="email@example.com"
                                                value={supplierForm.email}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label htmlFor="edit-new-supplier-phone">Phone <span className="text-red-500">*</span></Label>
                                              <Input
                                                id="edit-new-supplier-phone"
                                                placeholder="+1 (555) 000-0000"
                                                value={supplierForm.phone}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label htmlFor="edit-new-supplier-category">Category <span className="text-red-500">*</span></Label>
                                              <Input
                                                id="edit-new-supplier-category"
                                                placeholder="e.g., Electronics"
                                                value={supplierForm.category}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                                              />
                                            </div>
                                          </div>
                                          <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>
                                              Cancel
                                            </Button>
                                            <Button onClick={handleCreateSupplier} disabled={isCreatingSupplier}>
                                              {isCreatingSupplier ? "Creating..." : "Create Supplier"}
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  </div>
                                </div>

                                {/* Stock Management Section */}
                                <div className="space-y-4 border-t pt-4">
                                  <h4 className="text-sm font-medium text-muted-foreground">Stock Management</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-quantityPurchased">Quantity Purchased</Label>
                                      <Input id="edit-quantityPurchased" type="number" placeholder="0" value={form.quantityPurchased} disabled className="bg-muted cursor-not-allowed" title="This field is calculated from purchase orders" />
                                      <p className="text-xs text-muted-foreground">Auto-calculated from purchase orders</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-quantitySold">Quantity Sold</Label>
                                      <Input id="edit-quantitySold" type="number" placeholder="0" value={form.quantitySold} disabled className="bg-muted cursor-not-allowed" title="This field is calculated from sales orders" />
                                      <p className="text-xs text-muted-foreground">Auto-calculated from sales orders</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-reorderLevel">Reorder Level</Label>
                                      <Input id="edit-reorderLevel" type="number" placeholder="e.g., 10" min="0" value={form.reorderLevel ?? ""} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value === "" ? undefined : e.target.value })} />
                                      <p className="text-xs text-muted-foreground">Auto-triggers reorder when quantity falls below this level</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-reorderRequired">Reorder Required</Label>
                                      <Select
                                        value={form.reorderRequired ? "true" : "false"}
                                        onValueChange={(value) => setForm({ ...form, reorderRequired: value === "true" })}
                                      >
                                        <SelectTrigger id="edit-reorderRequired">
                                          <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="false">No</SelectItem>
                                          <SelectItem value="true">Yes</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </div>

                                {/* Product Photo Section */}
                                <div className="space-y-2 border-t pt-4">
                                  <Label htmlFor="edit-photo">Product Photo</Label>
                                  <div className="flex items-center gap-4">
                                    {isUploadingPhoto ? (
                                      <div className="h-20 w-20 rounded-md border border-dashed flex items-center justify-center text-muted-foreground">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                      </div>
                                    ) : form.photoUrl ? (
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
                                        disabled={isUploadingPhoto}
                                      >
                                        {isUploadingPhoto ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Upload className="h-4 w-4 mr-2" />
                                        )}
                                        {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
                                      </Button>
                                      <p className="text-xs text-muted-foreground">Uploads to Cloudinary. Max 10MB.</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                  <Button className="flex-1" size="lg" onClick={handleEditSave}>Save Changes</Button>
                                  {item.archived ? (
                                    <Button variant="outline" size="lg" onClick={() => handleRestore(item.id)}>
                                      <ArchiveRestore className="h-4 w-4 mr-2" />
                                      Restore
                                    </Button>
                                  ) : null}
                                  <Button variant="destructive" size="lg" onClick={() => openDeleteConfirmation(item)}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
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
        <DialogContent className="max-w-5xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Preview
            </DialogTitle>
            <DialogDescription>
              Review the data before importing. {importData.length} items will be added.
              <br />
              <span className="text-xs text-muted-foreground">
                Note: Quantity Purchased is automatically set to match Quantity for imported items.
              </span>
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
                  <TableHead className="w-[50px]">Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Sub Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Supplier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt="" className="h-8 w-8 object-cover rounded" />
                      ) : (
                        <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.brand || "Unknown"}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.subcategory || "-"}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">₱{(item.pricePerPiece ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{item.supplierId || "-"}</TableCell>
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

      {/* Product Detail Dialog - Read-Only View */}
      {isDetailOpen && (() => {
        const item = inventoryItems.find((i) => i.id === isDetailOpen);
        const supplierName = item ? (supplierById.get(item.supplierId) ?? item.supplierId ?? "N/A") : "N/A";

        if (!item) return null;

        return (
          <Dialog open={!!isDetailOpen} onOpenChange={(open) => !open && setIsDetailOpen(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {item.name}
                </DialogTitle>
                <DialogDescription>
                  Product ID: {item.id}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Product Image */}
                {item.photoUrl && (
                  <div className="flex justify-center">
                    <div className="relative w-full max-w-md h-48 rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Description - Prominently displayed */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Description
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm leading-relaxed">
                      {item.description || "No description available for this product."}
                    </p>
                  </div>
                </div>

                {/* Product Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* SKU/ID */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Hash className="h-4 w-4" />
                      SKU
                    </div>
                    <p className="text-sm font-mono">{item.id}</p>
                  </div>

                  {/* Brand */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Tag className="h-4 w-4" />
                      Brand
                    </div>
                    <p className="text-sm">{item.brand || "Unknown"}</p>
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Package className="h-4 w-4" />
                      Category
                    </div>
                    <Badge variant="secondary">{item.category}</Badge>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      Status
                    </div>
                    <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Boxes className="h-4 w-4" />
                      Quantity
                    </div>
                    <p className="text-sm font-semibold">{item.quantity} units</p>
                  </div>

                  {/* Price */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      Price per Piece
                    </div>
                    <p className="text-sm font-semibold">₱{(item.pricePerPiece ?? 0).toFixed(2)}</p>
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Warehouse className="h-4 w-4" />
                      Location
                    </div>
                    <p className="text-sm">{item.location}</p>
                  </div>

                  {/* Supplier */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Supplier
                    </div>
                    <p className="text-sm">{supplierName}</p>
                  </div>
                </div>

                {/* Stock Levels */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Stock Levels
                  </h4>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">Qty Purchased</p>
                      <p className="text-lg font-semibold">{item.quantityPurchased ?? 0}</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">Qty Sold</p>
                      <p className="text-lg font-semibold">{item.quantitySold ?? 0}</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-lg font-semibold text-primary">{item.quantity}</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">Reorder Required</p>
                      <Badge variant={item.reorderRequired ? "destructive" : "secondary"} className="mt-1">
                        {item.reorderRequired ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Total Value */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-sm font-medium">Total Inventory Value</span>
                  <span className="text-lg font-bold text-primary">
                    ₱{((item.pricePerPiece ?? 0) * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailOpen(null)}>
                  Close
                </Button>
                {canModify && (
                  <Button onClick={() => {
                    setIsDetailOpen(null);
                    setForm({
                      id: item.id,
                      name: item.name,
                      category: item.category,
                      subcategory: item.subcategory || "",
                      quantity: item.quantity,
                      location: item.location,
                      brand: item.brand || "Unknown",
                      pricePerPiece: item.pricePerPiece ?? 0,
                      supplierId: item.supplierId || "SUP-001",
                      quantityPurchased: item.quantityPurchased ?? 0,
                      quantitySold: item.quantitySold ?? 0,
                      reorderRequired: item.reorderRequired ?? false,
                      reorderLevel: item.reorderLevel,
                      photoUrl: item.photoUrl || "",
                    });
                    setIsEditOpen(item.id);
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Product
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

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

      {/* Standalone Edit Dialog - Used by Catalog View */}
      {viewMode === "catalog" && isEditOpen && (
        <Dialog open={!!isEditOpen} onOpenChange={(o) => setIsEditOpen(o ? isEditOpen : null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
              <DialogDescription>Update fields and save your changes.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Item Name - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="catalog-edit-name">Item Name</Label>
                <Input id="catalog-edit-name" placeholder="Enter item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              {/* Category & Subcategory Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="catalog-edit-category">Category</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setIsAddCategoryOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  <Select value={form.category} onValueChange={(v) => {
                    setForm({ ...form, category: v as InventoryCategory, subcategory: "" });
                  }}>
                    <SelectTrigger id="catalog-edit-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryNames.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="catalog-edit-subcategory">Subcategory</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setSelectedCategoryForSubcategory(form.category);
                        setIsAddSubcategoryOpen(true);
                      }}
                      disabled={!form.category}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  <Select
                    value={form.subcategory}
                    onValueChange={(v) => setForm({ ...form, subcategory: v })}
                    disabled={availableSubcategories.length === 0}
                  >
                    <SelectTrigger id="catalog-edit-subcategory">
                      <SelectValue placeholder={availableSubcategories.length === 0 ? "No subcategories" : "Select subcategory"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubcategories.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Brand Row */}
              <div className="space-y-2">
                <Label htmlFor="catalog-edit-brand">Brand</Label>
                <Input id="catalog-edit-brand" placeholder="Enter brand name" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>

              {/* Quantity & Location Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="catalog-edit-quantity">Quantity</Label>
                  <Input id="catalog-edit-quantity" type="number" placeholder="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catalog-edit-location">Location</Label>
                  <Input id="catalog-edit-location" placeholder="e.g., A-12" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>

              {/* Price & Supplier Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="catalog-edit-price">Price Per Piece (PHP ₱)</Label>
                  <Input id="catalog-edit-price" type="number" step="0.01" placeholder="0.00" value={form.pricePerPiece} onChange={(e) => setForm({ ...form, pricePerPiece: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catalog-edit-supplier">Supplier</Label>
                  <div className="flex gap-2">
                    <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                      <SelectTrigger id="catalog-edit-supplier" className="flex-1">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers?.filter(s => s.status === "Active").map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Dialog open={isAddSupplierOpen} onOpenChange={(open) => {
                      setIsAddSupplierOpen(open);
                      if (!open) resetSupplierForm();
                    }}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon" title="Add New Supplier">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add New Supplier</DialogTitle>
                          <DialogDescription>Create a new supplier to use for this inventory item.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="catalog-new-supplier-name">Company Name <span className="text-red-500">*</span></Label>
                            <Input
                              id="catalog-new-supplier-name"
                              placeholder="Enter company name"
                              value={supplierForm.name}
                              onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="catalog-new-supplier-contact">Contact Person <span className="text-red-500">*</span></Label>
                            <Input
                              id="catalog-new-supplier-contact"
                              placeholder="Enter contact name"
                              value={supplierForm.contact}
                              onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="catalog-new-supplier-email">Email <span className="text-red-500">*</span></Label>
                            <Input
                              id="catalog-new-supplier-email"
                              type="email"
                              placeholder="email@example.com"
                              value={supplierForm.email}
                              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="catalog-new-supplier-phone">Phone <span className="text-red-500">*</span></Label>
                            <Input
                              id="catalog-new-supplier-phone"
                              placeholder="+1 (555) 000-0000"
                              value={supplierForm.phone}
                              onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="catalog-new-supplier-category">Category <span className="text-red-500">*</span></Label>
                            <Input
                              id="catalog-new-supplier-category"
                              placeholder="e.g., Electronics"
                              value={supplierForm.category}
                              onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateSupplier} disabled={isCreatingSupplier}>
                            {isCreatingSupplier ? "Creating..." : "Create Supplier"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              {/* Stock Management Section */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-medium text-muted-foreground">Stock Management</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="catalog-edit-quantityPurchased">Quantity Purchased</Label>
                    <Input id="catalog-edit-quantityPurchased" type="number" placeholder="0" value={form.quantityPurchased} disabled className="bg-muted cursor-not-allowed" title="This field is calculated from purchase orders" />
                    <p className="text-xs text-muted-foreground">Auto-calculated from purchase orders</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="catalog-edit-quantitySold">Quantity Sold</Label>
                    <Input id="catalog-edit-quantitySold" type="number" placeholder="0" value={form.quantitySold} disabled className="bg-muted cursor-not-allowed" title="This field is calculated from sales orders" />
                    <p className="text-xs text-muted-foreground">Auto-calculated from sales orders</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="catalog-edit-reorderLevel">Reorder Level</Label>
                    <Input id="catalog-edit-reorderLevel" type="number" placeholder="e.g., 10" min="0" value={form.reorderLevel ?? ""} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value === "" ? undefined : e.target.value })} />
                    <p className="text-xs text-muted-foreground">Auto-triggers reorder when quantity falls below this level</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="catalog-edit-reorderRequired">Reorder Required</Label>
                    <Select
                      value={form.reorderRequired ? "true" : "false"}
                      onValueChange={(value) => setForm({ ...form, reorderRequired: value === "true" })}
                    >
                      <SelectTrigger id="catalog-edit-reorderRequired">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Product Photo Section */}
              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="catalog-edit-photo">Product Photo</Label>
                <div className="flex items-center gap-4">
                  {isUploadingPhoto ? (
                    <div className="h-20 w-20 rounded-md border border-dashed flex items-center justify-center text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : form.photoUrl ? (
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
                      disabled={isUploadingPhoto}
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
                    </Button>
                    <p className="text-xs text-muted-foreground">Uploads to Cloudinary. Max 10MB.</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" size="lg" onClick={handleEditSave}>Save Changes</Button>
                {(() => {
                  const currentItem = inventoryItems.find((i) => i.id === form.id);
                  return currentItem?.archived ? (
                    <Button variant="outline" size="lg" onClick={() => handleRestore(form.id)}>
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                  ) : null;
                })()}
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={() => {
                    const currentItem = inventoryItems.find((i) => i.id === form.id);
                    if (currentItem) openDeleteConfirmation(currentItem);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={(open) => {
        setIsAddCategoryOpen(open);
        if (!open) setNewCategoryName("");
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Create a new category for inventory items.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-category-name">Category Name</Label>
              <Input
                id="new-category-name"
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!newCategoryName.trim()) {
                toast.error("Category name is required");
                return;
              }
              if (categoryNames.includes(newCategoryName.trim())) {
                toast.error("Category already exists");
                return;
              }
              const updated = await addCategory(newCategoryName.trim());
              setCategories(updated);
              toast.success(`Category "${newCategoryName.trim()}" added`);
              setNewCategoryName("");
              setIsAddCategoryOpen(false);
            }}>
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subcategory Dialog */}
      <Dialog open={isAddSubcategoryOpen} onOpenChange={(open) => {
        setIsAddSubcategoryOpen(open);
        if (!open) {
          setNewSubcategoryName("");
          setSelectedCategoryForSubcategory("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Subcategory</DialogTitle>
            <DialogDescription>Create a new subcategory within a category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subcategory-parent">Parent Category</Label>
              <Select value={selectedCategoryForSubcategory} onValueChange={setSelectedCategoryForSubcategory}>
                <SelectTrigger id="subcategory-parent">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryNames.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-subcategory-name">Subcategory Name</Label>
              <Input
                id="new-subcategory-name"
                placeholder="Enter subcategory name"
                value={newSubcategoryName}
                onChange={(e) => setNewSubcategoryName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSubcategoryOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!selectedCategoryForSubcategory) {
                toast.error("Please select a parent category");
                return;
              }
              if (!newSubcategoryName.trim()) {
                toast.error("Subcategory name is required");
                return;
              }
              const cat = categories.find(c => c.name === selectedCategoryForSubcategory);
              if (cat?.subcategories.includes(newSubcategoryName.trim())) {
                toast.error("Subcategory already exists in this category");
                return;
              }
              const updated = await addSubcategory(selectedCategoryForSubcategory, newSubcategoryName.trim());
              setCategories(updated);
              toast.success(`Subcategory "${newSubcategoryName.trim()}" added to ${selectedCategoryForSubcategory}`);
              setNewSubcategoryName("");
              setIsAddSubcategoryOpen(false);
            }}>
              Add Subcategory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmItem} onOpenChange={(open) => !open && setDeleteConfirmItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {deleteConfirmItem?.archived ? "Permanently Delete Item?" : "Delete Item?"}
            </DialogTitle>
            <DialogDescription>
              {deleteConfirmItem?.archived
                ? "This action cannot be undone. The item will be permanently removed from the database."
                : "Choose how you want to handle this item:"}
            </DialogDescription>
          </DialogHeader>

          {deleteConfirmItem && (
            <div className="rounded-md border p-3 bg-muted/50">
              <p className="font-medium">{deleteConfirmItem.name}</p>
              <p className="text-sm text-muted-foreground">
                {deleteConfirmItem.category} • Qty: {deleteConfirmItem.quantity}
              </p>
            </div>
          )}

          {!deleteConfirmItem?.archived && (
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-md border bg-background hover:bg-accent/50 transition-colors">
                <Archive className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Archive</p>
                  <p className="text-sm text-muted-foreground">
                    Move to archive. You can restore it later if needed.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-md border border-destructive/50 bg-destructive/5">
                <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Delete Permanently</p>
                  <p className="text-sm text-muted-foreground">
                    Remove forever. This cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmItem(null)}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            {!deleteConfirmItem?.archived && (
              <Button
                variant="secondary"
                onClick={handleConfirmArchive}
                disabled={isDeleting}
                className="w-full sm:w-auto"
              >
                <Archive className="h-4 w-4 mr-2" />
                {isDeleting ? "Archiving..." : "Archive"}
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={handleConfirmPermanentDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
