import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  getPaymentTransactions,
  getPurchaseOrders,
  getSuppliers,
  createPaymentTransaction,
  updatePaymentTransaction,
  deletePaymentTransaction,
  archivePaymentTransaction,
  restorePaymentTransaction,
  batchArchivePaymentTransactions,
  batchRestorePaymentTransactions,
  batchDeletePaymentTransactions,
} from "@/services/api";
import type { PaymentTransaction, PurchaseOrder, Supplier, PaymentMode } from "@/types";
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
  Archive,
  ArchiveRestore,
  Wallet,
  DollarSign,
  CreditCard,
  Banknote,
} from "lucide-react";

const PAYMENT_MODES: PaymentMode[] = ["Cash", "Bank Transfer", "Credit Card", "Check", "Online Payment"];

interface TrxFormState {
  trxDate: string;
  supplierId: string;
  supplierName: string;
  country: string;
  city: string;
  poId: string;
  billNumber: string;
  paymentMode: PaymentMode;
  amountPaid: number;
  notes: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
};

export function PaymentsView() {
  const { user } = useAuth();
  const userRole = user ? getUserRole(user.id) : "Viewer";
  const canCreate = hasPermission(userRole, "purchase_orders:create");
  const canEdit = hasPermission(userRole, "purchase_orders:update");
  const canDelete = hasPermission(userRole, "purchase_orders:delete");
  const canPermanentlyDelete = userRole === "Owner" || userRole === "Admin";

  const [transactionsData, setTransactionsData] = useState<PaymentTransaction[] | null>(null);
  const [purchaseOrdersData, setPurchaseOrdersData] = useState<PurchaseOrder[]>([]);
  const [suppliersData, setSuppliersData] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterPaymentMode, setFilterPaymentMode] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof PaymentTransaction | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [form, setForm] = useState<TrxFormState>({
    trxDate: new Date().toISOString().split("T")[0],
    supplierId: "",
    supplierName: "",
    country: "",
    city: "",
    poId: "",
    billNumber: "",
    paymentMode: "Cash",
    amountPaid: 0,
    notes: "",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [trxData, poData, supplierData] = await Promise.all([
          getPaymentTransactions(),
          getPurchaseOrders(),
          getSuppliers(),
        ]);
        setTransactionsData(trxData);
        setPurchaseOrdersData(poData);
        setSuppliersData(supplierData);
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const list = transactionsData ?? [];

  const filteredData = useMemo(() => {
    return list.filter((trx) => {
      const isArchived = trx.archived === true;
      if (showArchived !== isArchived) return false;

      const matchesSearch =
        !debouncedSearch ||
        trx.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        trx.supplierName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        trx.poId.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        trx.billNumber.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesPaymentMode = filterPaymentMode === "all" || trx.paymentMode === filterPaymentMode;

      return matchesSearch && matchesPaymentMode;
    });
  }, [list, debouncedSearch, filterPaymentMode, showArchived]);

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
  const { selectedIds, isSelected, toggleItem, toggleAll, deselectAll, isAllSelected, isPartiallySelected, selectionCount, hasSelection } = useBatchSelection(paginatedData);

  // Statistics
  const trxStats = useMemo(() => {
    const activeTransactions = list.filter((trx) => !trx.archived);
    const totalTransactions = activeTransactions.length;
    const totalAmount = activeTransactions.reduce((sum, trx) => sum + trx.amountPaid, 0);
    const cashTotal = activeTransactions.filter((trx) => trx.paymentMode === "Cash").reduce((sum, trx) => sum + trx.amountPaid, 0);
    const bankTotal = activeTransactions.filter((trx) => trx.paymentMode === "Bank Transfer").reduce((sum, trx) => sum + trx.amountPaid, 0);
    const cardTotal = activeTransactions.filter((trx) => trx.paymentMode === "Credit Card").reduce((sum, trx) => sum + trx.amountPaid, 0);
    const checkTotal = activeTransactions.filter((trx) => trx.paymentMode === "Check").reduce((sum, trx) => sum + trx.amountPaid, 0);
    const onlineTotal = activeTransactions.filter((trx) => trx.paymentMode === "Online Payment").reduce((sum, trx) => sum + trx.amountPaid, 0);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = activeTransactions.filter((trx) => new Date(trx.createdAt) >= oneWeekAgo).length;

    return {
      totalTransactions,
      totalAmount,
      cashTotal,
      bankTotal,
      cardTotal,
      checkTotal,
      onlineTotal,
      newThisWeek,
      avgTransactionAmount: totalTransactions > 0 ? totalAmount / totalTransactions : 0,
    };
  }, [list]);

  const handleSort = (column: string) => {
    const key = column as keyof PaymentTransaction;
    if (sortColumn === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  const getSortDirection = (column: keyof PaymentTransaction): SortDirection => {
    if (sortColumn === column) return sortDirection;
    return null;
  };

  const getPaymentModeBadge = (mode: PaymentMode) => {
    const variants: Record<PaymentMode, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
      "Cash": { variant: "default", className: "bg-green-500" },
      "Bank Transfer": { variant: "outline", className: "border-blue-500 text-blue-600" },
      "Credit Card": { variant: "outline", className: "border-purple-500 text-purple-600" },
      "Check": { variant: "outline", className: "border-orange-500 text-orange-600" },
      "Online Payment": { variant: "outline", className: "border-cyan-500 text-cyan-600" },
    };
    const { variant, className } = variants[mode];
    return <Badge variant={variant} className={cn("gap-1", className)}>{mode}</Badge>;
  };

  const resetForm = () => {
    setForm({
      trxDate: new Date().toISOString().split("T")[0],
      supplierId: "",
      supplierName: "",
      country: "",
      city: "",
      poId: "",
      billNumber: "",
      paymentMode: "Cash",
      amountPaid: 0,
      notes: "",
    });
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliersData.find((s) => s.id === supplierId);
    setForm((prev) => ({
      ...prev,
      supplierId,
      supplierName: supplier?.name ?? "",
      country: supplier?.country ?? "",
      city: supplier?.city ?? "",
    }));
  };

  const handlePOChange = (poId: string) => {
    const po = purchaseOrdersData.find((p) => p.id === poId);
    if (po) {
      const supplier = suppliersData.find((s) => s.id === po.supplierId);
      setForm((prev) => ({
        ...prev,
        poId,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        country: supplier?.country ?? "",
        city: supplier?.city ?? "",
        billNumber: po.billNumber ?? "",
      }));
    }
  };

  const handleCreate = async () => {
    if (!form.supplierId || !form.poId || form.amountPaid <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const newTrx = await createPaymentTransaction({
        trxDate: form.trxDate,
        supplierId: form.supplierId,
        supplierName: form.supplierName,
        country: form.country,
        city: form.city,
        poId: form.poId,
        billNumber: form.billNumber,
        paymentMode: form.paymentMode,
        amountPaid: form.amountPaid,
        notes: form.notes,
        createdBy: user?.id ?? "1",
      });
      setTransactionsData((prev) => [newTrx, ...(prev ?? [])]);
      toast.success(`Transaction ${newTrx.id} created successfully`);
      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create transaction");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!form.supplierId || !form.poId || form.amountPaid <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const updated = await updatePaymentTransaction({
        id,
        trxDate: form.trxDate,
        supplierId: form.supplierId,
        supplierName: form.supplierName,
        country: form.country,
        city: form.city,
        poId: form.poId,
        billNumber: form.billNumber,
        paymentMode: form.paymentMode,
        amountPaid: form.amountPaid,
        notes: form.notes,
      });
      setTransactionsData((prev) => prev?.map((trx) => (trx.id === id ? updated : trx)) ?? []);
      toast.success(`Transaction ${id} updated successfully`);
      setIsEditOpen(null);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update transaction");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const archived = await archivePaymentTransaction(id);
      setTransactionsData((prev) => prev?.map((trx) => (trx.id === id ? archived : trx)) ?? []);
      toast.success(`Transaction ${id} archived`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to archive transaction");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const restored = await restorePaymentTransaction(id);
      setTransactionsData((prev) => prev?.map((trx) => (trx.id === id ? restored : trx)) ?? []);
      toast.success(`Transaction ${id} restored`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore transaction");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await deletePaymentTransaction(id);
      setTransactionsData((prev) => prev?.filter((trx) => trx.id !== id) ?? []);
      toast.success(`Transaction ${id} permanently deleted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete transaction");
    }
  };

  const handleBulkArchive = async () => {
    try {
      await batchArchivePaymentTransactions(Array.from(selectedIds));
      setTransactionsData((prev) =>
        prev?.map((trx) =>
          selectedIds.has(trx.id) ? { ...trx, archived: true, archivedAt: new Date().toISOString() } : trx
        ) ?? []
      );
      toast.success(`${selectionCount} transactions archived`);
      deselectAll();
    } catch (error) {
      toast.error("Failed to archive transactions");
    }
  };

  const handleBulkRestore = async () => {
    try {
      await batchRestorePaymentTransactions(Array.from(selectedIds));
      setTransactionsData((prev) =>
        prev?.map((trx) =>
          selectedIds.has(trx.id) ? { ...trx, archived: false, archivedAt: undefined } : trx
        ) ?? []
      );
      toast.success(`${selectionCount} transactions restored`);
      deselectAll();
    } catch (error) {
      toast.error("Failed to restore transactions");
    }
  };

  const handleBulkDelete = async () => {
    try {
      await batchDeletePaymentTransactions(Array.from(selectedIds));
      setTransactionsData((prev) => prev?.filter((trx) => !selectedIds.has(trx.id)) ?? []);
      toast.success(`${selectionCount} transactions permanently deleted`);
      deselectAll();
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error("Failed to delete transactions");
    }
  };

  const openEditDialog = (trx: PaymentTransaction) => {
    setForm({
      trxDate: trx.trxDate.split("T")[0],
      supplierId: trx.supplierId,
      supplierName: trx.supplierName,
      country: trx.country,
      city: trx.city,
      poId: trx.poId,
      billNumber: trx.billNumber,
      paymentMode: trx.paymentMode,
      amountPaid: trx.amountPaid,
      notes: trx.notes ?? "",
    });
    setIsEditOpen(trx.id);
  };

  const exportToCSV = () => {
    const headers = ["Trx ID", "Trx Date", "Supplier ID", "Supplier Name", "Country", "City", "PO ID", "Bill Num", "PMT Mode", "Amount Paid"];
    const rows = filteredData.map((trx) => [
      trx.id,
      trx.trxDate.split("T")[0],
      trx.supplierId,
      trx.supplierName,
      trx.country,
      trx.city,
      trx.poId,
      trx.billNumber,
      trx.paymentMode,
      trx.amountPaid.toFixed(2),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transactions exported to CSV");
  };

  // Form dialog content
  const renderFormContent = () => (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trxDate">Transaction Date *</Label>
          <Input
            id="trxDate"
            type="date"
            value={form.trxDate}
            onChange={(e) => setForm((prev) => ({ ...prev, trxDate: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="poId">Purchase Order *</Label>
          <Select value={form.poId} onValueChange={handlePOChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select Purchase Order" />
            </SelectTrigger>
            <SelectContent>
              {purchaseOrdersData
                .filter((po) => !po.archived)
                .map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.id} - {po.supplierName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="supplierId">Supplier *</Label>
          <Select value={form.supplierId} onValueChange={handleSupplierChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select Supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliersData.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.id} - {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplierName">Supplier Name</Label>
          <Input id="supplierName" value={form.supplierName} disabled className="bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input id="country" value={form.country} disabled className="bg-muted" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={form.city} disabled className="bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="billNumber">Bill Number</Label>
          <Input
            id="billNumber"
            value={form.billNumber}
            onChange={(e) => setForm((prev) => ({ ...prev, billNumber: e.target.value }))}
            placeholder="BILL-001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMode">Payment Mode *</Label>
          <Select value={form.paymentMode} onValueChange={(v) => setForm((prev) => ({ ...prev, paymentMode: v as PaymentMode }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {mode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amountPaid">Amount Paid (₱) *</Label>
        <Input
          id="amountPaid"
          type="number"
          min="0"
          step="0.01"
          value={form.amountPaid}
          onChange={(e) => setForm((prev) => ({ ...prev, amountPaid: parseFloat(e.target.value) || 0 }))}
          placeholder="0.00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Optional notes..."
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Manage payments against purchase orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {canCreate && (
            <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Payment</DialogTitle>
                  <DialogDescription>Add a new payment against a purchase order</DialogDescription>
                </DialogHeader>
                {renderFormContent()}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Create Payment</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(trxStats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">{trxStats.totalTransactions} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(trxStats.cashTotal)}</div>
            <p className="text-xs text-muted-foreground">Direct cash paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Transfers</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(trxStats.bankTotal)}</div>
            <p className="text-xs text-muted-foreground">Bank transfers made</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Card & Online</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(trxStats.cardTotal + trxStats.onlineTotal)}</div>
            <p className="text-xs text-muted-foreground">Digital payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Transactions</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={showArchived ? "secondary" : "outline"}
                size="sm"
                onClick={() => { setShowArchived(!showArchived); deselectAll(); }}
              >
                {showArchived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                {showArchived ? "View Active" : "View Archived"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, supplier, PO, or bill..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterPaymentMode} onValueChange={setFilterPaymentMode}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Payment Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Modes</SelectItem>
                {PAYMENT_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {hasSelection && (
            <BulkActionsToolbar
              selectionCount={selectionCount}
              onClearSelection={deselectAll}
              actions={
                showArchived
                  ? [
                      { label: "Restore", onClick: handleBulkRestore, icon: <ArchiveRestore className="h-4 w-4" /> },
                      ...(canPermanentlyDelete
                        ? [{ label: "Delete Permanently", onClick: () => setBulkDeleteOpen(true), icon: <Trash2 className="h-4 w-4" />, variant: "destructive" as const }]
                        : []),
                    ]
                  : [{ label: "Archive", onClick: handleBulkArchive, icon: <Archive className="h-4 w-4" /> }]
              }
            />
          )}

          {/* Table */}
          {isLoading ? (
            <TableLoadingSkeleton columns={10} rows={5} />
          ) : paginatedData.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={showArchived ? "No Archived Transactions" : "No Transactions Found"}
              description={showArchived ? "Archived transactions will appear here" : "Create your first payment to get started"}
              actionLabel={!showArchived && canCreate ? "New Payment" : undefined}
              onAction={!showArchived && canCreate ? () => setIsAddOpen(true) : undefined}
            />
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(el) => { if (el) el.indeterminate = isPartiallySelected; }}
                          onChange={() => toggleAll()}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableHead>
                      <SortableTableHead sortKey="trxDate" currentSortKey={sortColumn} sortDirection={getSortDirection("trxDate")} onSort={handleSort}>Trx Date</SortableTableHead>
                      <SortableTableHead sortKey="id" currentSortKey={sortColumn} sortDirection={getSortDirection("id")} onSort={handleSort}>Trx ID</SortableTableHead>
                      <SortableTableHead sortKey="supplierId" currentSortKey={sortColumn} sortDirection={getSortDirection("supplierId")} onSort={handleSort}>Supplier ID</SortableTableHead>
                      <SortableTableHead sortKey="supplierName" currentSortKey={sortColumn} sortDirection={getSortDirection("supplierName")} onSort={handleSort}>Supplier Name</SortableTableHead>
                      <SortableTableHead sortKey="country" currentSortKey={sortColumn} sortDirection={getSortDirection("country")} onSort={handleSort}>Country</SortableTableHead>
                      <SortableTableHead sortKey="city" currentSortKey={sortColumn} sortDirection={getSortDirection("city")} onSort={handleSort}>City</SortableTableHead>
                      <SortableTableHead sortKey="poId" currentSortKey={sortColumn} sortDirection={getSortDirection("poId")} onSort={handleSort}>PO ID</SortableTableHead>
                      <SortableTableHead sortKey="billNumber" currentSortKey={sortColumn} sortDirection={getSortDirection("billNumber")} onSort={handleSort}>Bill Num</SortableTableHead>
                      <SortableTableHead sortKey="paymentMode" currentSortKey={sortColumn} sortDirection={getSortDirection("paymentMode")} onSort={handleSort}>PMT Mode</SortableTableHead>
                      <SortableTableHead sortKey="amountPaid" currentSortKey={sortColumn} sortDirection={getSortDirection("amountPaid")} onSort={handleSort}>Amount Paid</SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((trx) => (
                      <TableRow key={trx.id} className={cn(isSelected(trx.id) && "bg-muted/50")}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected(trx.id)}
                            onChange={() => toggleItem(trx.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>{trx.trxDate.split("T")[0]}</TableCell>
                        <TableCell className="font-medium">{trx.id}</TableCell>
                        <TableCell>{trx.supplierId}</TableCell>
                        <TableCell>{trx.supplierName}</TableCell>
                        <TableCell>{trx.country || "-"}</TableCell>
                        <TableCell>{trx.city || "-"}</TableCell>
                        <TableCell>{trx.poId}</TableCell>
                        <TableCell>{trx.billNumber || "-"}</TableCell>
                        <TableCell>{getPaymentModeBadge(trx.paymentMode)}</TableCell>
                        <TableCell className="font-medium text-red-600">{formatCurrency(trx.amountPaid)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {showArchived ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleRestore(trx.id)} title="Restore">
                                  <ArchiveRestore className="h-4 w-4" />
                                </Button>
                                {canPermanentlyDelete && (
                                  <Button size="sm" variant="destructive" onClick={() => handlePermanentDelete(trx.id)} title="Delete Permanently">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            ) : (
                              <>
                                {canEdit && (
                                  <Dialog open={isEditOpen === trx.id} onOpenChange={(open) => { if (!open) { setIsEditOpen(null); resetForm(); } }}>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline" onClick={() => openEditDialog(trx)}>Edit</Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>Edit Payment {trx.id}</DialogTitle>
                                        <DialogDescription>Update payment details</DialogDescription>
                                      </DialogHeader>
                                      {renderFormContent()}
                                      <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsEditOpen(null)}>Cancel</Button>
                                        <Button onClick={() => handleUpdate(trx.id)}>Save Changes</Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                )}
                                {canDelete && (
                                  <Button size="sm" variant="outline" onClick={() => handleArchive(trx.id)} title="Archive">
                                    <Archive className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Delete Dialog */}
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        itemCount={selectionCount}
        onConfirm={handleBulkDelete}
        itemType="transactions"
      />
    </div>
  );
}

