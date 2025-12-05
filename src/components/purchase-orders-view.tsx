import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
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
import { Plus, Search, ShoppingBag, Trash2, Check, X, Package, Send, Download, DollarSign, Clock, TrendingUp, CheckCircle, FileText, Filter, Archive, ArchiveRestore, Printer } from "lucide-react";
import { usePrintReceipt, type ReceiptData } from "@/components/ui/printable-receipt";
import { cn } from "./ui/utils";
import { toast } from "sonner";
import {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  submitPOForApproval,
  approvePO,
  rejectPO,
  markPOAsOrdered,
  cancelPO,
  receivePurchaseOrder,
  getSuppliers,
  getInventory,
  bulkDeletePurchaseOrders,
  archivePurchaseOrder,
  restorePurchaseOrder,
  permanentlyDeletePurchaseOrder,
  bulkArchivePurchaseOrders,
  bulkRestorePurchaseOrders,
  bulkPermanentlyDeletePurchaseOrders,
} from "../services/api";
import type { PurchaseOrder, POStatus, Supplier, InventoryItem } from "../types";
import { TableLoadingSkeleton } from "./ui/loading-skeleton";
import { EmptyState } from "./ui/empty-state";
import { useDebounce } from "../hooks/useDebounce";
import { usePagination } from "../hooks/usePagination";
import { useBatchSelection } from "../hooks/useBatchSelection";
import { PaginationControls } from "./ui/pagination-controls";
import { BulkActionsToolbar } from "./ui/bulk-actions-toolbar";
import { BulkDeleteDialog } from "./ui/bulk-delete-dialog";
import { SelectAllBanner } from "./ui/select-all-banner";
import { useAuth } from "../context/auth-context";
import { getUserRole, hasPermission } from "../lib/permissions";
import { SortableTableHead } from "./ui/sortable-table-head";
import type { SortDirection } from "../hooks/useTableSort";
import { EditableCell } from "./ui/editable-cell";

const PO_STATUSES: POStatus[] = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Rejected",
  "Ordered",
  "Partially Received",
  "Received",
  "Cancelled",
];

interface PurchaseOrdersViewProps {
  initialOpenDialog?: boolean;
  onDialogOpened?: () => void;
  prefilledItem?: { inventoryItemId: string; itemName: string; quantity: number; unitPrice: number; supplierId: string; supplierName: string };
}

export function PurchaseOrdersView({ initialOpenDialog, onDialogOpened, prefilledItem }: PurchaseOrdersViewProps) {
  const { user } = useAuth();
  const userRole = user ? getUserRole(user.id) : "user";
  const canCreate = hasPermission(userRole, "purchase_orders:create");
  const canApprove = hasPermission(userRole, "purchase_orders:approve");
  const canReceive = hasPermission(userRole, "purchase_orders:receive");
  const canDelete = hasPermission(userRole, "purchase_orders:delete");
  const canPermanentlyDelete = hasPermission(userRole, "purchase_orders:permanent_delete");

  const { printReceipt } = usePrintReceipt();

  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [purchaseOrdersData, setPurchaseOrdersData] = useState<PurchaseOrder[] | null>(null);
  const [suppliersData, setSuppliersData] = useState<Supplier[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<string | null>(null);
  const [isReceiveOpen, setIsReceiveOpen] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof PurchaseOrder | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Form state for creating/editing PO
  const [form, setForm] = useState({
    poDate: new Date().toISOString().split('T')[0],
    supplierId: "",
    supplierName: "",
    supplierCountry: "",
    supplierCity: "",
    billNumber: "",
    items: [] as { inventoryItemId: string; itemName: string; quantity: number; unitPrice: number; totalPrice: number }[],
    expectedDeliveryDate: "",
    notes: "",
    totalPaid: 0,
    shippingStatus: "Pending" as "Pending" | "Processing" | "Shipped" | "In Transit" | "Out for Delivery" | "Delivered" | "Failed" | "Returned",
  });

  // Receive form state
  const [receiveForm, setReceiveForm] = useState<{ [itemId: string]: number }>({});
  const [actualCost, setActualCost] = useState<number | undefined>(undefined);

  // Bulk operations
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const list = useMemo(() => purchaseOrdersData ?? [], [purchaseOrdersData]);



  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [pos, suppliers, inventory] = await Promise.all([
          getPurchaseOrders(),
          getSuppliers(),
          getInventory(),
        ]);
        setPurchaseOrdersData(pos);
        setSuppliersData(suppliers.filter(s => s.status === "Active"));
        setInventoryData(inventory);
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Handle prefilled item from Dashboard
  useEffect(() => {
    if (prefilledItem && suppliersData.length > 0) {
      const supplier = suppliersData.find(s => s.id === prefilledItem.supplierId);
      setForm({
        poDate: new Date().toISOString().split('T')[0],
        supplierId: prefilledItem.supplierId,
        supplierName: prefilledItem.supplierName,
        supplierCountry: supplier?.country ?? "",
        supplierCity: supplier?.city ?? "",
        billNumber: "",
        items: [{
          inventoryItemId: prefilledItem.inventoryItemId,
          itemName: prefilledItem.itemName,
          quantity: prefilledItem.quantity,
          unitPrice: prefilledItem.unitPrice,
          totalPrice: prefilledItem.quantity * prefilledItem.unitPrice,
        }],
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: "",
        totalPaid: 0,
        shippingStatus: "Pending",
      });
      setIsAddOpen(true);
    }
  }, [prefilledItem, suppliersData]);

  // Open dialog when triggered from Dashboard
  useEffect(() => {
    if (initialOpenDialog && !isAddOpen) {
      setIsAddOpen(true);
      onDialogOpened?.();
    }
  }, [initialOpenDialog, onDialogOpened, isAddOpen]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = list;

    // Filter by archived status
    result = result.filter((po) => po.archived === showArchived);

    // Search filter
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(
        (po) =>
          po.id.toLowerCase().includes(term) ||
          po.supplierName.toLowerCase().includes(term) ||
          (po.items ?? []).some((item) => item.itemName.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((po) => po.status === filterStatus);
    }

    // Sorting
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }

    return result;
  }, [list, debouncedSearchTerm, filterStatus, sortColumn, sortDirection, showArchived]);

  const { paginatedData, currentPage, totalPages, goToPage, itemsPerPage, totalItems } = usePagination<PurchaseOrder>(filteredData, 10);

  // Batch selection (after pagination is defined)
  const {
    selectedIds,
    toggleItem,
    toggleAll,
    selectAllPages,
    isSelected,
    isAllSelected,
    isAllPageSelected,
    isAllPagesSelected,
    isPartiallySelected,
    selectionCount,
    hasSelection,
    deselectAll,
    totalItemCount,
    pageItemCount,
  } = useBatchSelection(paginatedData, filteredData);

  // Calculate statistics
  // Calculate statistics (only non-archived POs)
  const poStats = useMemo(() => {
    const activeList = list.filter(po => !po.archived);
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalPOs = activeList.length;
    const totalValue = activeList.reduce((sum, po) => sum + (po.totalAmount ?? 0), 0);
    const avgOrderValue = totalPOs > 0 ? totalValue / totalPOs : 0;

    // Status counts
    const draftCount = activeList.filter(po => po.status === "Draft").length;
    const pendingApprovalCount = activeList.filter(po => po.status === "Pending Approval").length;
    const approvedCount = activeList.filter(po => po.status === "Approved").length;
    const orderedCount = activeList.filter(po => po.status === "Ordered").length;
    const partiallyReceivedCount = activeList.filter(po => po.status === "Partially Received").length;
    const receivedCount = activeList.filter(po => po.status === "Received").length;
    const rejectedCount = activeList.filter(po => po.status === "Rejected").length;
    const cancelledCount = activeList.filter(po => po.status === "Cancelled").length;

    // Active POs (not completed or cancelled)
    const activePOs = draftCount + pendingApprovalCount + approvedCount + orderedCount + partiallyReceivedCount;

    // Completion rate
    const completedPOs = receivedCount;
    const completionRate = totalPOs > 0 ? Math.round((completedPOs / totalPOs) * 100) : 0;

    // New this week
    const newThisWeek = activeList.filter(po => {
      const createdDate = new Date(po.createdDate);
      return createdDate >= oneWeekAgo;
    }).length;

    // Pending delivery (ordered but not received)
    const pendingDelivery = orderedCount + partiallyReceivedCount;

    return {
      totalPOs,
      totalValue,
      avgOrderValue,
      draftCount,
      pendingApprovalCount,
      approvedCount,
      orderedCount,
      partiallyReceivedCount,
      receivedCount,
      rejectedCount,
      cancelledCount,
      activePOs,
      completionRate,
      newThisWeek,
      pendingDelivery,
      completedPOs,
    };
  }, [list]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setShowArchived(false);
  };

  // Get status icon
  const getStatusIcon = (status: POStatus) => {
    switch (status) {
      case "Draft": return "📝";
      case "Pending Approval": return "⏳";
      case "Approved": return "✓";
      case "Rejected": return "✗";
      case "Ordered": return "📦";
      case "Partially Received": return "📥";
      case "Received": return "✓";
      case "Cancelled": return "○";
      default: return "○";
    }
  };

  // Get status badge color for status breakdown cards
  const getStatusBadgeColor = (status: POStatus) => {
    switch (status) {
      case "Draft": return "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-200";
      case "Pending Approval": return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200";
      case "Approved": return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200";
      case "Rejected": return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-200";
      case "Ordered": return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200";
      case "Partially Received": return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-200";
      case "Received": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200";
      case "Cancelled": return "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-200";
      default: return "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-200";
    }
  };

  const handleSort = (column: string) => {
    const key = column as keyof PurchaseOrder;
    if (sortColumn === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        // Reset on third click
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  const getSortDirection = (column: keyof PurchaseOrder): SortDirection => {
    if (sortColumn === column) {
      return sortDirection;
    }
    return null;
  };

  const getStatusBadge = (status: POStatus) => {
    const variants: Record<POStatus, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
      "Draft": { variant: "secondary" },
      "Pending Approval": { variant: "outline", className: "border-yellow-500 text-yellow-600" },
      "Approved": { variant: "outline", className: "border-blue-500 text-blue-600" },
      "Rejected": { variant: "destructive" },
      "Ordered": { variant: "outline", className: "border-purple-500 text-purple-600" },
      "Partially Received": { variant: "outline", className: "border-orange-500 text-orange-600" },
      "Received": { variant: "default", className: "bg-green-500" },
      "Cancelled": { variant: "secondary", className: "text-gray-500" },
    };
    const { variant, className } = variants[status];
    return <Badge variant={variant} className={cn("gap-1", className)}><span>{getStatusIcon(status)}</span>{status}</Badge>;
  };

  const resetForm = () => {
    setForm({
      poDate: new Date().toISOString().split('T')[0],
      supplierId: "",
      supplierName: "",
      supplierCountry: "",
      supplierCity: "",
      billNumber: "",
      items: [],
      expectedDeliveryDate: "",
      notes: "",
      totalPaid: 0,
      shippingStatus: "Pending",
    });
  };

  const handleAddItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { inventoryItemId: "", itemName: "", quantity: 1, unitPrice: 0, totalPrice: 0 }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setForm((prev) => {
      const newItems = [...prev.items];
      if (field === "inventoryItemId") {
        const item = inventoryData.find((i) => i.id === value);
        if (item) {
          newItems[index] = {
            ...newItems[index],
            inventoryItemId: item.id,
            itemName: item.name,
            unitPrice: item.pricePerPiece,
            totalPrice: newItems[index].quantity * item.pricePerPiece,
          };
        }
      } else if (field === "quantity") {
        const qty = Number(value) || 0;
        newItems[index] = {
          ...newItems[index],
          quantity: qty,
          totalPrice: qty * newItems[index].unitPrice,
        };
      } else if (field === "unitPrice") {
        const price = Number(value) || 0;
        newItems[index] = {
          ...newItems[index],
          unitPrice: price,
          totalPrice: newItems[index].quantity * price,
        };
      }
      return { ...prev, items: newItems };
    });
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliersData.find((s) => s.id === supplierId);
    setForm((prev) => ({
      ...prev,
      supplierId,
      supplierName: supplier?.name ?? "",
      supplierCountry: supplier?.country ?? "",
      supplierCity: supplier?.city ?? "",
    }));
  };

  const handleCreate = async () => {
    if (!form.supplierId || form.items.length === 0 || !form.expectedDeliveryDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const newPO = await createPurchaseOrder({
        poDate: form.poDate,
        supplierId: form.supplierId,
        supplierName: form.supplierName,
        supplierCountry: form.supplierCountry,
        supplierCity: form.supplierCity,
        billNumber: form.billNumber,
        items: form.items,
        expectedDeliveryDate: form.expectedDeliveryDate,
        notes: form.notes,
        createdBy: user?.id ?? "1",
        totalPaid: form.totalPaid,
      });
      setPurchaseOrdersData((prev) => [newPO, ...(prev ?? [])]);
      toast.success(`Purchase Order ${newPO.id} created successfully`);
      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create purchase order");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!form.supplierId || form.items.length === 0 || !form.expectedDeliveryDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const updated = await updatePurchaseOrder({
        id,
        poDate: form.poDate,
        supplierId: form.supplierId,
        supplierName: form.supplierName,
        supplierCountry: form.supplierCountry,
        supplierCity: form.supplierCity,
        billNumber: form.billNumber,
        items: form.items,
        expectedDeliveryDate: form.expectedDeliveryDate,
        notes: form.notes,
        totalPaid: form.totalPaid,
        shippingStatus: form.shippingStatus,
      });
      setPurchaseOrdersData((prev) => prev?.map((po) => (po.id === id ? updated : po)) ?? []);
      toast.success(`Purchase Order ${id} updated successfully`);
      setIsEditOpen(null);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update purchase order");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePurchaseOrder(id);
      setPurchaseOrdersData((prev) => prev?.filter((po) => po.id !== id) ?? []);
      toast.success(`Purchase Order ${id} deleted`);
      setIsEditOpen(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete purchase order");
    }
  };

  // Inline edit handler for quick cell updates
  const handleInlineUpdate = async (poId: string, field: keyof PurchaseOrder, value: string | number) => {
    try {
      const updates: Partial<PurchaseOrder> = { [field]: value };
      const updated = await updatePurchaseOrder({ id: poId, ...updates });
      setPurchaseOrdersData((prev) => prev?.map((po) => (po.id === poId ? updated : po)) ?? []);
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
      throw e;
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    try {
      const updated = await submitPOForApproval(id);
      setPurchaseOrdersData((prev) => prev?.map((po) => (po.id === id ? updated : po)) ?? []);
      toast.success(`Purchase Order ${id} submitted for approval`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit for approval");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const updated = await approvePO(id, user?.id ?? "1");
      setPurchaseOrdersData((prev) => prev?.map((po) => (po.id === id ? updated : po)) ?? []);
      toast.success(`Purchase Order ${id} approved`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve");
    }
  };

  const handleReject = async (id: string) => {
    try {
      const updated = await rejectPO(id, user?.id ?? "1");
      setPurchaseOrdersData((prev) => prev?.map((po) => (po.id === id ? updated : po)) ?? []);
      toast.success(`Purchase Order ${id} rejected`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject");
    }
  };

  const handleMarkAsOrdered = async (id: string) => {
    try {
      const updated = await markPOAsOrdered(id);
      setPurchaseOrdersData((prev) => prev?.map((po) => (po.id === id ? updated : po)) ?? []);
      toast.success(`Purchase Order ${id} marked as ordered`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark as ordered");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const updated = await cancelPO(id);
      setPurchaseOrdersData((prev) => prev?.map((po) => (po.id === id ? updated : po)) ?? []);
      toast.success(`Purchase Order ${id} cancelled`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel");
    }
  };

  const openReceiveDialog = (po: PurchaseOrder) => {
    const initialReceive: { [itemId: string]: number } = {};
    (po.items ?? []).forEach((item) => {
      const remaining = item.quantity - (item.quantityReceived ?? 0);
      initialReceive[item.inventoryItemId] = remaining;
    });
    setReceiveForm(initialReceive);
    setActualCost(po.totalAmount);
    setIsReceiveOpen(po.id);
  };

  const handleReceive = async (id: string) => {
    try {
      const receivedItems = (Object.entries(receiveForm) as [string, number][])
        .filter(([_, qty]) => qty > 0)
        .map(([inventoryItemId, quantityReceived]) => ({ inventoryItemId, quantityReceived }));

      if (receivedItems.length === 0) {
        toast.error("Please enter quantities to receive");
        return;
      }

      const result = await receivePurchaseOrder(id, receivedItems, actualCost);
      setPurchaseOrdersData((prev) => prev?.map((po) => (po.id === id ? result.purchaseOrder : po)) ?? []);

      // Show inventory updates
      if (result.inventoryUpdates.length > 0) {
        const updates = result.inventoryUpdates.map((u) => `${u.itemName}: ${u.previousQty} → ${u.newQty}`).join(", ");
        toast.success(`Items received. Inventory updated: ${updates}`);
      } else {
        toast.success("Items received successfully");
      }

      setIsReceiveOpen(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to receive items");
    }
  };

  const handleBulkDelete = async () => {
    try {
      const result = await bulkDeletePurchaseOrders(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${result.successCount} purchase orders deleted`);
      } else {
        toast.warning(`${result.successCount} deleted, ${result.failedCount} failed: ${result.errors.join(", ")}`);
      }
      setPurchaseOrdersData((prev) => prev?.filter((po) => !selectedIds.has(po.id)) ?? []);
      deselectAll();
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error("Failed to delete purchase orders");
    }
  };

  // Archive/Restore/Permanent Delete handlers
  const handleArchive = async (id: string) => {
    try {
      const archived = await archivePurchaseOrder(id);
      setPurchaseOrdersData((prev) => (prev ?? []).map((po) => (po.id === id ? archived : po)));
      setIsEditOpen(null);
      toast.success("Purchase order archived");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to archive purchase order");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const restored = await restorePurchaseOrder(id);
      setPurchaseOrdersData((prev) => (prev ?? []).map((po) => (po.id === id ? restored : po)));
      setIsEditOpen(null);
      toast.success("Purchase order restored");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to restore purchase order");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await permanentlyDeletePurchaseOrder(id);
      setPurchaseOrdersData((prev) => (prev ?? []).filter((po) => po.id !== id));
      setIsEditOpen(null);
      toast.success("Purchase order permanently deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to permanently delete purchase order");
    }
  };

  // Bulk archive/restore/permanent delete handlers
  const handleBulkArchive = async () => {
    try {
      const result = await bulkArchivePurchaseOrders(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${result.successCount} purchase orders archived`);
      } else {
        toast.warning(`${result.successCount} archived, ${result.failedCount} failed`);
      }
      const updatedPOs = await getPurchaseOrders();
      setPurchaseOrdersData(updatedPOs);
      deselectAll();
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error("Failed to archive purchase orders");
    }
  };

  const handleBulkRestore = async () => {
    try {
      const result = await bulkRestorePurchaseOrders(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${result.successCount} purchase orders restored`);
      } else {
        toast.warning(`${result.successCount} restored, ${result.failedCount} failed`);
      }
      const updatedPOs = await getPurchaseOrders();
      setPurchaseOrdersData(updatedPOs);
      deselectAll();
    } catch (error) {
      toast.error("Failed to restore purchase orders");
    }
  };

  const handleBulkPermanentDelete = async () => {
    try {
      const result = await bulkPermanentlyDeletePurchaseOrders(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${result.successCount} purchase orders permanently deleted`);
      } else {
        toast.warning(`${result.successCount} deleted, ${result.failedCount} failed`);
      }
      setPurchaseOrdersData((prev) => prev?.filter((po) => !selectedIds.has(po.id)) ?? []);
      deselectAll();
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error("Failed to permanently delete purchase orders");
    }
  };

  const openEditDialog = (po: PurchaseOrder) => {
    setForm({
      poDate: po.poDate ?? po.createdDate,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      supplierCountry: po.supplierCountry ?? "",
      supplierCity: po.supplierCity ?? "",
      billNumber: po.billNumber ?? "",
      items: (po.items ?? []).map((item) => ({
        inventoryItemId: item.inventoryItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      expectedDeliveryDate: po.expectedDeliveryDate,
      notes: po.notes,
      totalPaid: po.totalPaid ?? 0,
      shippingStatus: po.shippingStatus ?? "Pending",
    });
    setIsEditOpen(po.id);
  };

  const exportToCSV = () => {
    const headers = ["Date", "PO ID", "Supplier ID", "Supplier Name", "Bill #", "Country", "City", "Items", "Total Amount", "Total Paid", "PO Balance", "MT Status", "Shipping Status", "Expected Delivery", "Notes"];
    const rows = filteredData.map((po) => [
      po.poDate ?? po.createdDate,
      po.id,
      po.supplierId,
      po.supplierName,
      po.billNumber ?? "",
      po.supplierCountry ?? "",
      po.supplierCity ?? "",
      (po.items ?? []).map((i) => `${i.itemName} (${i.quantity})`).join("; "),
      (po.totalAmount ?? 0).toFixed(2),
      (po.totalPaid ?? 0).toFixed(2),
      (po.poBalance ?? po.totalAmount ?? 0).toFixed(2),
      po.status,
      po.shippingStatus ?? "Pending",
      po.expectedDeliveryDate,
      po.notes,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Purchase orders exported to CSV");
  };

  const totalAmount = useMemo(() => form.items.reduce((sum, item) => sum + item.totalPrice, 0), [form.items]);

  // Handle printing purchase order
  const handlePrintPurchaseOrder = (po: PurchaseOrder) => {
    const receiptData: ReceiptData = {
      type: "purchase-order",
      documentNumber: po.id,
      documentDate: po.poDate ?? po.createdDate,
      partyType: "Supplier",
      partyName: po.supplierName,
      partyCity: po.supplierCity,
      partyCountry: po.supplierCountry,
      referenceNumber: po.billNumber,
      referenceLabel: "Bill No.",
      items: (po.items ?? []).map(item => ({
        description: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.totalPrice,
      })),
      totalAmount: po.totalAmount ?? 0,
      amountPaid: po.totalPaid ?? 0,
      balance: po.poBalance ?? (po.totalAmount - (po.totalPaid ?? 0)) ?? 0,
      status: `${po.status} / ${po.shippingStatus ?? "Pending"}`,
      expectedDeliveryDate: po.expectedDeliveryDate,
      notes: po.notes,
      approvedBy: po.approvedBy,
      approvedDate: po.approvedDate,
      createdBy: po.createdBy,
    };
    printReceipt(receiptData);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <TableLoadingSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
        <p className="text-muted-foreground">Create and manage supplier orders, track approvals, and receive inventory</p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total POs */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total POs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{poStats.totalPOs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {poStats.newThisWeek} new this week
            </p>
          </CardContent>
        </Card>

        {/* Total Value */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(poStats.totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(poStats.avgOrderValue)} per PO
            </p>
          </CardContent>
        </Card>

        {/* Active POs */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active POs</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{poStats.activePOs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {poStats.orderedCount} ordered, {poStats.pendingApprovalCount} pending approval
            </p>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{poStats.completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {poStats.completedPOs} received of {poStats.totalPOs} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4",
            filterStatus === "Draft" ? "ring-2 ring-primary" : "",
            "border-l-slate-400"
          )}
          onClick={() => setFilterStatus(filterStatus === "Draft" ? "all" : "Draft")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Draft</p>
                <p className="text-xl font-bold mt-1">{poStats.draftCount}</p>
              </div>
              <Badge variant="outline" className={getStatusBadgeColor("Draft")}>
                {getStatusIcon("Draft")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4",
            filterStatus === "Pending Approval" ? "ring-2 ring-primary" : "",
            "border-l-amber-400"
          )}
          onClick={() => setFilterStatus(filterStatus === "Pending Approval" ? "all" : "Pending Approval")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Approval</p>
                <p className="text-xl font-bold mt-1">{poStats.pendingApprovalCount}</p>
              </div>
              <Badge variant="outline" className={getStatusBadgeColor("Pending Approval")}>
                {getStatusIcon("Pending Approval")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4",
            filterStatus === "Ordered" ? "ring-2 ring-primary" : "",
            "border-l-blue-400"
          )}
          onClick={() => setFilterStatus(filterStatus === "Ordered" ? "all" : "Ordered")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ordered</p>
                <p className="text-xl font-bold mt-1">{poStats.orderedCount}</p>
              </div>
              <Badge variant="outline" className={getStatusBadgeColor("Ordered")}>
                {getStatusIcon("Ordered")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-l-4",
            filterStatus === "Received" ? "ring-2 ring-primary" : "",
            "border-l-emerald-400"
          )}
          onClick={() => setFilterStatus(filterStatus === "Received" ? "all" : "Received")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Received</p>
                <p className="text-xl font-bold mt-1">{poStats.receivedCount}</p>
              </div>
              <Badge variant="outline" className={getStatusBadgeColor("Received")}>
                {getStatusIcon("Received")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Purchase Order Management</CardTitle>
            <CardDescription>Create and manage supplier purchase orders</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            {canCreate && (
              <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create PO
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Purchase Order</DialogTitle>
                    <DialogDescription>Create a new purchase order for supplier items</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Main PO Information Card */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Purchase Order Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>PO Date *</Label>
                            <Input
                              type="date"
                              value={form.poDate}
                              onChange={(e) => setForm((prev) => ({ ...prev, poDate: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Supplier *</Label>
                            <Select value={form.supplierId} onValueChange={handleSupplierChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select supplier" />
                              </SelectTrigger>
                              <SelectContent>
                                {suppliersData.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Supplier ID</Label>
                            <Input value={form.supplierId} disabled placeholder="Auto-populated" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <Input value={form.supplierCountry} disabled placeholder="Auto-populated" />
                          </div>
                          <div className="space-y-2">
                            <Label>City</Label>
                            <Input value={form.supplierCity} disabled placeholder="Auto-populated" />
                          </div>
                          <div className="space-y-2">
                            <Label>Bill Number</Label>
                            <Input
                              value={form.billNumber}
                              onChange={(e) => setForm((prev) => ({ ...prev, billNumber: e.target.value }))}
                              placeholder="Invoice/bill reference"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Expected Delivery Date *</Label>
                            <Input
                              type="date"
                              value={form.expectedDeliveryDate}
                              onChange={(e) => setForm((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input
                              value={form.notes}
                              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                              placeholder="Optional notes..."
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Line Items Card */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Line Items</CardTitle>
                          <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                            <Plus className="h-4 w-4 mr-1" /> Add Item
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {form.items.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No items added. Click "Add Item" to add items.</p>
                        ) : (
                          <div className="space-y-2">
                            {form.items.map((item, index) => (
                              <div key={index} className="flex gap-2 items-end p-3 border rounded-lg">
                                <div className="flex-1 space-y-1">
                                  <Label className="text-xs">Item</Label>
                                  <Select value={item.inventoryItemId} onValueChange={(v) => handleItemChange(index, "inventoryItemId", v)}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {inventoryData.map((i) => (
                                        <SelectItem key={i.id} value={i.id}>{i.name} ({i.id})</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="w-24 space-y-1">
                                  <Label className="text-xs">Quantity</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                  />
                                </div>
                                <div className="w-28 space-y-1">
                                  <Label className="text-xs">Unit Price</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                                  />
                                </div>
                                <div className="w-28 space-y-1">
                                  <Label className="text-xs">Total</Label>
                                  <Input value={`₱${item.totalPrice.toFixed(2)}`} disabled />
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                            <div className="text-right font-semibold pt-2 border-t">
                              Grand Total: ₱{totalAmount.toFixed(2)}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Cancel</Button>
                      <Button onClick={handleCreate}>Create Purchase Order</Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search PO ID, supplier, or items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {PO_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

            {(searchTerm || filterStatus !== "all" || showArchived) && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Bulk Actions */}
          {hasSelection && canDelete && (
            <BulkActionsToolbar
              selectionCount={selectionCount}
              onClearSelection={deselectAll}
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
                  onClick: () => setBulkDeleteOpen(true),
                }] : []),
              ] : [
                {
                  id: "archive",
                  label: "Archive",
                  icon: <Archive className="h-4 w-4 mr-1" />,
                  variant: "outline",
                  onClick: () => setBulkDeleteOpen(true),
                },
              ]}
            />
          )}

          {/* Table */}
          {filteredData.length === 0 ? (
            <EmptyState
              icon={showArchived ? Archive : ShoppingBag}
              title={showArchived ? "No archived purchase orders" : "No purchase orders found"}
              description={showArchived
                ? "Archived purchase orders will appear here"
                : searchTerm || filterStatus !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first purchase order to get started"}
              actionLabel={!showArchived && canCreate ? "Create PO" : undefined}
              onAction={!showArchived && canCreate ? () => setIsAddOpen(true) : undefined}
            />
          ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            {/* Select All Pages Banner */}
            <SelectAllBanner
              pageItemCount={pageItemCount}
              totalItemCount={totalItemCount}
              isAllPagesSelected={isAllPagesSelected}
              show={isAllPageSelected && totalItemCount > pageItemCount}
              onSelectAllPages={selectAllPages}
              onClearSelection={deselectAll}
              itemLabel="orders"
            />

            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canDelete && (
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => { if (el) el.indeterminate = isPartiallySelected; }}
                        onChange={() => toggleAll()}
                        className="h-4 w-4"
                      />
                    </TableHead>
                  )}
                  <SortableTableHead
                    sortKey="poDate"
                    currentSortKey={sortColumn}
                    sortDirection={getSortDirection("poDate")}
                    onSort={handleSort}
                  >
                    Date
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="id"
                    currentSortKey={sortColumn}
                    sortDirection={getSortDirection("id")}
                    onSort={handleSort}
                  >
                    PO ID
                  </SortableTableHead>
                  <TableHead>Supplier ID</TableHead>
                  <SortableTableHead
                    sortKey="supplierName"
                    currentSortKey={sortColumn}
                    sortDirection={getSortDirection("supplierName")}
                    onSort={handleSort}
                  >
                    Supplier Name
                  </SortableTableHead>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>City</TableHead>
                  <SortableTableHead
                    sortKey="totalAmount"
                    currentSortKey={sortColumn}
                    sortDirection={getSortDirection("totalAmount")}
                    onSort={handleSort}
                    className="text-right"
                  >
                    Total Amount
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="totalPaid"
                    currentSortKey={sortColumn}
                    sortDirection={getSortDirection("totalPaid")}
                    onSort={handleSort}
                    className="text-right"
                  >
                    Total Paid
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="poBalance"
                    currentSortKey={sortColumn}
                    sortDirection={getSortDirection("poBalance")}
                    onSort={handleSort}
                    className="text-right"
                  >
                    PO Balance
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="status"
                    currentSortKey={sortColumn}
                    sortDirection={getSortDirection("status")}
                    onSort={handleSort}
                  >
                    MT Status
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="shippingStatus"
                    currentSortKey={sortColumn}
                    sortDirection={getSortDirection("shippingStatus")}
                    onSort={handleSort}
                  >
                    Shipping
                  </SortableTableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((po) => (
                  <TableRow key={po.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditDialog(po)}>
                    {canDelete && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected(po.id)}
                          onChange={() => toggleItem(po.id)}
                          className="h-4 w-4"
                        />
                      </TableCell>
                    )}
                    <TableCell className="whitespace-nowrap">{po.poDate ?? po.createdDate}</TableCell>
                    <TableCell className="font-medium">{po.id}</TableCell>
                    <TableCell className="text-muted-foreground">{po.supplierId}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <EditableCell
                        value={po.supplierId}
                        displayValue={po.supplierName}
                        type="select"
                        options={suppliersData.filter(s => s.status === "Active").map(s => ({ value: s.id, label: s.name }))}
                        onSave={(v) => {
                          const supplier = suppliersData.find(s => s.id === v);
                          return handleInlineUpdate(po.id, "supplierName", supplier?.name ?? "");
                        }}
                        disabled={po.status !== "Draft" || !canCreate}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{po.billNumber || "-"}</TableCell>
                    <TableCell>{po.supplierCountry || "-"}</TableCell>
                    <TableCell>{po.supplierCity || "-"}</TableCell>
                    <TableCell className="text-right font-medium">₱{(po.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">₱{(po.totalPaid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={cn((po.poBalance ?? po.totalAmount ?? 0) > 0 ? "text-orange-600" : "text-green-600")}>
                        ₱{(po.poBalance ?? po.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        po.shippingStatus === "Delivered" ? "default" :
                        po.shippingStatus === "In Transit" || po.shippingStatus === "Shipped" ? "secondary" :
                        po.shippingStatus === "Failed" || po.shippingStatus === "Returned" ? "destructive" :
                        "outline"
                      }>
                        {po.shippingStatus ?? "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {po.status === "Draft" && (
                          <Button size="sm" variant="outline" onClick={() => handleSubmitForApproval(po.id)} title="Submit for Approval">
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {po.status === "Pending Approval" && canApprove && (
                          <>
                            <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleApprove(po.id)} title="Approve">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleReject(po.id)} title="Reject">
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {po.status === "Approved" && (
                          <Button size="sm" variant="outline" onClick={() => handleMarkAsOrdered(po.id)} title="Mark as Ordered">
                            <ShoppingBag className="h-4 w-4" />
                          </Button>
                        )}
                        {(po.status === "Ordered" || po.status === "Partially Received") && canReceive && (
                          <Button size="sm" variant="outline" onClick={() => openReceiveDialog(po)} title="Receive Items">
                            <Package className="h-4 w-4" />
                          </Button>
                        )}
                        {!["Received", "Cancelled"].includes(po.status) && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleCancel(po.id)} title="Cancel">
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handlePrintPurchaseOrder(po)} title="Print PO">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onPageChange={goToPage}
            totalItems={totalItems}
          />
        </>
      )}

      {/* Edit Dialog */}
      {isEditOpen && (
        <Dialog open={!!isEditOpen} onOpenChange={(open) => { if (!open) { setIsEditOpen(null); resetForm(); } }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Purchase Order - {isEditOpen}</DialogTitle>
              <DialogDescription>Update purchase order details</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {(() => {
                const po = list.find((p) => p.id === isEditOpen);
                const canEdit = po?.status === "Draft";
                const SHIPPING_STATUSES = ["Pending", "Processing", "Shipped", "In Transit", "Out for Delivery", "Delivered", "Failed", "Returned"] as const;
                return (
                  <>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-sm text-muted-foreground">MT Status:</span>
                      {po && getStatusBadge(po.status)}
                      <span className="text-sm text-muted-foreground ml-4">Shipping:</span>
                      <Badge variant={
                        po?.shippingStatus === "Delivered" ? "default" :
                        po?.shippingStatus === "In Transit" || po?.shippingStatus === "Shipped" ? "secondary" :
                        po?.shippingStatus === "Failed" || po?.shippingStatus === "Returned" ? "destructive" :
                        "outline"
                      }>
                        {po?.shippingStatus ?? "Pending"}
                      </Badge>
                    </div>

                    {/* PO Information Card */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Purchase Order Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>PO Date</Label>
                            <Input
                              type="date"
                              value={form.poDate}
                              onChange={(e) => setForm((prev) => ({ ...prev, poDate: e.target.value }))}
                              disabled={!canEdit}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Supplier</Label>
                            <Select value={form.supplierId} onValueChange={handleSupplierChange} disabled={!canEdit}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select supplier" />
                              </SelectTrigger>
                              <SelectContent>
                                {suppliersData.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Supplier ID</Label>
                            <Input value={form.supplierId} disabled />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <Input value={form.supplierCountry} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>City</Label>
                            <Input value={form.supplierCity} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Bill Number</Label>
                            <Input
                              value={form.billNumber}
                              onChange={(e) => setForm((prev) => ({ ...prev, billNumber: e.target.value }))}
                              placeholder="Invoice/bill reference"
                              disabled={!canEdit}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Expected Delivery Date</Label>
                            <Input
                              type="date"
                              value={form.expectedDeliveryDate}
                              onChange={(e) => setForm((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                              disabled={!canEdit}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Total Paid</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={form.totalPaid}
                              onChange={(e) => setForm((prev) => ({ ...prev, totalPaid: Number(e.target.value) || 0 }))}
                              disabled={!canEdit}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Shipping Status</Label>
                            <Select value={form.shippingStatus} onValueChange={(v) => setForm((prev) => ({ ...prev, shippingStatus: v as typeof form.shippingStatus }))} disabled={!canEdit}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                {SHIPPING_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Input
                            value={form.notes}
                            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                            placeholder="Optional notes..."
                            disabled={!canEdit}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Line Items Card */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Line Items</CardTitle>
                          {canEdit && (
                            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                              <Plus className="h-4 w-4 mr-1" /> Add Item
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {form.items.map((item, index) => (
                            <div key={index} className="flex gap-2 items-end p-3 border rounded-lg">
                              <div className="flex-1 space-y-1">
                                <Label className="text-xs">Item</Label>
                                <Select value={item.inventoryItemId} onValueChange={(v) => handleItemChange(index, "inventoryItemId", v)} disabled={!canEdit}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select item" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {inventoryData.map((i) => (
                                      <SelectItem key={i.id} value={i.id}>{i.name} ({i.id})</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-24 space-y-1">
                                <Label className="text-xs">Quantity</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="w-28 space-y-1">
                                <Label className="text-xs">Unit Price</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="w-28 space-y-1">
                                <Label className="text-xs">Total</Label>
                                <Input value={`₱${item.totalPrice.toFixed(2)}`} disabled />
                              </div>
                              {canEdit && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-2 border-t">
                            <div className="text-sm text-muted-foreground">
                              PO Balance: <span className={cn((totalAmount - form.totalPaid) > 0 ? "text-orange-600 font-medium" : "text-green-600 font-medium")}>
                                ₱{(totalAmount - form.totalPaid).toFixed(2)}
                              </span>
                            </div>
                            <div className="font-semibold">
                              Grand Total: ₱{totalAmount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-between">
                      {po?.archived ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => handleRestore(isEditOpen)}
                          >
                            <ArchiveRestore className="h-4 w-4 mr-2" />
                            Restore
                          </Button>
                          {canPermanentlyDelete && (
                            <Button
                              variant="destructive"
                              onClick={() => handlePermanentDelete(isEditOpen)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Permanently Delete
                            </Button>
                          )}
                        </>
                      ) : (
                        canDelete && ["Draft", "Cancelled", "Rejected"].includes(po?.status ?? "") && (
                          <Button
                            variant="outline"
                            onClick={() => handleArchive(isEditOpen)}
                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </Button>
                        )
                      )}
                      <div className="flex gap-2 ml-auto">
                        {po && (
                          <Button variant="outline" onClick={() => handlePrintPurchaseOrder(po)}>
                            <Printer className="h-4 w-4 mr-2" />
                            Print PO
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => { setIsEditOpen(null); resetForm(); }}>Close</Button>
                        {canEdit && !po?.archived && <Button onClick={() => handleUpdate(isEditOpen)}>Save Changes</Button>}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Receive Dialog */}
      {isReceiveOpen && (
        <Dialog open={!!isReceiveOpen} onOpenChange={(open) => { if (!open) setIsReceiveOpen(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Receive Items - {isReceiveOpen}</DialogTitle>
              <DialogDescription>Enter quantities received for each item</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {(() => {
                const po = list.find((p) => p.id === isReceiveOpen);
                if (!po) return null;
                return (
                  <>
                    <div className="space-y-2">
                      {(po.items ?? []).map((item) => {
                        const remaining = item.quantity - (item.quantityReceived ?? 0);
                        return (
                          <div key={item.inventoryItemId} className="flex items-center gap-4 p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium">{item.itemName}</p>
                              <p className="text-sm text-muted-foreground">
                                Ordered: {item.quantity} | Received: {item.quantityReceived ?? 0} | Remaining: {remaining}
                              </p>
                            </div>
                            <div className="w-32">
                              <Label className="text-xs">Receive Qty</Label>
                              <Input
                                type="number"
                                min="0"
                                max={remaining}
                                value={receiveForm[item.inventoryItemId] ?? 0}
                                onChange={(e) => setReceiveForm((prev) => ({
                                  ...prev,
                                  [item.inventoryItemId]: Math.min(Number(e.target.value) || 0, remaining),
                                }))}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <Label>Actual Cost (optional)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={actualCost ?? ""}
                        onChange={(e) => setActualCost(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder={`Expected: ₱${po.totalAmount.toFixed(2)}`}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsReceiveOpen(null)}>Cancel</Button>
                      <Button onClick={() => handleReceive(isReceiveOpen)}>
                        <Package className="h-4 w-4 mr-2" /> Receive Items
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}

          {/* Bulk Delete/Archive Dialog */}
          <BulkDeleteDialog
            open={bulkDeleteOpen}
            onOpenChange={setBulkDeleteOpen}
            itemCount={selectionCount}
            itemType="purchase orders"
            onConfirm={showArchived ? handleBulkPermanentDelete : handleBulkArchive}
            title={showArchived ? "Permanently Delete Purchase Orders" : "Archive Purchase Orders"}
            description={showArchived
              ? `Are you sure you want to permanently delete ${selectionCount} purchase order${selectionCount !== 1 ? "s" : ""}? This action cannot be undone.`
              : `Are you sure you want to archive ${selectionCount} purchase order${selectionCount !== 1 ? "s" : ""}? Archived purchase orders can be restored later.`
            }
            confirmLabel={showArchived ? "Permanently Delete" : "Archive"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
