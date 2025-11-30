import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
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
import { Plus, Search, Filter, ShoppingBag, Trash2, Check, X, Package, Send, Download, ChevronDown, ChevronUp } from "lucide-react";
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
} from "../services/api";
import type { PurchaseOrder, POStatus, POLineItem, Supplier, InventoryItem } from "../types";
import { TableLoadingSkeleton } from "./ui/loading-skeleton";
import { EmptyState } from "./ui/empty-state";
import { useDebounce } from "../hooks/useDebounce";
import { usePagination } from "../hooks/usePagination";
import { useBatchSelection } from "../hooks/useBatchSelection";
import { PaginationControls } from "./ui/pagination-controls";
import { BulkActionsToolbar } from "./ui/bulk-actions-toolbar";
import { BulkDeleteDialog } from "./ui/bulk-delete-dialog";
import { cn } from "./ui/utils";
import { useAuth } from "../context/auth-context";
import { getUserRole, hasPermission } from "../lib/permissions";

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
    supplierId: "",
    supplierName: "",
    items: [] as { inventoryItemId: string; itemName: string; quantity: number; unitPrice: number; totalPrice: number }[],
    expectedDeliveryDate: "",
    notes: "",
  });

  // Receive form state
  const [receiveForm, setReceiveForm] = useState<{ [itemId: string]: number }>({});
  const [actualCost, setActualCost] = useState<number | undefined>(undefined);

  // Bulk operations
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const {
    selectedIds,
    toggleItem,
    toggleAll,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    selectionCount,
    hasSelection,
    deselectAll,
  } = useBatchSelection<string>();

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const list = useMemo<PurchaseOrder[]>(() => purchaseOrdersData ?? [], [purchaseOrdersData]);

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
      setForm({
        supplierId: prefilledItem.supplierId,
        supplierName: prefilledItem.supplierName,
        items: [{
          inventoryItemId: prefilledItem.inventoryItemId,
          itemName: prefilledItem.itemName,
          quantity: prefilledItem.quantity,
          unitPrice: prefilledItem.unitPrice,
          totalPrice: prefilledItem.quantity * prefilledItem.unitPrice,
        }],
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: "",
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

    // Search filter
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(
        (po) =>
          po.id.toLowerCase().includes(term) ||
          po.supplierName.toLowerCase().includes(term) ||
          po.items.some((item) => item.itemName.toLowerCase().includes(term))
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
  }, [list, debouncedSearchTerm, filterStatus, sortColumn, sortDirection]);

  const { paginatedData, currentPage, totalPages, setCurrentPage, pageSize, setPageSize } = usePagination(filteredData, 10);

  const handleSort = (column: keyof PurchaseOrder) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: keyof PurchaseOrder }) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
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
    return <Badge variant={variant} className={className}>{status}</Badge>;
  };

  const resetForm = () => {
    setForm({
      supplierId: "",
      supplierName: "",
      items: [],
      expectedDeliveryDate: "",
      notes: "",
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
    }));
  };

  const handleCreate = async () => {
    if (!form.supplierId || form.items.length === 0 || !form.expectedDeliveryDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const newPO = await createPurchaseOrder({
        supplierId: form.supplierId,
        supplierName: form.supplierName,
        items: form.items,
        expectedDeliveryDate: form.expectedDeliveryDate,
        notes: form.notes,
        createdBy: user?.id ?? "1",
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
        supplierId: form.supplierId,
        supplierName: form.supplierName,
        items: form.items,
        expectedDeliveryDate: form.expectedDeliveryDate,
        notes: form.notes,
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
    po.items.forEach((item) => {
      const remaining = item.quantity - (item.quantityReceived ?? 0);
      initialReceive[item.inventoryItemId] = remaining;
    });
    setReceiveForm(initialReceive);
    setActualCost(po.totalAmount);
    setIsReceiveOpen(po.id);
  };

  const handleReceive = async (id: string) => {
    try {
      const receivedItems = Object.entries(receiveForm)
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

  const openEditDialog = (po: PurchaseOrder) => {
    setForm({
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      items: po.items.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      expectedDeliveryDate: po.expectedDeliveryDate,
      notes: po.notes,
    });
    setIsEditOpen(po.id);
  };

  const exportToCSV = () => {
    const headers = ["PO ID", "Supplier", "Items", "Total Amount", "Status", "Created Date", "Expected Delivery", "Notes"];
    const rows = filteredData.map((po) => [
      po.id,
      po.supplierName,
      po.items.map((i) => `${i.itemName} (${i.quantity})`).join("; "),
      po.totalAmount.toFixed(2),
      po.status,
      po.createdDate,
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

  if (isLoading) {
    return (
      <div className="p-6">
        <TableLoadingSkeleton rows={8} columns={7} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage purchase orders and supplier orders</p>
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
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                  <DialogDescription>Create a new purchase order for supplier items</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label>Expected Delivery Date *</Label>
                      <Input
                        type="date"
                        value={form.expectedDeliveryDate}
                        onChange={(e) => setForm((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Line Items *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                        <Plus className="h-4 w-4 mr-1" /> Add Item
                      </Button>
                    </div>
                    {form.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No items added. Click "Add Item" to add items.</p>
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
                        <div className="text-right font-semibold">
                          Total: ₱{totalAmount.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Optional notes..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Cancel</Button>
                    <Button onClick={handleCreate}>Create Purchase Order</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

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
      </div>

      {/* Bulk Actions */}
      {hasSelection && canDelete && (
        <BulkActionsToolbar
          selectedCount={selectionCount}
          onDeselectAll={deselectAll}
          actions={[
            { label: "Delete Selected", onClick: () => setBulkDeleteOpen(true), variant: "destructive" },
          ]}
        />
      )}

      {/* Table */}
      {filteredData.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No purchase orders found"
          description={searchTerm || filterStatus !== "all" ? "Try adjusting your search or filters" : "Create your first purchase order to get started"}
          action={canCreate ? { label: "Create PO", onClick: () => setIsAddOpen(true) } : undefined}
        />
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {canDelete && (
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected(paginatedData.map((po) => po.id))}
                        ref={(el) => { if (el) el.indeterminate = isPartiallySelected(paginatedData.map((po) => po.id)); }}
                        onChange={() => toggleAll(paginatedData.map((po) => po.id))}
                        className="h-4 w-4"
                      />
                    </TableHead>
                  )}
                  <TableHead className="cursor-pointer" onClick={() => handleSort("id")}>
                    <div className="flex items-center gap-1">PO ID <SortIcon column="id" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("supplierName")}>
                    <div className="flex items-center gap-1">Supplier <SortIcon column="supplierName" /></div>
                  </TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => handleSort("totalAmount")}>
                    <div className="flex items-center justify-end gap-1">Total <SortIcon column="totalAmount" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                    <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("createdDate")}>
                    <div className="flex items-center gap-1">Created <SortIcon column="createdDate" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("expectedDeliveryDate")}>
                    <div className="flex items-center gap-1">Expected <SortIcon column="expectedDeliveryDate" /></div>
                  </TableHead>
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
                    <TableCell className="font-medium">{po.id}</TableCell>
                    <TableCell>{po.supplierName}</TableCell>
                    <TableCell>
                      <span className="text-sm">{po.items.length} item{po.items.length !== 1 ? "s" : ""}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">₱{po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell>{po.createdDate}</TableCell>
                    <TableCell>{po.expectedDeliveryDate}</TableCell>
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            totalItems={filteredData.length}
          />
        </>
      )}

      {/* Edit Dialog */}
      {isEditOpen && (
        <Dialog open={!!isEditOpen} onOpenChange={(open) => { if (!open) { setIsEditOpen(null); resetForm(); } }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Purchase Order - {isEditOpen}</DialogTitle>
              <DialogDescription>Update purchase order details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {(() => {
                const po = list.find((p) => p.id === isEditOpen);
                const canEdit = po?.status === "Draft";
                return (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      {po && getStatusBadge(po.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                        <Label>Expected Delivery Date</Label>
                        <Input
                          type="date"
                          value={form.expectedDeliveryDate}
                          onChange={(e) => setForm((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Line Items</Label>
                        {canEdit && (
                          <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                            <Plus className="h-4 w-4 mr-1" /> Add Item
                          </Button>
                        )}
                      </div>
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
                        <div className="text-right font-semibold">
                          Total: ₱{totalAmount.toFixed(2)}
                        </div>
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

                    <div className="flex justify-between">
                      {canDelete && ["Draft", "Cancelled", "Rejected"].includes(po?.status ?? "") && (
                        <Button variant="destructive" onClick={() => handleDelete(isEditOpen)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </Button>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <Button variant="outline" onClick={() => { setIsEditOpen(null); resetForm(); }}>Close</Button>
                        {canEdit && <Button onClick={() => handleUpdate(isEditOpen)}>Save Changes</Button>}
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
                      {po.items.map((item) => {
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

      {/* Bulk Delete Dialog */}
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        itemCount={selectionCount}
        itemType="purchase orders"
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
