import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  getSalesOrders,
  getCustomers,
  getInventory,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  archiveSalesOrder,
  restoreSalesOrder,
  permanentlyDeleteSalesOrder,
  bulkDeleteSalesOrders,
  bulkArchiveSalesOrders,
  bulkRestoreSalesOrders,
  bulkPermanentlyDeleteSalesOrders,
} from "@/services/api";
import type { SalesOrder, Customer, InventoryItem, SOLineItem, ReceiptStatus, ShippingStatus } from "@/types";
import { useAuth } from "@/context/auth-context";
import { getUserRole, hasPermission } from "@/lib/permissions";
import { useBatchSelection } from "@/hooks/useBatchSelection";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/components/ui/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { BulkActionsToolbar } from "@/components/ui/bulk-actions-toolbar";
import { BulkDeleteDialog } from "@/components/ui/bulk-delete-dialog";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import type { SortDirection } from "@/hooks/useTableSort";
import {
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  X,
  Archive,
  ArchiveRestore,
  FileText,
  DollarSign,
  Clock,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";

const RECEIPT_STATUSES: ReceiptStatus[] = ["Unpaid", "Partially Paid", "Paid", "Overdue"];
const SHIPPING_STATUSES: ShippingStatus[] = ["Pending", "Processing", "Shipped", "In Transit", "Out for Delivery", "Delivered", "Failed", "Returned"];

interface SOFormState {
  soDate: string;
  customerId: string;
  customerName: string;
  customerCountry: string;
  customerCity: string;
  invoiceNumber: string;
  items: Omit<SOLineItem, "quantityShipped">[];
  expectedDeliveryDate: string;
  notes: string;
  totalReceived: number;
  shippingStatus: ShippingStatus;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
};

export function SalesOrdersView() {
  const { user } = useAuth();
  const userRole = user ? getUserRole(user.id) : "Viewer";
  // Use purchase_orders permissions as sales orders have similar access control
  const canCreate = hasPermission(userRole, "purchase_orders:create");
  const canEdit = hasPermission(userRole, "purchase_orders:update");
  const canDelete = hasPermission(userRole, "purchase_orders:delete");
  const canPermanentlyDelete = userRole === "Owner" || userRole === "Admin";

  const [salesOrdersData, setSalesOrdersData] = useState<SalesOrder[] | null>(null);
  const [customersData, setCustomersData] = useState<Customer[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof SalesOrder | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [form, setForm] = useState<SOFormState>({
    soDate: new Date().toISOString().split("T")[0],
    customerId: "",
    customerName: "",
    customerCountry: "",
    customerCity: "",
    invoiceNumber: "",
    items: [],
    expectedDeliveryDate: "",
    notes: "",
    totalReceived: 0,
    shippingStatus: "Pending",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [soData, custData, invData] = await Promise.all([
          getSalesOrders(),
          getCustomers(),
          getInventory(),
        ]);
        setSalesOrdersData(soData);
        setCustomersData(custData);
        setInventoryData(invData);
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const list = salesOrdersData ?? [];

  const filteredData = useMemo(() => {
    return list.filter((so) => {
      // Filter by archived status (treat undefined as false)
      const isArchived = so.archived === true;
      if (showArchived !== isArchived) return false;

      const matchesSearch =
        !debouncedSearch ||
        so.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        so.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        so.items.some((i) => i.itemName.toLowerCase().includes(debouncedSearch.toLowerCase()));

      const matchesStatus = filterStatus === "all" || so.receiptStatus === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [list, debouncedSearch, filterStatus, showArchived]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDirection === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination
  const { currentPage, totalPages, paginatedData, goToPage, itemsPerPage, totalItems } = usePagination(sortedData, 10);

  // Batch selection
  const { selectedIds, isSelected, toggleItem, toggleAll, deselectAll, isAllSelected, isPartiallySelected, selectionCount, hasSelection } = useBatchSelection(paginatedData.map((so) => so.id));

  // Statistics
  const soStats = useMemo(() => {
    const activeOrders = list.filter((so) => !so.archived);
    const totalSOs = activeOrders.length;
    const totalValue = activeOrders.reduce((sum, so) => sum + so.totalAmount, 0);
    const totalReceived = activeOrders.reduce((sum, so) => sum + so.totalReceived, 0);
    const paidCount = activeOrders.filter((so) => so.receiptStatus === "Paid").length;
    const unpaidCount = activeOrders.filter((so) => so.receiptStatus === "Unpaid").length;
    const partiallyPaidCount = activeOrders.filter((so) => so.receiptStatus === "Partially Paid").length;
    const overdueCount = activeOrders.filter((so) => so.receiptStatus === "Overdue").length;
    const deliveredCount = activeOrders.filter((so) => so.shippingStatus === "Delivered").length;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = activeOrders.filter((so) => new Date(so.createdDate) >= oneWeekAgo).length;

    return {
      totalSOs,
      totalValue,
      totalReceived,
      outstandingBalance: totalValue - totalReceived,
      paidCount,
      unpaidCount,
      partiallyPaidCount,
      overdueCount,
      deliveredCount,
      newThisWeek,
      avgOrderValue: totalSOs > 0 ? totalValue / totalSOs : 0,
      collectionRate: totalValue > 0 ? Math.round((totalReceived / totalValue) * 100) : 0,
    };
  }, [list]);

  const handleSort = (column: string) => {
    const key = column as keyof SalesOrder;
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

  const getSortDirection = (column: keyof SalesOrder): SortDirection => {
    if (sortColumn === column) return sortDirection;
    return null;
  };

  const getReceiptStatusBadge = (status: ReceiptStatus) => {
    const variants: Record<ReceiptStatus, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
      Unpaid: { variant: "outline", className: "border-gray-500 text-gray-600" },
      "Partially Paid": { variant: "outline", className: "border-yellow-500 text-yellow-600" },
      Paid: { variant: "default", className: "bg-green-500" },
      Overdue: { variant: "destructive" },
    };
    const { variant, className } = variants[status];
    return <Badge variant={variant} className={cn("gap-1", className)}>{status}</Badge>;
  };

  const resetForm = () => {
    setForm({
      soDate: new Date().toISOString().split("T")[0],
      customerId: "",
      customerName: "",
      customerCountry: "",
      customerCity: "",
      invoiceNumber: "",
      items: [],
      expectedDeliveryDate: "",
      notes: "",
      totalReceived: 0,
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
        newItems[index] = { ...newItems[index], quantity: qty, totalPrice: qty * newItems[index].unitPrice };
      } else if (field === "unitPrice") {
        const price = Number(value) || 0;
        newItems[index] = { ...newItems[index], unitPrice: price, totalPrice: newItems[index].quantity * price };
      }
      return { ...prev, items: newItems };
    });
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customersData.find((c) => c.id === customerId);
    setForm((prev) => ({
      ...prev,
      customerId,
      customerName: customer?.name ?? "",
      customerCountry: customer?.country ?? "",
      customerCity: customer?.city ?? "",
    }));
  };

  const handleCreate = async () => {
    if (!form.customerId || form.items.length === 0 || !form.expectedDeliveryDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const newSO = await createSalesOrder({
        soDate: form.soDate,
        customerId: form.customerId,
        customerName: form.customerName,
        customerCountry: form.customerCountry,
        customerCity: form.customerCity,
        invoiceNumber: form.invoiceNumber,
        items: form.items.map((item) => ({ ...item, quantityShipped: 0 })),
        expectedDeliveryDate: form.expectedDeliveryDate,
        notes: form.notes,
        createdBy: user?.id ?? "1",
        totalReceived: form.totalReceived,
      });
      setSalesOrdersData((prev) => [newSO, ...(prev ?? [])]);
      toast.success(`Sales Order ${newSO.id} created successfully`);
      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create sales order");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!form.customerId || form.items.length === 0 || !form.expectedDeliveryDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const updated = await updateSalesOrder({
        id,
        soDate: form.soDate,
        customerId: form.customerId,
        customerName: form.customerName,
        customerCountry: form.customerCountry,
        customerCity: form.customerCity,
        invoiceNumber: form.invoiceNumber,
        items: form.items.map((item) => ({ ...item, quantityShipped: 0 })),
        expectedDeliveryDate: form.expectedDeliveryDate,
        notes: form.notes,
        totalReceived: form.totalReceived,
        shippingStatus: form.shippingStatus,
      });
      setSalesOrdersData((prev) => prev?.map((so) => (so.id === id ? updated : so)) ?? []);
      toast.success(`Sales Order ${id} updated successfully`);
      setIsEditOpen(null);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update sales order");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSalesOrder(id);
      setSalesOrdersData((prev) => prev?.filter((so) => so.id !== id) ?? []);
      toast.success(`Sales Order ${id} deleted`);
      setIsEditOpen(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete sales order");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveSalesOrder(id);
      setSalesOrdersData((prev) => prev?.map((so) => (so.id === id ? { ...so, archived: true } : so)) ?? []);
      toast.success(`Sales Order ${id} archived`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to archive sales order");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreSalesOrder(id);
      setSalesOrdersData((prev) => prev?.map((so) => (so.id === id ? { ...so, archived: false } : so)) ?? []);
      toast.success(`Sales Order ${id} restored`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore sales order");
    }
  };

  const handleBulkArchive = async () => {
    try {
      const result = await bulkArchiveSalesOrders(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${result.successCount} sales orders archived`);
      } else {
        toast.warning(`${result.successCount} archived, ${result.failedCount} failed`);
      }
      const updatedSOs = await getSalesOrders();
      setSalesOrdersData(updatedSOs);
      deselectAll();
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error("Failed to archive sales orders");
    }
  };

  const handleBulkRestore = async () => {
    try {
      const result = await bulkRestoreSalesOrders(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${result.successCount} sales orders restored`);
      } else {
        toast.warning(`${result.successCount} restored, ${result.failedCount} failed`);
      }
      const updatedSOs = await getSalesOrders();
      setSalesOrdersData(updatedSOs);
      deselectAll();
    } catch (error) {
      toast.error("Failed to restore sales orders");
    }
  };

  const handleBulkPermanentDelete = async () => {
    try {
      const result = await bulkPermanentlyDeleteSalesOrders(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${result.successCount} sales orders permanently deleted`);
      } else {
        toast.warning(`${result.successCount} deleted, ${result.failedCount} failed`);
      }
      setSalesOrdersData((prev) => prev?.filter((so) => !selectedIds.has(so.id)) ?? []);
      deselectAll();
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error("Failed to permanently delete sales orders");
    }
  };

  const openEditDialog = (so: SalesOrder) => {
    setForm({
      soDate: so.soDate ?? so.createdDate,
      customerId: so.customerId,
      customerName: so.customerName,
      customerCountry: so.customerCountry ?? "",
      customerCity: so.customerCity ?? "",
      invoiceNumber: so.invoiceNumber ?? "",
      items: (so.items ?? []).map((item) => ({
        inventoryItemId: item.inventoryItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      expectedDeliveryDate: so.expectedDeliveryDate ?? "",
      notes: so.notes ?? "",
      totalReceived: so.totalReceived ?? 0,
      shippingStatus: so.shippingStatus ?? "Pending",
    });
    setIsEditOpen(so.id);
  };

  const exportToCSV = () => {
    const headers = ["Date", "SO ID", "Customer ID", "Customer Name", "Invoice #", "Country", "City", "Items", "Total Amount", "Total Received", "SO Balance", "Receipt Status", "Shipping Status", "Expected Delivery", "Notes"];
    const rows = filteredData.map((so) => [
      so.soDate ?? so.createdDate,
      so.id,
      so.customerId,
      so.customerName,
      so.invoiceNumber ?? "",
      so.customerCountry ?? "",
      so.customerCity ?? "",
      (so.items ?? []).map((i) => `${i.itemName} (${i.quantity})`).join("; "),
      (so.totalAmount ?? 0).toFixed(2),
      (so.totalReceived ?? 0).toFixed(2),
      (so.soBalance ?? so.totalAmount ?? 0).toFixed(2),
      so.receiptStatus,
      so.shippingStatus ?? "Pending",
      so.expectedDeliveryDate ?? "",
      so.notes ?? "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Sales orders exported to CSV");
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setShowArchived(false);
  };

  const totalAmount = useMemo(() => form.items.reduce((sum, item) => sum + item.totalPrice, 0), [form.items]);

  if (isLoading) {
    return (
      <div className="p-6">
        <TableLoadingSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total SOs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{soStats.totalSOs}</div>
            <p className="text-xs text-muted-foreground mt-1">{soStats.newThisWeek} new this week</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(soStats.totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Avg: {formatCurrency(soStats.avgOrderValue)} per SO</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(soStats.outstandingBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">{soStats.unpaidCount} unpaid, {soStats.overdueCount} overdue</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{soStats.collectionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{soStats.paidCount} paid of {soStats.totalSOs} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sales Orders</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Manage customer sales orders</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
            {canCreate && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Create SO
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Sales Order</DialogTitle>
                    <DialogDescription>Create a new sales order for a customer</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* SO Information Card */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Sales Order Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>SO Date *</Label>
                            <Input type="date" value={form.soDate} onChange={(e) => setForm((prev) => ({ ...prev, soDate: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Customer *</Label>
                            <Select value={form.customerId} onValueChange={handleCustomerChange}>
                              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                              <SelectContent>
                                {customersData.filter((c) => c.status === "Active").map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Customer ID</Label>
                            <Input value={form.customerId} disabled className="bg-muted" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <Input value={form.customerCountry} disabled className="bg-muted" />
                          </div>
                          <div className="space-y-2">
                            <Label>City</Label>
                            <Input value={form.customerCity} disabled className="bg-muted" />
                          </div>
                          <div className="space-y-2">
                            <Label>Invoice #</Label>
                            <Input value={form.invoiceNumber} onChange={(e) => setForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))} placeholder="INV-2025-0001" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Expected Delivery Date *</Label>
                            <Input type="date" value={form.expectedDeliveryDate} onChange={(e) => setForm((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Total Received (₱)</Label>
                            <Input type="number" min="0" step="0.01" value={form.totalReceived} onChange={(e) => setForm((prev) => ({ ...prev, totalReceived: parseFloat(e.target.value) || 0 }))} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Input value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Additional notes..." />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Line Items Card */}
                    <Card>
                      <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Line Items</CardTitle>
                        <Button size="sm" variant="outline" onClick={handleAddItem}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Item
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {form.items.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No items added. Click "Add Item" to add line items.</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="w-24">Qty</TableHead>
                                <TableHead className="w-32">Unit Price</TableHead>
                                <TableHead className="w-32 text-right">Total</TableHead>
                                <TableHead className="w-12"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {form.items.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <Select value={item.inventoryItemId} onValueChange={(v) => handleItemChange(index, "inventoryItemId", v)}>
                                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                                      <SelectContent>
                                        {inventoryData.map((inv) => (
                                          <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} />
                                  </TableCell>
                                  <TableCell>
                                    <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)} />
                                  </TableCell>
                                  <TableCell className="text-right font-medium">₱{item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell>
                                    <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                        <div className="mt-4 pt-4 border-t flex justify-between items-center">
                          <div>
                            <span className="text-sm text-muted-foreground">Grand Total:</span>
                            <span className="ml-2 text-xl font-bold">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">SO Balance:</span>
                            <span className={cn("ml-2 text-xl font-bold", (totalAmount - form.totalReceived) > 0 ? "text-orange-600" : "text-green-600")}>
                              ₱{(totalAmount - form.totalReceived).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Cancel</Button>
                      <Button onClick={handleCreate}>Create Sales Order</Button>
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
              <Input placeholder="Search SO ID, customer, or items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {RECEIPT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant={showArchived ? "default" : "outline"} size="sm" onClick={() => setShowArchived(!showArchived)} className={showArchived ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}>
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
                { id: "restore", label: "Restore", icon: <ArchiveRestore className="h-4 w-4 mr-1" />, variant: "outline", onClick: handleBulkRestore },
                ...(canPermanentlyDelete ? [{ id: "permanent-delete", label: "Permanently Delete", icon: <Trash2 className="h-4 w-4 mr-1" />, variant: "destructive" as const, onClick: () => setBulkDeleteOpen(true) }] : []),
              ] : [
                { id: "archive", label: "Archive", icon: <Archive className="h-4 w-4 mr-1" />, variant: "outline", onClick: () => setBulkDeleteOpen(true) },
              ]}
            />
          )}

          {/* Table */}
          {filteredData.length === 0 ? (
            <EmptyState
              icon={showArchived ? Archive : ShoppingCart}
              title={showArchived ? "No archived sales orders" : "No sales orders found"}
              description={showArchived ? "Archived sales orders will appear here" : searchTerm || filterStatus !== "all" ? "Try adjusting your search or filters" : "Create your first sales order to get started"}
              actionLabel={!showArchived && canCreate ? "Create SO" : undefined}
              onAction={!showArchived && canCreate ? () => setIsAddOpen(true) : undefined}
            />
          ) : (
            <>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canDelete && (
                        <TableHead className="w-12">
                          <input type="checkbox" checked={isAllSelected} ref={(el) => { if (el) el.indeterminate = isPartiallySelected; }} onChange={() => toggleAll()} className="h-4 w-4" />
                        </TableHead>
                      )}
                      <SortableTableHead sortKey="soDate" currentSortKey={sortColumn} sortDirection={getSortDirection("soDate")} onSort={handleSort}>Date</SortableTableHead>
                      <SortableTableHead sortKey="id" currentSortKey={sortColumn} sortDirection={getSortDirection("id")} onSort={handleSort}>SO ID</SortableTableHead>
                      <TableHead>Customer ID</TableHead>
                      <SortableTableHead sortKey="customerName" currentSortKey={sortColumn} sortDirection={getSortDirection("customerName")} onSort={handleSort}>Customer Name</SortableTableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>City</TableHead>
                      <SortableTableHead sortKey="totalAmount" currentSortKey={sortColumn} sortDirection={getSortDirection("totalAmount")} onSort={handleSort} className="text-right">Total Amount</SortableTableHead>
                      <SortableTableHead sortKey="totalReceived" currentSortKey={sortColumn} sortDirection={getSortDirection("totalReceived")} onSort={handleSort} className="text-right">Total Received</SortableTableHead>
                      <SortableTableHead sortKey="soBalance" currentSortKey={sortColumn} sortDirection={getSortDirection("soBalance")} onSort={handleSort} className="text-right">SO Balance</SortableTableHead>
                      <SortableTableHead sortKey="receiptStatus" currentSortKey={sortColumn} sortDirection={getSortDirection("receiptStatus")} onSort={handleSort}>Receipt Status</SortableTableHead>
                      <SortableTableHead sortKey="shippingStatus" currentSortKey={sortColumn} sortDirection={getSortDirection("shippingStatus")} onSort={handleSort}>Shipping</SortableTableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((so) => (
                      <TableRow key={so.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditDialog(so)}>
                        {canDelete && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected(so.id)} onChange={() => toggleItem(so.id)} className="h-4 w-4" />
                          </TableCell>
                        )}
                        <TableCell className="whitespace-nowrap">{so.soDate ?? so.createdDate}</TableCell>
                        <TableCell className="font-medium">{so.id}</TableCell>
                        <TableCell className="text-muted-foreground">{so.customerId}</TableCell>
                        <TableCell>{so.customerName}</TableCell>
                        <TableCell className="text-muted-foreground">{so.invoiceNumber || "-"}</TableCell>
                        <TableCell>{so.customerCountry || "-"}</TableCell>
                        <TableCell>{so.customerCity || "-"}</TableCell>
                        <TableCell className="text-right font-medium">₱{(so.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">₱{(so.totalReceived ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={cn((so.soBalance ?? so.totalAmount ?? 0) > 0 ? "text-orange-600" : "text-green-600")}>
                            ₱{(so.soBalance ?? so.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>{getReceiptStatusBadge(so.receiptStatus)}</TableCell>
                        <TableCell>
                          <Badge variant={so.shippingStatus === "Delivered" ? "default" : so.shippingStatus === "In Transit" || so.shippingStatus === "Shipped" ? "secondary" : so.shippingStatus === "Failed" || so.shippingStatus === "Returned" ? "destructive" : "outline"}>
                            {so.shippingStatus ?? "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            {showArchived ? (
                              <Button size="sm" variant="outline" onClick={() => handleRestore(so.id)} title="Restore">
                                <ArchiveRestore className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleArchive(so.id)} title="Archive">
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <PaginationControls currentPage={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} onPageChange={goToPage} totalItems={totalItems} />
            </>
          )}

          {/* Edit Dialog */}
          {isEditOpen && (
            <Dialog open={!!isEditOpen} onOpenChange={(open) => { if (!open) { setIsEditOpen(null); resetForm(); } }}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Sales Order - {isEditOpen}</DialogTitle>
                  <DialogDescription>Update sales order details</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {(() => {
                    const so = list.find((s) => s.id === isEditOpen);
                    return (
                      <>
                        <div className="flex items-center gap-4 mb-4">
                          <span className="text-sm text-muted-foreground">Receipt Status:</span>
                          {so && getReceiptStatusBadge(so.receiptStatus)}
                          <span className="text-sm text-muted-foreground ml-4">Shipping:</span>
                          <Badge variant={so?.shippingStatus === "Delivered" ? "default" : so?.shippingStatus === "In Transit" || so?.shippingStatus === "Shipped" ? "secondary" : so?.shippingStatus === "Failed" || so?.shippingStatus === "Returned" ? "destructive" : "outline"}>
                            {so?.shippingStatus ?? "Pending"}
                          </Badge>
                        </div>

                        {/* SO Information Card */}
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Sales Order Information</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>SO Date</Label>
                                <Input type="date" value={form.soDate} onChange={(e) => setForm((prev) => ({ ...prev, soDate: e.target.value }))} />
                              </div>
                              <div className="space-y-2">
                                <Label>Customer</Label>
                                <Select value={form.customerId} onValueChange={handleCustomerChange}>
                                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                                  <SelectContent>
                                    {customersData.map((c) => (
                                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Customer ID</Label>
                                <Input value={form.customerId} disabled className="bg-muted" />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Country</Label>
                                <Input value={form.customerCountry} disabled className="bg-muted" />
                              </div>
                              <div className="space-y-2">
                                <Label>City</Label>
                                <Input value={form.customerCity} disabled className="bg-muted" />
                              </div>
                              <div className="space-y-2">
                                <Label>Invoice #</Label>
                                <Input value={form.invoiceNumber} onChange={(e) => setForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))} />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Expected Delivery Date</Label>
                                <Input type="date" value={form.expectedDeliveryDate} onChange={(e) => setForm((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))} />
                              </div>
                              <div className="space-y-2">
                                <Label>Total Received (₱)</Label>
                                <Input type="number" min="0" step="0.01" value={form.totalReceived} onChange={(e) => setForm((prev) => ({ ...prev, totalReceived: parseFloat(e.target.value) || 0 }))} />
                              </div>
                              <div className="space-y-2">
                                <Label>Shipping Status</Label>
                                <Select value={form.shippingStatus} onValueChange={(v) => setForm((prev) => ({ ...prev, shippingStatus: v as ShippingStatus }))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                              <Input value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Optional notes..." />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Line Items Card */}
                        <Card>
                          <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Line Items</CardTitle>
                            <Button size="sm" variant="outline" onClick={handleAddItem}>
                              <Plus className="h-4 w-4 mr-1" />
                              Add Item
                            </Button>
                          </CardHeader>
                          <CardContent>
                            {form.items.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">No items added.</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="w-24">Qty</TableHead>
                                    <TableHead className="w-32">Unit Price</TableHead>
                                    <TableHead className="w-32 text-right">Total</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {form.items.map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        <Select value={item.inventoryItemId} onValueChange={(v) => handleItemChange(index, "inventoryItemId", v)}>
                                          <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                                          <SelectContent>
                                            {inventoryData.map((inv) => (
                                              <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell>
                                        <Input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} />
                                      </TableCell>
                                      <TableCell>
                                        <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)} />
                                      </TableCell>
                                      <TableCell className="text-right font-medium">₱{item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                      <TableCell>
                                        <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                            <div className="mt-4 pt-4 border-t flex justify-between items-center">
                              <div>
                                <span className="text-sm text-muted-foreground">Grand Total:</span>
                                <span className="ml-2 text-xl font-bold">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">SO Balance:</span>
                                <span className={cn("ml-2 text-xl font-bold", (totalAmount - form.totalReceived) > 0 ? "text-orange-600" : "text-green-600")}>
                                  ₱{(totalAmount - form.totalReceived).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <DialogFooter className="gap-2">
                          {canDelete && (
                            <Button variant="destructive" onClick={() => handleDelete(isEditOpen)}>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          )}
                          <Button variant="outline" onClick={() => { setIsEditOpen(null); resetForm(); }}>Cancel</Button>
                          <Button onClick={() => handleUpdate(isEditOpen)}>Save Changes</Button>
                        </DialogFooter>
                      </>
                    );
                  })()}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Bulk Delete/Archive Confirmation Dialog */}
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        itemCount={selectionCount}
        itemType="sales order"
        onConfirm={showArchived ? handleBulkPermanentDelete : handleBulkArchive}
        title={showArchived ? "Permanently Delete Sales Orders?" : "Archive Sales Orders?"}
        description={
          showArchived
            ? `This will permanently delete ${selectionCount} sales order(s). This action cannot be undone.`
            : `This will archive ${selectionCount} sales order(s). You can restore them later from the archived view.`
        }
        confirmLabel={showArchived ? "Permanently Delete" : "Archive"}
      />
    </div>
  );
}
