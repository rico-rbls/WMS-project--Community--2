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
import { Search, Plus, Users, Mail, Phone, Trash2, RefreshCw, Star, TrendingUp, Package, ShoppingCart, Filter, X, CheckCircle, XCircle, Archive, ArchiveRestore, Eye, Building2, Tag, Hash, Calendar, Edit, MapPin, DollarSign, AlertCircle } from "lucide-react";
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
import { createCustomer, deleteCustomer, getCustomers, updateCustomer, bulkDeleteCustomers, bulkUpdateCustomerStatus, archiveCustomer, restoreCustomer, permanentlyDeleteCustomer, bulkArchiveCustomers, bulkRestoreCustomers, bulkPermanentlyDeleteCustomers } from "../services/api";
import type { Customer } from "../types";

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

const CUSTOMER_STATUSES = ["Active", "Inactive"] as const;
const CUSTOMER_CATEGORIES = ["Technology", "Startup", "Enterprise", "Retail", "Healthcare", "Finance", "Other"] as const;

interface CustomersViewProps {
  initialOpenDialog?: boolean;
  onDialogOpened?: () => void;
  initialCustomerId?: string;
  onCustomerDialogOpened?: () => void;
}

type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export function CustomersView({ initialOpenDialog, onDialogOpened, initialCustomerId, onCustomerDialogOpened }: CustomersViewProps) {
  const { isFavorite, getFavoritesByType } = useFavorites();
  const { user } = useAuth();
  const canModify = user ? canWrite(user.role) : false;
  const canPermanentlyDelete = user ? isAdmin(user.role) : false;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [customersData, setCustomersData] = useState<Customer[] | null>(null);
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
    status: "Active" as Customer["status"],
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
      const customers = await getCustomers();
      setCustomersData(customers);
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
    if (initialCustomerId && customersData) {
      const customer = customersData.find(c => c.id === initialCustomerId);
      if (customer) {
        setIsDetailOpen(initialCustomerId);
        onCustomerDialogOpened?.();
      }
    }
  }, [initialCustomerId, customersData, onCustomerDialogOpened]);

  const list = useMemo<Customer[]>(() => customersData ?? [], [customersData]);

  // Calculate customer statistics
  const customerStats = useMemo(() => {
    const totalCustomers = list.length;
    const activeCustomers = list.filter(c => c.status === "Active").length;
    const inactiveCustomers = list.filter(c => c.status === "Inactive").length;
    const uniqueCategories = new Set(list.map(c => c.category)).size;

    // Calculate total purchases and payments
    const totalPurchases = list.reduce((sum, c) => sum + c.purchases, 0);
    const totalPayments = list.reduce((sum, c) => sum + c.payments, 0);
    const totalBalance = list.reduce((sum, c) => sum + c.balance, 0);

    // Find top customer by purchases
    let topCustomerByPurchases: { id: string; name: string; value: number } | null = null;
    if (list.length > 0) {
      const sorted = [...list].sort((a, b) => b.purchases - a.purchases);
      if (sorted[0].purchases > 0) {
        topCustomerByPurchases = { id: sorted[0].id, name: sorted[0].name, value: sorted[0].purchases };
      }
    }

    return {
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      uniqueCategories,
      totalPurchases,
      totalPayments,
      totalBalance,
      topCustomerByPurchases,
    };
  }, [list]);

  // Optimized filtering with early returns and debounced search
  const filteredCustomers = useMemo(() => {
    return list.filter(customer => {
      // Filter by archived status
      // Handle undefined archived field (treat as not archived)
      const isArchived = customer.archived === true;
      if (isArchived !== showArchived) {
        return false;
      }

      // Early return for favorites filter
      if (showFavoritesOnly && !isFavorite("customers", customer.id)) {
        return false;
      }

      // Status filter
      if (filterStatus !== "all" && customer.status !== filterStatus) {
        return false;
      }

      // Early return for search filter
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const matchesSearch =
          customer.name.toLowerCase().includes(searchLower) ||
          customer.id.toLowerCase().includes(searchLower) ||
          customer.category.toLowerCase().includes(searchLower) ||
          customer.contact.toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower);

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
      const archived = await archiveCustomer(id);
      setCustomersData((prev) => (prev ?? []).map((c) => (c.id === id ? archived : c)));
      setIsEditOpen(null);
      toast.success("Customer archived successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to archive customer");
    }
  }

  // Restore handler
  async function handleRestore(id: string) {
    try {
      const restored = await restoreCustomer(id);
      setCustomersData((prev) => (prev ?? []).map((c) => (c.id === id ? restored : c)));
      setIsEditOpen(null);
      toast.success("Customer restored successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to restore customer");
    }
  }

  // Permanent delete handler
  async function handlePermanentDelete(id: string) {
    try {
      await permanentlyDeleteCustomer(id);
      setCustomersData((prev) => (prev ?? []).filter((c) => c.id !== id));
      setIsEditOpen(null);
      toast.success("Customer permanently deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to permanently delete customer");
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
  } = useTableSort<Customer>(filteredCustomers);

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
  const handleInlineUpdate = useCallback(async (customerId: string, field: keyof Customer, value: string | number) => {
    try {
      const updates: Partial<Customer> = { [field]: value };
      const updated = await updateCustomer({ id: customerId, ...updates });
      setCustomersData((prev) => (prev ?? []).map((c) => (c.id === customerId ? updated : c)));
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
      throw e;
    }
  }, [setCustomersData]);

  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkDeleteCustomers(ids);

      setCustomersData((prev) => prev?.filter((customer) => !ids.includes(customer.id)) ?? []);

      if (result.failedCount > 0) {
        toast.warning(`Deleted ${result.successCount} customers. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully deleted ${result.successCount} customer${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete customers");
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
      const result = await bulkArchiveCustomers(ids);

      setCustomersData((prev) => {
        if (!prev) return prev;
        return prev.map((customer) => {
          if (ids.includes(customer.id)) {
            return { ...customer, archived: true, archivedAt: new Date().toISOString() };
          }
          return customer;
        });
      });

      if (result.failedCount > 0) {
        toast.warning(`Archived ${result.successCount} customers. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully archived ${result.successCount} customer${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to archive customers");
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
      const result = await bulkRestoreCustomers(ids);

      setCustomersData((prev) => {
        if (!prev) return prev;
        return prev.map((customer) => {
          if (ids.includes(customer.id)) {
            return { ...customer, archived: false, archivedAt: undefined };
          }
          return customer;
        });
      });

      if (result.failedCount > 0) {
        toast.warning(`Restored ${result.successCount} customers. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully restored ${result.successCount} customer${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to restore customers");
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
      const result = await bulkPermanentlyDeleteCustomers(ids);

      setCustomersData((prev) => prev?.filter((customer) => !ids.includes(customer.id)) ?? []);

      if (result.failedCount > 0) {
        toast.warning(`Permanently deleted ${result.successCount} customers. ${result.failedCount} failed.`);
      } else {
        toast.success(`Permanently deleted ${result.successCount} customer${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to permanently delete customers");
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
      const result = await bulkUpdateCustomerStatus(ids, status as Customer["status"]);

      setCustomersData((prev) => {
        if (!prev) return prev;
        return prev.map((customer) => {
          if (ids.includes(customer.id)) {
            return { ...customer, status: status as Customer["status"] };
          }
          return customer;
        });
      });

      if (result.failedCount > 0) {
        toast.warning(`Updated ${result.successCount} customers. ${result.failedCount} failed.`);
      } else {
        toast.success(`Successfully updated ${result.successCount} customer${result.successCount !== 1 ? "s" : ""}`);
      }

      deselectAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update customers");
    } finally {
      setIsBulkUpdating(false);
    }
  }, [selectedIds, deselectAll]);

  // Handle edit from detail dialog
  const handleEdit = useCallback((customer: Customer) => {
    setForm({
      id: customer.id,
      name: customer.name,
      contact: customer.contact,
      email: customer.email,
      phone: customer.phone,
      category: customer.category,
      status: customer.status,
      country: customer.country || "",
      city: customer.city || "",
      address: customer.address || "",
      purchases: customer.purchases || 0,
      payments: customer.payments || 0,
    });
    setIsEditOpen(customer.id);
  }, []);

  // Get names of selected customers for dialogs
  const selectedCustomerNames = useMemo(() => {
    return selectedItems.map(customer => customer.name);
  }, [selectedItems]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">Manage customer profiles, contact details, and sales relationships</p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Customers */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerStats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {customerStats.activeCustomers} active, {customerStats.inactiveCustomers} inactive
            </p>
          </CardContent>
        </Card>

        {/* Active Customers */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Customers</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{customerStats.activeCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {customerStats.totalCustomers > 0
                ? `${Math.round((customerStats.activeCustomers / customerStats.totalCustomers) * 100)}% of total`
                : "No customers yet"}
            </p>
          </CardContent>
        </Card>

        {/* Total Purchases */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₱{customerStats.totalPurchases.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {customerStats.topCustomerByPurchases
                ? `Top: ${customerStats.topCustomerByPurchases.name}`
                : "No purchases yet"}
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
            <div className="text-2xl font-bold text-purple-600">{customerStats.uniqueCategories}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Outstanding balance: ₱{customerStats.totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <p className="text-xl font-bold mt-1">{customerStats.activeCustomers}</p>
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
                <p className="text-xl font-bold mt-1">{customerStats.inactiveCustomers}</p>
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
              <CardTitle className="text-xl">Customer Management</CardTitle>
              <CardDescription className="mt-1">
                Manage your customer relationships and contacts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) setForm({ id: "", name: "", contact: "", email: "", phone: "", category: "", status: "Active", country: "", city: "", address: "", purchases: 0, payments: 0 }); }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setForm({ id: "", name: "", contact: "", email: "", phone: "", category: "", status: "Active", country: "", city: "", address: "", purchases: 0, payments: 0 })} disabled={!canModify} title={!canModify ? "You don't have permission to add customers" : undefined}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Customer</DialogTitle>
                    <DialogDescription>Enter the details for the new customer.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="customer-name">Customer Name *</Label>
                        <Input id="customer-name" placeholder="Enter customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="customer-status">Status</Label>
                        <Select
                          value={form.status}
                          onValueChange={(value: CustomerStatus) => setForm({ ...form, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {CUSTOMER_STATUSES.map((status) => (
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
                          {CUSTOMER_CATEGORIES.map((cat) => (
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
                          const created = await createCustomer({
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
                          setCustomersData((prev) => [created, ...(prev ?? [])]);
                          setIsAddOpen(false);
                          toast.success("Customer added successfully");
                          setForm({ id: "", name: "", contact: "", email: "", phone: "", category: "", status: "Active", country: "", city: "", address: "", purchases: 0, payments: 0 });
                        } catch (e: any) {
                          toast.error(e?.message || "Failed to add customer");
                        }
                      }}
                    >
                      Create Customer
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
                  placeholder="Search customers by name, contact, email..."
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
                  {CUSTOMER_STATUSES.map((status) => (
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
                {getFavoritesByType("customers").length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {getFavoritesByType("customers").length}
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

          {/* Bulk Delete/Archive Dialog - Two-tier for active items, single option for archived */}
          <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Delete {selectionCount} Customer{selectionCount !== 1 ? "s" : ""}
                </DialogTitle>
                <DialogDescription>
                  {showArchived
                    ? "These customers are already archived. This action will permanently remove them from the system."
                    : "Choose how you want to delete the selected customers:"}
                </DialogDescription>
              </DialogHeader>

              {/* Show selected customer names */}
              {selectedCustomerNames.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/50">
                  <ul className="text-sm space-y-1">
                    {selectedCustomerNames.slice(0, 10).map((name, idx) => (
                      <li key={idx} className="truncate">• {name}</li>
                    ))}
                    {selectedCustomerNames.length > 10 && (
                      <li className="text-muted-foreground">...and {selectedCustomerNames.length - 10} more</li>
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
                          Move to archive. Customers can be restored later.
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

          {isLoading ? (
            <TableLoadingSkeleton rows={8} />
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              icon={showArchived ? Archive : Users}
              title={showArchived ? "No archived customers" : "No customers found"}
              description={showArchived
                ? "Archived customers will appear here"
                : searchTerm
                  ? "Try adjusting your search criteria"
                  : "Get started by adding your first customer"}
              actionLabel={!showArchived && !searchTerm ? "Add Customer" : undefined}
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
                itemLabel="customers"
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
                        aria-label="Select all customers"
                      />
                    </TableHead>
                    <SortableTableHead
                      sortKey="id"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("id")}
                      onSort={(key) => requestSort(key as keyof Customer)}
                    >
                      Customer ID
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="name"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("name")}
                      onSort={(key) => requestSort(key as keyof Customer)}
                    >
                      Customer Name
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="contact"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("contact")}
                      onSort={(key) => requestSort(key as keyof Customer)}
                    >
                      Contact
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="category"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("category")}
                      onSort={(key) => requestSort(key as keyof Customer)}
                    >
                      Category
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("status")}
                      onSort={(key) => requestSort(key as keyof Customer)}
                    >
                      Status
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="country"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("country")}
                      onSort={(key) => requestSort(key as keyof Customer)}
                    >
                      Location
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="purchases"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("purchases")}
                      onSort={(key) => requestSort(key as keyof Customer)}
                    >
                      Purchases
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="payments"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("payments")}
                      onSort={(key) => requestSort(key as keyof Customer)}
                    >
                      Payments
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="balance"
                      currentSortKey={sortConfig.key as string | null}
                      sortDirection={getSortDirection("balance")}
                      onSort={(key) => requestSort(key as keyof Customer)}
                    >
                      Balance
                    </SortableTableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((customer) => {
                    const customerIsSelected = isSelected(customer.id);
                    return (
                      <TableRow
                        key={customer.id}
                        className={cn(
                          "hover:bg-muted/50 transition-colors",
                          customerIsSelected && "bg-muted/50"
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={customerIsSelected}
                            onCheckedChange={() => toggleItem(customer.id)}
                            aria-label={`Select customer ${customer.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{customer.id}</TableCell>
                        <TableCell>
                          <button
                            className="text-left font-medium text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                            onClick={() => setIsDetailOpen(customer.id)}
                          >
                            {customer.name}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <EditableCell
                                value={customer.email}
                                type="text"
                                onSave={(v) => handleInlineUpdate(customer.id, "email", v)}
                                disabled={!canModify}
                                className="text-xs text-muted-foreground"
                              />
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <EditableCell
                                value={customer.phone}
                                type="text"
                                onSave={(v) => handleInlineUpdate(customer.id, "phone", v)}
                                disabled={!canModify}
                                className="text-xs text-muted-foreground"
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={customer.category}
                            type="select"
                            options={CUSTOMER_CATEGORIES.map(c => ({ value: c, label: c }))}
                            onSave={(v) => handleInlineUpdate(customer.id, "category", v)}
                            disabled={!canModify}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1", getStatusColor(customer.status))}>
                            <span>{getStatusIcon(customer.status)}</span>
                            {customer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {customer.city && customer.country ? (
                              <span>{customer.city}, {customer.country}</span>
                            ) : customer.city || customer.country ? (
                              <span>{customer.city || customer.country}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{customer.purchases.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{customer.payments.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={cn("text-right font-medium", customer.balance > 0 ? "text-amber-600" : customer.balance < 0 ? "text-emerald-600" : "")}>
                          ₱{customer.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FavoriteButton
                              entityType="customers"
                              entityId={customer.id}
                              entityName={customer.name}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setIsDetailOpen(customer.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {showArchived ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleRestore(customer.id)}
                                  disabled={!canModify}
                                  title="Restore customer"
                                >
                                  <ArchiveRestore className="h-4 w-4" />
                                </Button>
                                {canPermanentlyDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handlePermanentDelete(customer.id)}
                                    title="Permanently delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(customer)}
                                  disabled={!canModify}
                                  title="Edit customer"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleArchive(customer.id)}
                                  disabled={!canModify}
                                  title="Archive customer"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {filteredCustomers.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={goToPage}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      {isEditOpen && (
        <Dialog open={!!isEditOpen} onOpenChange={(o) => { if (!o) setIsEditOpen(null); }}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
              <DialogDescription>Update the customer details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-customer-name">Customer Name *</Label>
                  <Input id="edit-customer-name" placeholder="Enter customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-customer-status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value: CustomerStatus) => setForm({ ...form, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_STATUSES.map((status) => (
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
                <Label htmlFor="edit-contact-name">Contact Person *</Label>
                <Input id="edit-contact-name" placeholder="Enter contact name" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input id="edit-email" type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Phone *</Label>
                  <Input id="edit-phone" placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
                    {CUSTOMER_CATEGORIES.map((cat) => (
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!form.name.trim() || !form.contact.trim() || !form.email.trim() || !form.phone.trim() || !form.category.trim()) {
                    toast.error("Please fill all required fields");
                    return;
                  }
                  try {
                    const updated = await updateCustomer({
                      id: isEditOpen,
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
                    setCustomersData((prev) => (prev ?? []).map((c) => (c.id === isEditOpen ? updated : c)));
                    setIsEditOpen(null);
                    toast.success("Customer updated successfully");
                  } catch (e: any) {
                    toast.error(e?.message || "Failed to update customer");
                  }
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Customer Detail Dialog */}
      {isDetailOpen && (() => {
        const customer = list.find((c) => c.id === isDetailOpen);
        if (!customer) return null;
        return (
          <Dialog open={!!isDetailOpen} onOpenChange={(o) => { if (!o) setIsDetailOpen(null); }}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl">{customer.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <span className="font-mono">{customer.id}</span>
                      <Badge variant="outline" className={cn("gap-1", getStatusColor(customer.status))}>
                        <span>{getStatusIcon(customer.status)}</span>
                        {customer.status}
                      </Badge>
                      {customer.archived && (
                        <Badge variant="outline" className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-200">
                          <Archive className="h-3 w-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </DialogDescription>
                  </div>
                  <FavoriteButton
                    entityType="customers"
                    entityId={customer.id}
                    entityName={customer.name}
                  />
                </div>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Contact Person</p>
                      <p className="font-medium">{customer.contact}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Category</p>
                      <Badge variant="secondary">{customer.category}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {customer.email}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {customer.phone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">City / Country</p>
                      <p className="font-medium">
                        {customer.city && customer.country
                          ? `${customer.city}, ${customer.country}`
                          : customer.city || customer.country || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium">{customer.address || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Financial Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Total Purchases</p>
                        <p className="text-lg font-bold text-blue-600">
                          ₱{customer.purchases.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Total Payments</p>
                        <p className="text-lg font-bold text-emerald-600">
                          ₱{customer.payments.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className={cn("text-lg font-bold", customer.balance > 0 ? "text-amber-600" : customer.balance < 0 ? "text-emerald-600" : "")}>
                          ₱{customer.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailOpen(null)}>
                  Close
                </Button>
                {!customer.archived && canModify && (
                  <Button onClick={() => { setIsDetailOpen(null); handleEdit(customer); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Customer
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
