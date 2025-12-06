import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  getCashBankTransactions,
  createCashBankTransaction,
} from "@/services/api";
import { getInventory, updateInventoryItem } from "@/services/firebase-inventory-api";
import {
  getFirebaseSalesOrders,
  createFirebaseSalesOrder,
  updateFirebaseSalesOrder,
  archiveFirebaseSalesOrder,
  restoreFirebaseSalesOrder,
  permanentlyDeleteFirebaseSalesOrder,
  bulkArchiveFirebaseSalesOrders,
  bulkRestoreFirebaseSalesOrders,
  bulkPermanentlyDeleteFirebaseSalesOrders,
} from "@/services/firebase-sales-orders-api";
import {
  getFirebaseCustomers,
  updateFirebaseCustomer,
} from "@/services/firebase-customers-api";
import {
  getFirebaseShipments,
  createFirebaseShipment,
} from "@/services/firebase-shipments-api";
// Context hooks available for real-time updates if needed:
// import { useSalesOrders, useCustomers, useShipments } from "@/context/app-context";
import type { SalesOrder, Customer, InventoryItem, SOLineItem, ReceiptStatus, ShippingStatus, Shipment, CashBankTransaction, PaymentMode } from "@/types";
import { useAuth } from "@/context/auth-context";
import { useNotifications } from "@/context/notifications-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { useBatchSelection } from "@/hooks/useBatchSelection";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/components/ui/utils";
import { SelectAllBanner } from "@/components/ui/select-all-banner";
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
  Eye,
  ArrowLeft,
  Printer,
  AlertCircle,
  Banknote,
  MapPin,
  User,
  Calendar,
  Hash,
  Truck,
  Package,
  Receipt,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  History,
  CreditCard,
  AlertTriangle,
  Boxes,
  Link2,
  ExternalLink,
  UserCheck,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { usePrintReceipt, type ReceiptData } from "@/components/ui/printable-receipt";
import { CustomerOrderForm } from "@/components/customer-order-form";

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
  amountPaid: number;
  shippingStatus: ShippingStatus;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
};

export function SalesOrdersView() {
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  // Use user.role directly from auth context instead of localStorage-based getUserRole
  const userRole: Role = (user?.role as Role) || "Viewer";
  const isCustomer = userRole === "Customer";
  // Use purchase_orders permissions as sales orders have similar access control
  // Customers can create their own orders
  const canCreate = isCustomer || hasPermission(userRole, "purchase_orders:create");
  const canEdit = !isCustomer && hasPermission(userRole, "purchase_orders:update");
  const canDelete = !isCustomer && hasPermission(userRole, "purchase_orders:delete");
  const canPermanentlyDelete = userRole === "Owner" || userRole === "Admin";

  const { printReceipt } = usePrintReceipt();

  const [salesOrdersData, setSalesOrdersData] = useState<SalesOrder[] | null>(null);
  const [customersData, setCustomersData] = useState<Customer[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [shipmentsData, setShipmentsData] = useState<Shipment[]>([]);
  const [paymentsData, setPaymentsData] = useState<CashBankTransaction[]>([]);
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
  const [detailViewSO, setDetailViewSO] = useState<SalesOrder | null>(null);
  const [showCustomerOrderForm, setShowCustomerOrderForm] = useState(false);

  // Integration dialogs
  const [showRecordPaymentDialog, setShowRecordPaymentDialog] = useState(false);
  const [showCreateShipmentDialog, setShowCreateShipmentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentMode: "Cash" as PaymentMode,
    amountReceived: 0,
    notes: "",
  });
  const [shipmentForm, setShipmentForm] = useState({
    carrier: "",
    eta: "",
    destination: "",
  });

  // Auto-populate shipment destination when dialog opens
  useEffect(() => {
    if (showCreateShipmentDialog && detailViewSO) {
      const deliveryAddress = detailViewSO.deliveryAddress ||
        `${detailViewSO.customerCity}, ${detailViewSO.customerCountry}`;
      setShipmentForm(prev => ({
        ...prev,
        destination: deliveryAddress,
      }));
    }
  }, [showCreateShipmentDialog, detailViewSO]);

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
    amountPaid: 0,
    shippingStatus: "Pending",
  });

  // Load all data including shipments and payments
  const loadAllData = useCallback(async () => {
    try {
      // Load data with individual error handling to prevent one failure from blocking all
      const [soResult, custResult, invResult, shipResult, payResult] = await Promise.allSettled([
        getFirebaseSalesOrders(),
        getFirebaseCustomers(),
        getInventory(),
        getFirebaseShipments(),
        getCashBankTransactions(),
      ]);

      // Process each result and log any errors
      if (soResult.status === 'fulfilled') {
        setSalesOrdersData(soResult.value);
      } else {
        console.error("Failed to load sales orders:", soResult.reason);
        setSalesOrdersData([]);
      }

      if (custResult.status === 'fulfilled') {
        setCustomersData(custResult.value);
      } else {
        console.error("Failed to load customers:", custResult.reason);
      }

      if (invResult.status === 'fulfilled') {
        setInventoryData(invResult.value);
      } else {
        console.error("Failed to load inventory:", invResult.reason);
      }

      if (shipResult.status === 'fulfilled') {
        setShipmentsData(shipResult.value);
      } else {
        console.error("Failed to load shipments:", shipResult.reason);
      }

      if (payResult.status === 'fulfilled') {
        setPaymentsData(payResult.value);
      } else {
        console.error("Failed to load payments:", payResult.reason);
      }

      // Show error only if critical data failed
      if (soResult.status === 'rejected') {
        toast.error("Failed to load orders. Please check your connection.");
      }
    } catch (error) {
      console.error("Data loading error:", error);
      toast.error("Failed to load data");
      setSalesOrdersData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Auto-select customer for customer users when Add dialog opens
  useEffect(() => {
    if (isAddOpen && isCustomer && user?.email && customersData.length > 0) {
      // Find customer record matching the logged-in user's email
      const matchingCustomer = customersData.find(c => c.email === user.email);
      if (matchingCustomer) {
        setForm(prev => ({
          ...prev,
          customerId: matchingCustomer.id,
          customerName: matchingCustomer.name,
          customerCountry: matchingCustomer.country ?? "",
          customerCity: matchingCustomer.city ?? "",
        }));
      } else {
        // If no matching customer, use user's display name
        setForm(prev => ({
          ...prev,
          customerName: user.displayName || user.email || "Customer",
        }));
      }
    }
  }, [isAddOpen, isCustomer, user?.email, user?.displayName, customersData]);

  const list = salesOrdersData ?? [];

  // Debug logging for customer orders
  useEffect(() => {
    if (isCustomer) {
      console.log("[My Orders Debug]", {
        isCustomer,
        userEmail: user?.email,
        userRole,
        totalOrders: list.length,
        ordersCreatedByMe: list.filter(so => so.createdBy === user?.email).length,
        allCreatedByValues: list.map(so => so.createdBy),
        showArchived,
      });
    }
  }, [isCustomer, user?.email, userRole, list, showArchived]);

  const filteredData = useMemo(() => {
    return list.filter((so) => {
      // Customer users can only see their own orders (created by them)
      if (isCustomer && user?.email && so.createdBy !== user.email) {
        return false;
      }

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
  }, [list, debouncedSearch, filterStatus, showArchived, isCustomer, user?.email]);

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
  const { selectedIds, isSelected, toggleItem, toggleAll, selectAllPages, deselectAll, isAllSelected, isAllPageSelected, isAllPagesSelected, isPartiallySelected, selectionCount, hasSelection, totalItemCount, pageItemCount } = useBatchSelection<SalesOrder>(paginatedData, sortedData);

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

  // Generate Detail ID for line items (SO-001-D001, SO-001-D002, etc.)
  const generateDetailId = (soId: string, index: number): string => {
    return `${soId}-D${String(index + 1).padStart(3, "0")}`;
  };

  // Get inventory item details for a line item
  const getInventoryItemDetails = (inventoryItemId: string) => {
    const item = inventoryData.find((inv) => inv.id === inventoryItemId);
    return {
      itemId: item?.id ?? inventoryItemId,
      itemType: item?.brand ?? "-", // Using brand as item type
      itemCategory: item?.category ?? "-",
      itemSubcategory: item?.subcategory ?? "-",
    };
  };

  // Open detail view for a specific sales order
  const openDetailView = (so: SalesOrder) => {
    setDetailViewSO(so);
  };

  // Close detail view and return to list
  const closeDetailView = () => {
    setDetailViewSO(null);
  };

  // Sync detail view with updated data
  useEffect(() => {
    if (detailViewSO && salesOrdersData) {
      const updatedSO = salesOrdersData.find((so) => so.id === detailViewSO.id);
      if (updatedSO && JSON.stringify(updatedSO) !== JSON.stringify(detailViewSO)) {
        setDetailViewSO(updatedSO);
      } else if (!updatedSO) {
        // Sales order was deleted, close detail view
        setDetailViewSO(null);
      }
    }
  }, [salesOrdersData, detailViewSO]);

  const getReceiptStatusBadge = (status: ReceiptStatus) => {
    const variants: Record<ReceiptStatus, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
      Unpaid: { variant: "outline", className: "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
      "Partially Paid": { variant: "outline", className: "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30" },
      Paid: { variant: "default", className: "bg-green-600" },
      Overdue: { variant: "destructive" },
    };
    const { variant, className } = variants[status];
    return (
      <Badge variant={variant} className={cn("gap-1", className)}>
        {status === "Paid" && <CheckCircle2 className="h-3 w-3" />}
        {status === "Unpaid" && <Clock className="h-3 w-3" />}
        {status === "Partially Paid" && <DollarSign className="h-3 w-3" />}
        {status === "Overdue" && <AlertCircle className="h-3 w-3" />}
        {status}
      </Badge>
    );
  };

  // ========== INTEGRATION HELPERS ==========

  // Get customer details by ID
  const getCustomerDetails = useCallback((customerId: string) => {
    return customersData.find((c) => c.id === customerId);
  }, [customersData]);

  // Get all orders for a customer
  const getCustomerOrderHistory = useCallback((customerId: string) => {
    if (!salesOrdersData) return [];
    return salesOrdersData.filter((so) => so.customerId === customerId && !so.archived);
  }, [salesOrdersData]);

  // Get payments for a specific sales order
  const getOrderPayments = useCallback((soId: string) => {
    return paymentsData.filter((p) => p.soId === soId && !p.archived);
  }, [paymentsData]);

  // Get shipments for a specific sales order
  const getOrderShipments = useCallback((soId: string) => {
    return shipmentsData.filter((s) => s.salesOrderId === soId && !s.archived);
  }, [shipmentsData]);

  // Get inventory item details
  const getInventoryItemById = useCallback((itemId: string) => {
    return inventoryData.find((i) => i.id === itemId);
  }, [inventoryData]);

  // Check stock availability for order items
  const checkStockAvailability = useCallback((items: SOLineItem[]) => {
    const issues: { itemName: string; requested: number; available: number }[] = [];
    items.forEach((item) => {
      const invItem = getInventoryItemById(item.inventoryItemId);
      if (invItem && invItem.quantity < item.quantity) {
        issues.push({
          itemName: item.itemName,
          requested: item.quantity,
          available: invItem.quantity,
        });
      }
    });
    return issues;
  }, [getInventoryItemById]);

  // Record payment for an order
  const handleRecordPayment = async () => {
    if (!detailViewSO || paymentForm.amountReceived <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    const customer = getCustomerDetails(detailViewSO.customerId);

    try {
      // Create payment transaction
      await createCashBankTransaction({
        trxDate: new Date().toISOString().split("T")[0],
        customerId: detailViewSO.customerId,
        customerName: detailViewSO.customerName,
        country: detailViewSO.customerCountry,
        city: detailViewSO.customerCity,
        soId: detailViewSO.id,
        invoiceNumber: detailViewSO.invoiceNumber,
        paymentMode: paymentForm.paymentMode,
        amountReceived: paymentForm.amountReceived,
        notes: paymentForm.notes,
        createdBy: user?.displayName || user?.email || "Unknown",
      });

      // Update sales order
      const newTotalReceived = (detailViewSO.totalReceived || 0) + paymentForm.amountReceived;
      const newBalance = detailViewSO.totalAmount - newTotalReceived;
      const newStatus: ReceiptStatus = newBalance <= 0 ? "Paid" : newBalance < detailViewSO.totalAmount ? "Partially Paid" : "Unpaid";

      await updateFirebaseSalesOrder({
        id: detailViewSO.id,
        totalReceived: newTotalReceived,
        receiptStatus: newStatus,
      });

      // Update customer balance
      if (customer) {
        await updateFirebaseCustomer({
          id: customer.id,
          payments: (customer.payments || 0) + paymentForm.amountReceived,
        });
      }

      toast.success(`Payment of ${formatCurrency(paymentForm.amountReceived)} recorded successfully`);
      setShowRecordPaymentDialog(false);
      setPaymentForm({ paymentMode: "Cash", amountReceived: 0, notes: "" });
      loadAllData();
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  // Create shipment for an order
  const handleCreateShipment = async () => {
    if (!detailViewSO || !shipmentForm.carrier) {
      toast.error("Please fill in shipment details");
      return;
    }

    const destination = shipmentForm.destination || detailViewSO.deliveryAddress || `${detailViewSO.customerCity}, ${detailViewSO.customerCountry}`;

    console.log("[Shipment] Creating shipment:", {
      salesOrderId: detailViewSO.id,
      destination,
      carrier: shipmentForm.carrier,
      eta: shipmentForm.eta,
    });

    try {
      const newShipment = await createFirebaseShipment({
        salesOrderId: detailViewSO.id,
        destination,
        carrier: shipmentForm.carrier,
        status: "Pending",
        eta: shipmentForm.eta,
      });

      console.log("[Shipment] Shipment created successfully:", newShipment);

      // Update order shipping status
      await updateFirebaseSalesOrder({
        id: detailViewSO.id,
        shippingStatus: "Processing",
      });

      console.log("[Shipment] Sales order shipping status updated to Processing");

      toast.success("Shipment created successfully");
      setShowCreateShipmentDialog(false);
      setShipmentForm({ carrier: "", eta: "", destination: "" });

      // Refresh shipments data to show the new shipment
      const updatedShipments = await getFirebaseShipments();
      setShipmentsData(updatedShipments);

      // Also refresh sales orders to get updated shipping status
      const updatedOrders = await getFirebaseSalesOrders();
      setSalesOrdersData(updatedOrders);
    } catch (error) {
      console.error("[Shipment] Failed to create shipment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create shipment");
    }
  };

  // Update inventory when order is marked as shipped/delivered
  const handleUpdateInventoryForOrder = async (so: SalesOrder) => {
    try {
      for (const item of so.items) {
        const invItem = getInventoryItemById(item.inventoryItemId);
        if (invItem) {
          const newQty = Math.max(0, invItem.quantity - item.quantity);
          await updateInventoryItem({
            id: invItem.id,
            quantity: newQty,
          });
        }
      }
      toast.success("Inventory updated successfully");
      loadAllData();
    } catch (error) {
      toast.error("Failed to update inventory");
    }
  };

  const resetForm = () => {
    // For customers, auto-fill their name from the logged-in user
    const customerName = isCustomer && user?.displayName ? user.displayName : "";

    setForm({
      soDate: new Date().toISOString().split("T")[0],
      customerId: "",
      customerName,
      customerCountry: "",
      customerCity: "",
      invoiceNumber: "",
      items: [],
      expectedDeliveryDate: "",
      notes: "",
      totalReceived: 0,
      amountPaid: 0,
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
    // Customers don't need to provide expectedDeliveryDate (admin-only field)
    const needsDeliveryDate = !isCustomer && !form.expectedDeliveryDate;
    if (!form.customerId || form.items.length === 0 || needsDeliveryDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const newSO = await createFirebaseSalesOrder({
        soDate: form.soDate,
        customerId: form.customerId,
        customerName: form.customerName,
        customerCountry: form.customerCountry,
        customerCity: form.customerCity,
        invoiceNumber: form.invoiceNumber,
        items: form.items.map((item) => ({ ...item, quantityShipped: 0 })),
        expectedDeliveryDate: form.expectedDeliveryDate || undefined, // Optional for customers
        notes: form.notes,
        createdBy: user?.email ?? user?.id ?? "unknown",
        totalReceived: isCustomer ? 0 : form.totalReceived, // Customers can't set totalReceived
        amountPaid: form.amountPaid, // Customer-editable field
      });
      setSalesOrdersData((prev) => [newSO, ...(prev ?? [])]);
      toast.success(`Sales Order ${newSO.id} created successfully`);

      // Create notification for Owner/Admin when a Customer creates an order
      if (isCustomer && user?.email) {
        const totalAmount = form.items.reduce((sum, item) => sum + item.totalPrice, 0);
        await createNotification({
          type: "new_sales_order",
          title: "New Sales Order Created",
          message: `${user.name || user.email} created order ${newSO.id} for ${form.customerName} - ${formatCurrency(totalAmount)}`,
          salesOrderId: newSO.id,
          customerName: form.customerName,
          createdBy: user.email,
          targetRoles: ["Owner", "Admin"],
        });
      }

      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create sales order");
    }
  };

  // Handler for customer order form (e-commerce style)
  const handleCustomerOrderSubmit = async (orderData: {
    items: { inventoryItemId: string; itemName: string; quantity: number; unitPrice: number; totalPrice: number }[];
    notes: string;
    amountPaid: number;
    customerName: string;
    customerId: string;
    customerCountry: string;
    customerCity: string;
  }): Promise<SalesOrder> => {
    const newSO = await createFirebaseSalesOrder({
      soDate: new Date().toISOString().split("T")[0],
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      customerCountry: orderData.customerCountry,
      customerCity: orderData.customerCity,
      invoiceNumber: "", // Auto-generated or left empty
      items: orderData.items.map((item) => ({ ...item, quantityShipped: 0 })),
      expectedDeliveryDate: undefined, // Admin sets this later
      notes: orderData.notes,
      createdBy: user?.email ?? user?.id ?? "unknown",
      totalReceived: 0,
      amountPaid: orderData.amountPaid,
    });
    setSalesOrdersData((prev) => [newSO, ...(prev ?? [])]);

    // Create notification for Owner/Admin
    if (user?.email) {
      const totalAmount = orderData.items.reduce((sum, item) => sum + item.totalPrice, 0);
      await createNotification({
        type: "new_sales_order",
        title: "New Customer Order",
        message: `${user.displayName || user.email} placed order ${newSO.id} - ${formatCurrency(totalAmount)}`,
        salesOrderId: newSO.id,
        customerName: orderData.customerName,
        createdBy: user.email,
        targetRoles: ["Owner", "Admin"],
      });
    }

    return newSO;
  };

  const handleUpdate = async (id: string) => {
    // Customers don't need to provide expectedDeliveryDate (admin-only field)
    const needsDeliveryDate = !isCustomer && !form.expectedDeliveryDate;
    if (!form.customerId || form.items.length === 0 || needsDeliveryDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      // Get existing order to preserve quantityShipped values and admin-only fields for customers
      const existingOrder = list.find((so) => so.id === id);
      const existingItemsMap = new Map(
        existingOrder?.items?.map((item) => [item.inventoryItemId, item.quantityShipped ?? 0]) ?? []
      );

      const updated = await updateFirebaseSalesOrder({
        id,
        soDate: form.soDate,
        customerId: form.customerId,
        customerName: form.customerName,
        customerCountry: form.customerCountry,
        customerCity: form.customerCity,
        invoiceNumber: form.invoiceNumber,
        items: form.items.map((item) => ({
          ...item,
          // Preserve existing quantityShipped or default to 0 for new items
          quantityShipped: existingItemsMap.get(item.inventoryItemId) ?? 0,
        })),
        // For customers, preserve existing admin-only fields
        expectedDeliveryDate: isCustomer ? existingOrder?.expectedDeliveryDate : form.expectedDeliveryDate,
        notes: form.notes,
        totalReceived: isCustomer ? existingOrder?.totalReceived : form.totalReceived, // Admin-only
        amountPaid: form.amountPaid, // Customer-editable
        shippingStatus: isCustomer ? existingOrder?.shippingStatus : form.shippingStatus, // Admin-only
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
      await permanentlyDeleteFirebaseSalesOrder(id);
      setSalesOrdersData((prev) => prev?.filter((so) => so.id !== id) ?? []);
      toast.success(`Sales Order ${id} deleted`);
      setIsEditOpen(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete sales order");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveFirebaseSalesOrder(id);
      setSalesOrdersData((prev) => prev?.map((so) => (so.id === id ? { ...so, archived: true } : so)) ?? []);
      toast.success(`Sales Order ${id} archived`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to archive sales order");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreFirebaseSalesOrder(id);
      setSalesOrdersData((prev) => prev?.map((so) => (so.id === id ? { ...so, archived: false } : so)) ?? []);
      toast.success(`Sales Order ${id} restored`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore sales order");
    }
  };

  const handleBulkArchive = async () => {
    try {
      const result = await bulkArchiveFirebaseSalesOrders(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${result.successCount} sales orders archived`);
      } else {
        toast.warning(`${result.successCount} archived, ${result.failedCount} failed`);
      }
      const updatedSOs = await getFirebaseSalesOrders();
      setSalesOrdersData(updatedSOs);
      deselectAll();
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error("Failed to archive sales orders");
    }
  };

  const handleBulkRestore = async () => {
    try {
      const result = await bulkRestoreFirebaseSalesOrders(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${result.successCount} sales orders restored`);
      } else {
        toast.warning(`${result.successCount} restored, ${result.failedCount} failed`);
      }
      const updatedSOs = await getFirebaseSalesOrders();
      setSalesOrdersData(updatedSOs);
      deselectAll();
    } catch (error) {
      toast.error("Failed to restore sales orders");
    }
  };

  const handleBulkPermanentDelete = async () => {
    try {
      const result = await bulkPermanentlyDeleteFirebaseSalesOrders(Array.from(selectedIds));
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
      amountPaid: so.amountPaid ?? 0,
      shippingStatus: so.shippingStatus ?? "Pending",
    });
    setIsEditOpen(so.id);
  };

  const exportToCSV = () => {
    const headers = ["Date", "SO ID", "Customer ID", "Customer Name", "Country", "City", "Items", "Total Amount", "Total Received", "SO Balance", "Receipt Status", "Shipping Status", "Expected Delivery", "Notes"];
    const rows = filteredData.map((so) => [
      so.soDate ?? so.createdDate,
      so.id,
      so.customerId,
      so.customerName,
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

  // Handle printing sales order receipt
  const handlePrintSalesOrder = (so: SalesOrder) => {
    const receiptData: ReceiptData = {
      type: "sales-order",
      documentNumber: so.id,
      documentDate: so.soDate ?? so.createdDate,
      partyType: "Customer",
      partyName: so.customerName,
      partyCity: so.customerCity,
      partyCountry: so.customerCountry,
      items: so.items?.map(item => ({
        description: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.totalPrice,
      })) || [],
      totalAmount: so.totalAmount ?? 0,
      amountPaid: so.totalReceived ?? 0,
      balance: so.soBalance ?? (so.totalAmount - so.totalReceived) ?? 0,
      status: `${so.receiptStatus} / ${so.shippingStatus}`,
      expectedDeliveryDate: so.expectedDeliveryDate,
      notes: so.notes,
      createdBy: so.createdBy,
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

  // Detail View - Enhanced Receipt Style with Module Integrations
  if (detailViewSO) {
    const orderDateTime = new Date(detailViewSO.soDate || detailViewSO.createdDate || new Date());
    const getShippingStatusColor = (status: string) => {
      switch (status) {
        case "Delivered": return "bg-green-600";
        case "Shipped":
        case "In Transit":
        case "Out for Delivery": return "bg-blue-600";
        case "Failed":
        case "Returned": return "bg-red-600";
        default: return "bg-amber-600";
      }
    };

    // Integration data
    const customer = getCustomerDetails(detailViewSO.customerId);
    const customerOrders = getCustomerOrderHistory(detailViewSO.customerId);
    const orderPayments = getOrderPayments(detailViewSO.id);
    const orderShipments = getOrderShipments(detailViewSO.id);
    const stockIssues = checkStockAvailability(detailViewSO.items);
    const totalPaid = orderPayments.reduce((sum, p) => sum + p.amountReceived, 0);
    const balanceDue = detailViewSO.totalAmount - (detailViewSO.totalReceived || 0);

    return (
      <div className="space-y-6">
        {/* Header with Back Button and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={closeDetailView}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h2 className="text-xl font-semibold">Order Details - {detailViewSO.id}</h2>
              <p className="text-sm text-muted-foreground">
                {detailViewSO.customerName} • Created by {detailViewSO.createdBy}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap print:hidden">
            {!isCustomer && balanceDue > 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowRecordPaymentDialog(true)}>
                <DollarSign className="h-4 w-4 mr-1" />
                Record Payment
              </Button>
            )}
            {!isCustomer && detailViewSO.shippingStatus === "Pending" && orderShipments.length === 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowCreateShipmentDialog(true)}>
                <Truck className="h-4 w-4 mr-1" />
                Create Shipment
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => handlePrintSalesOrder(detailViewSO)}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Stock Warning */}
        {stockIssues.length > 0 && !isCustomer && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">Low Stock Warning</p>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                    {stockIssues.map((issue, idx) => (
                      <li key={idx}>
                        {issue.itemName}: Requested {issue.requested}, Available {issue.available}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Receipt Card */}
        <Card className="print:shadow-none print:border-none" id="order-receipt">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Sales Order Receipt</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Order ID</p>
                  <p className="font-mono font-medium text-xs sm:text-sm">{detailViewSO.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Date & Time</p>
                  <p className="font-medium text-xs sm:text-sm">
                    {orderDateTime.toLocaleDateString()} {orderDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Customer</p>
                  <p className="font-medium text-xs sm:text-sm">{detailViewSO.customerName}</p>
                </div>
              </div>
            </div>

            {/* Customer Location */}
            {(detailViewSO.customerCity || detailViewSO.customerCountry) && (
              <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Customer Location</p>
                  <p className="text-sm">{[detailViewSO.customerCity, detailViewSO.customerCountry].filter(Boolean).join(", ")}</p>
                </div>
              </div>
            )}

            {/* Delivery Address */}
            {detailViewSO.deliveryAddress && (
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <Truck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Delivery Address</p>
                  <p className="text-sm">{detailViewSO.deliveryAddress}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Items Ordered */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Items Ordered ({detailViewSO.items?.length || 0})
              </h4>
              {(!detailViewSO.items || detailViewSO.items.length === 0) ? (
                <EmptyState
                  icon={ShoppingCart}
                  title="No line items"
                  description="This sales order has no line items"
                />
              ) : (
                <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                  {detailViewSO.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-medium line-clamp-1">{item.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unitPrice)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium shrink-0">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Order Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(detailViewSO.totalAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(detailViewSO.totalAmount ?? 0)}</span>
              </div>
              {(detailViewSO.amountPaid ?? 0) > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="text-green-600">{formatCurrency(detailViewSO.amountPaid ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Balance Due</span>
                    <span className="text-amber-600">{formatCurrency((detailViewSO.totalAmount ?? 0) - (detailViewSO.amountPaid ?? 0))}</span>
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Payment & Shipping Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Info */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-sm">Payment</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Banknote className="h-3 w-3" />
                    Cash on Delivery
                  </Badge>
                  {getReceiptStatusBadge(detailViewSO.receiptStatus)}
                </div>
              </div>

              {/* Shipping Info */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Shipping</span>
                </div>
                <Badge className={`gap-1 ${getShippingStatusColor(detailViewSO.shippingStatus || "Pending")}`}>
                  {detailViewSO.shippingStatus === "Delivered" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {detailViewSO.shippingStatus ?? "Pending"}
                </Badge>
              </div>
            </div>

            {/* Notes */}
            {detailViewSO.notes && (
              <div className="text-sm bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground mb-1 font-medium">Order Notes:</p>
                <p className="italic">{detailViewSO.notes}</p>
              </div>
            )}

            {/* Expected Delivery Date */}
            {detailViewSO.expectedDeliveryDate && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Expected Delivery: {new Date(detailViewSO.expectedDeliveryDate).toLocaleDateString()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Integration Tabs - Admin Only */}
        {!isCustomer && (
          <Tabs defaultValue="items" className="print:hidden">
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger value="items" className="text-xs sm:text-sm py-2">
                <Package className="h-4 w-4 mr-1 hidden sm:inline" />
                Items
              </TabsTrigger>
              <TabsTrigger value="customer" className="text-xs sm:text-sm py-2">
                <User className="h-4 w-4 mr-1 hidden sm:inline" />
                Customer
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-xs sm:text-sm py-2">
                <CreditCard className="h-4 w-4 mr-1 hidden sm:inline" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="shipments" className="text-xs sm:text-sm py-2">
                <Truck className="h-4 w-4 mr-1 hidden sm:inline" />
                Shipments
              </TabsTrigger>
            </TabsList>

            {/* Items Tab */}
            <TabsContent value="items" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Line Items & Inventory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {detailViewSO.items && detailViewSO.items.length > 0 && (
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailViewSO.items.map((item, index) => {
                            const invItem = getInventoryItemById(item.inventoryItemId);
                            const invDetails = getInventoryItemDetails(item.inventoryItemId);
                            const stockStatus = invItem ? (invItem.quantity >= item.quantity ? "ok" : invItem.quantity > 0 ? "low" : "out") : "unknown";
                            return (
                              <TableRow key={index}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{item.itemName}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{invDetails.itemId}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{invDetails.itemCategory}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={stockStatus === "ok" ? "default" : stockStatus === "low" ? "secondary" : "destructive"} className={stockStatus === "ok" ? "bg-green-600" : stockStatus === "low" ? "bg-amber-500" : ""}>
                                    {invItem?.quantity ?? "N/A"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Customer Tab */}
            <TabsContent value="customer" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Customer Profile */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Customer Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {customer ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{customer.name}</p>
                            <Badge variant={customer.status === "Active" ? "default" : "secondary"} className={customer.status === "Active" ? "bg-green-600" : ""}>
                              {customer.status}
                            </Badge>
                          </div>
                        </div>
                        <Separator />
                        <div className="grid gap-2 text-sm">
                          {customer.contact && (
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-muted-foreground" />
                              <span>{customer.contact}</span>
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{customer.email}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          {(customer.city || customer.country) && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{[customer.city, customer.country].filter(Boolean).join(", ")}</span>
                            </div>
                          )}
                          {customer.address && (
                            <div className="flex items-start gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <span>{customer.address}</span>
                            </div>
                          )}
                        </div>
                        <Separator />
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground">Total Purchases</p>
                            <p className="font-semibold text-sm">{formatCurrency(customer.purchases || 0)}</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground">Payments</p>
                            <p className="font-semibold text-sm text-green-600">{formatCurrency(customer.payments || 0)}</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground">Balance</p>
                            <p className={cn("font-semibold text-sm", (customer.balance || 0) > 0 ? "text-amber-600" : "text-green-600")}>
                              {formatCurrency(customer.balance || 0)}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">Customer not found</p>
                    )}
                  </CardContent>
                </Card>

                {/* Order History */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Order History ({customerOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {customerOrders.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {customerOrders.slice(0, 10).map((order) => (
                          <div key={order.id} className={cn("p-2 rounded border text-sm cursor-pointer hover:bg-muted/50", order.id === detailViewSO.id && "bg-primary/10 border-primary")} onClick={() => order.id !== detailViewSO.id && setDetailViewSO(order)}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{order.id}</p>
                                <p className="text-xs text-muted-foreground">{new Date(order.soDate || order.createdDate).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                                {getReceiptStatusBadge(order.receiptStatus)}
                              </div>
                            </div>
                          </div>
                        ))}
                        {customerOrders.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center">+{customerOrders.length - 10} more orders</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No order history</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment History
                    </CardTitle>
                    {balanceDue > 0 && (
                      <Button size="sm" onClick={() => setShowRecordPaymentDialog(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Record Payment
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Payment Summary */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Order Total</p>
                      <p className="font-bold text-lg">{formatCurrency(detailViewSO.totalAmount)}</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Total Paid</p>
                      <p className="font-bold text-lg text-green-600">{formatCurrency(detailViewSO.totalReceived || 0)}</p>
                    </div>
                    <div className={cn("p-3 rounded-lg text-center", balanceDue > 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-green-50 dark:bg-green-950/30")}>
                      <p className="text-xs text-muted-foreground">Balance Due</p>
                      <p className={cn("font-bold text-lg", balanceDue > 0 ? "text-amber-600" : "text-green-600")}>{formatCurrency(balanceDue)}</p>
                    </div>
                  </div>

                  {/* Payment Transactions */}
                  {orderPayments.length > 0 ? (
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderPayments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>{new Date(payment.trxDate).toLocaleDateString()}</TableCell>
                              <TableCell className="font-mono text-sm">{payment.id}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{payment.paymentMode}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600">{formatCurrency(payment.amountReceived)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No payments recorded yet</p>
                      {balanceDue > 0 && (
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowRecordPaymentDialog(true)}>
                          Record First Payment
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shipments Tab */}
            <TabsContent value="shipments" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Shipment Tracking
                    </CardTitle>
                    {orderShipments.length === 0 && (
                      <Button size="sm" onClick={() => setShowCreateShipmentDialog(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Create Shipment
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Delivery Address */}
                  {(detailViewSO.deliveryAddress || detailViewSO.customerCity) && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Delivery Address</p>
                          <p className="text-sm">{detailViewSO.deliveryAddress || `${detailViewSO.customerCity}, ${detailViewSO.customerCountry}`}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shipments List */}
                  {orderShipments.length > 0 ? (
                    <div className="space-y-3">
                      {orderShipments.map((shipment) => (
                        <div key={shipment.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{shipment.id}</p>
                              <p className="text-sm text-muted-foreground">Carrier: {shipment.carrier}</p>
                            </div>
                            <Badge className={getShippingStatusColor(shipment.status)}>
                              {shipment.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Destination</p>
                              <p>{shipment.destination}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">ETA</p>
                              <p>{shipment.eta ? new Date(shipment.eta).toLocaleDateString() : "TBD"}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No shipments created yet</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowCreateShipmentDialog(true)}>
                        Create Shipment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Audit Info */}
        {!isCustomer && (
          <Card className="print:hidden">
            <CardContent className="py-3">
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <UserCheck className="h-3 w-3" />
                  Created by: {detailViewSO.createdBy}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created: {new Date(detailViewSO.createdDate).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Record Payment Dialog */}
        <Dialog open={showRecordPaymentDialog} onOpenChange={setShowRecordPaymentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a payment for order {detailViewSO.id}. Balance due: {formatCurrency(balanceDue)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Payment Method</Label>
                <Select value={paymentForm.paymentMode} onValueChange={(v) => setPaymentForm((p) => ({ ...p, paymentMode: v as PaymentMode }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Check">Check</SelectItem>
                    <SelectItem value="Online Payment">Online Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount Received</Label>
                <Input type="number" min="0" step="0.01" max={balanceDue} value={paymentForm.amountReceived || ""} onChange={(e) => setPaymentForm((p) => ({ ...p, amountReceived: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setPaymentForm((p) => ({ ...p, amountReceived: balanceDue }))}>
                    Full Amount
                  </Button>
                </div>
              </div>
              <div>
                <Label>Notes (Optional)</Label>
                <Input value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Payment notes..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRecordPaymentDialog(false)}>Cancel</Button>
              <Button onClick={handleRecordPayment} disabled={paymentForm.amountReceived <= 0}>
                Record Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Shipment Dialog */}
        <Dialog open={showCreateShipmentDialog} onOpenChange={setShowCreateShipmentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Shipment</DialogTitle>
              <DialogDescription>
                Create a shipment for order {detailViewSO.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Carrier</Label>
                <Input value={shipmentForm.carrier} onChange={(e) => setShipmentForm((p) => ({ ...p, carrier: e.target.value }))} placeholder="e.g., FedEx, UPS, LBC" />
              </div>
              <div>
                <Label>Destination</Label>
                <Input value={shipmentForm.destination} onChange={(e) => setShipmentForm((p) => ({ ...p, destination: e.target.value }))} placeholder={detailViewSO.deliveryAddress || `${detailViewSO.customerCity}, ${detailViewSO.customerCountry}`} />
              </div>
              <div>
                <Label>Estimated Arrival (Optional)</Label>
                <Input type="date" value={shipmentForm.eta} onChange={(e) => setShipmentForm((p) => ({ ...p, eta: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateShipmentDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateShipment} disabled={!shipmentForm.carrier}>
                Create Shipment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Customer Order Form View (e-commerce style)
  if (isCustomer && showCustomerOrderForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Place New Order</h1>
            <p className="text-muted-foreground">Browse products and add them to your cart</p>
          </div>
        </div>
        <CustomerOrderForm
          inventoryData={inventoryData}
          customersData={customersData}
          onSubmitOrder={handleCustomerOrderSubmit}
          onCancel={() => setShowCustomerOrderForm(false)}
        />
      </div>
    );
  }

  // Customer simplified view
  if (isCustomer) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Orders</h1>
            <p className="text-sm sm:text-base text-muted-foreground">View and track your orders</p>
          </div>
          <Button onClick={() => setShowCustomerOrderForm(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Place New Order
          </Button>
        </div>

        {/* Simple Stats for Customers */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredData.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {filteredData.filter(so => so.shippingStatus === "Pending" || so.shippingStatus === "Processing").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {filteredData.filter(so => so.shippingStatus === "Delivered").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table - Simplified for Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="No orders yet"
                description="Place your first order to get started"
                action={
                  <Button onClick={() => setShowCustomerOrderForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Place New Order
                  </Button>
                }
              />
            ) : (
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Order ID</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Items</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                      <TableHead className="text-right whitespace-nowrap hidden sm:table-cell">Paid</TableHead>
                      <TableHead className="whitespace-nowrap">Payment</TableHead>
                      <TableHead className="whitespace-nowrap">Carrier</TableHead>
                      <TableHead className="whitespace-nowrap">Shipping</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((so) => {
                      const orderShipment = shipmentsData.find(s => s.salesOrderId === so.id && !s.archived);
                      return (
                      <TableRow key={so.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetailView(so)}>
                        <TableCell className="font-medium font-mono text-xs sm:text-sm whitespace-nowrap">{so.id}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs sm:text-sm">{so.soDate ?? so.createdDate}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="text-muted-foreground text-xs sm:text-sm">
                            {so.items.length} item{so.items.length !== 1 ? "s" : ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap text-xs sm:text-sm">{formatCurrency(so.totalAmount)}</TableCell>
                        <TableCell className="text-right text-green-600 hidden sm:table-cell">{formatCurrency(so.amountPaid ?? 0)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              so.receiptStatus === "Paid" ? "default" :
                              so.receiptStatus === "Partially Paid" ? "secondary" :
                              so.receiptStatus === "Overdue" ? "destructive" :
                              "outline"
                            }
                            className={
                              so.receiptStatus === "Paid" ? "bg-green-600" :
                              so.receiptStatus === "Partially Paid" ? "bg-amber-500" :
                              so.receiptStatus === "Overdue" ? "bg-red-600" :
                              ""
                            }
                          >
                            {so.receiptStatus ?? "Unpaid"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {orderShipment ? (
                            <div className="flex items-center gap-1 text-xs sm:text-sm">
                              <Truck className="h-3 w-3 text-muted-foreground" />
                              <span>{orderShipment.carrier}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              so.shippingStatus === "Delivered" ? "default" :
                              so.shippingStatus === "Shipped" || so.shippingStatus === "In Transit" || so.shippingStatus === "Out for Delivery" ? "secondary" :
                              so.shippingStatus === "Failed" || so.shippingStatus === "Returned" ? "destructive" :
                              "outline"
                            }
                            className={
                              so.shippingStatus === "Delivered" ? "bg-green-600" :
                              so.shippingStatus === "Out for Delivery" ? "bg-blue-600" :
                              so.shippingStatus === "In Transit" ? "bg-blue-500" :
                              so.shippingStatus === "Shipped" ? "bg-cyan-600" :
                              so.shippingStatus === "Processing" ? "bg-amber-500" :
                              ""
                            }
                          >
                            {so.shippingStatus ?? "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {filteredData.length > 0 && (
              <div className="mt-4">
                <PaginationControls
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Sales Orders</h1>
        <p className="text-muted-foreground">Create and manage customer orders, track payments, and monitor delivery status</p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-l-4 border-l-slate-400 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total SOs</CardTitle>
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{soStats.totalSOs}</div>
            <p className="text-xs text-muted-foreground mt-2">{soStats.newThisWeek} new this week</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-emerald-600">{formatCurrency(soStats.totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-2">Avg: {formatCurrency(soStats.avgOrderValue)} per SO</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-amber-600">{formatCurrency(soStats.outstandingBalance)}</div>
            <p className="text-xs text-muted-foreground mt-2">{soStats.unpaidCount} unpaid, {soStats.overdueCount} overdue</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-blue-600">{soStats.collectionRate}%</div>
            <p className="text-xs text-muted-foreground mt-2">{soStats.paidCount} paid of {soStats.totalSOs} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
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
                            {isCustomer ? (
                              // For customers, auto-fill their name and make it read-only
                              <Input
                                value={user?.displayName || user?.email || "Customer"}
                                disabled
                                className="bg-muted"
                              />
                            ) : (
                              <Select value={form.customerId} onValueChange={handleCustomerChange}>
                                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                                <SelectContent>
                                  {customersData.filter((c) => c.status === "Active").map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
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
                        </div>
                        {/* Admin-only fields */}
                        {!isCustomer && (
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
                        )}
                        {/* Amount Paid - Customer editable field */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Amount Paid (₱)</Label>
                            <Input type="number" min="0" step="0.01" value={form.amountPaid} onChange={(e) => setForm((prev) => ({ ...prev, amountPaid: parseFloat(e.target.value) || 0 }))} placeholder="Enter amount paid" />
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
        <CardContent className="space-y-6 pt-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[250px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search SO ID, customer, or items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-10" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-52 h-10">
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
            <Button variant={showArchived ? "default" : "outline"} onClick={() => setShowArchived(!showArchived)} className={cn("h-10", showArchived ? "bg-orange-500 hover:bg-orange-600 text-white" : "")}>
              <Archive className="h-4 w-4 mr-2" />
              {showArchived ? "Viewing Archived" : "View Archived"}
            </Button>
            {(searchTerm || filterStatus !== "all" || showArchived) && (
              <Button variant="ghost" onClick={clearAllFilters} className="text-muted-foreground h-10">
                <X className="h-4 w-4 mr-2" />
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
              <div className="border rounded-xl overflow-hidden shadow-sm">
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
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      {canDelete && (
                        <TableHead className="w-12 py-3">
                          <input type="checkbox" checked={isAllSelected} ref={(el) => { if (el) el.indeterminate = isPartiallySelected; }} onChange={() => toggleAll()} className="h-4 w-4 rounded" />
                        </TableHead>
                      )}
                      <SortableTableHead sortKey="soDate" currentSortKey={sortColumn} sortDirection={getSortDirection("soDate")} onSort={handleSort}>Date</SortableTableHead>
                      <SortableTableHead sortKey="id" currentSortKey={sortColumn} sortDirection={getSortDirection("id")} onSort={handleSort}>SO ID</SortableTableHead>
                      <TableHead>Customer ID</TableHead>
                      <SortableTableHead sortKey="customerName" currentSortKey={sortColumn} sortDirection={getSortDirection("customerName")} onSort={handleSort}>Customer Name</SortableTableHead>
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
                      <TableRow key={so.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => openEditDialog(so)}>
                        {canDelete && (
                          <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected(so.id)} onChange={() => toggleItem(so.id)} className="h-4 w-4 rounded" />
                          </TableCell>
                        )}
                        <TableCell className="whitespace-nowrap py-3">{so.soDate ?? so.createdDate}</TableCell>
                        <TableCell className="font-medium py-3 text-primary">{so.id}</TableCell>
                        <TableCell className="text-muted-foreground py-3 text-sm">{so.customerId}</TableCell>
                        <TableCell className="py-3 font-medium">{so.customerName}</TableCell>
                        <TableCell className="py-3">{so.customerCountry || "-"}</TableCell>
                        <TableCell className="py-3">{so.customerCity || "-"}</TableCell>
                        <TableCell className="text-right font-semibold py-3">₱{(so.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right py-3 text-muted-foreground">₱{(so.totalReceived ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-semibold py-3">
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
                            <Button size="sm" variant="outline" onClick={() => openDetailView(so)} title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
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
                                <Input type="date" value={form.soDate} onChange={(e) => setForm((prev) => ({ ...prev, soDate: e.target.value }))} disabled={isCustomer} className={isCustomer ? "bg-muted" : ""} />
                              </div>
                              <div className="space-y-2">
                                <Label>Customer</Label>
                                {isCustomer ? (
                                  // For customers, show their name as read-only
                                  <Input
                                    value={form.customerName || user?.displayName || user?.email || "Customer"}
                                    disabled
                                    className="bg-muted"
                                  />
                                ) : (
                                  <Select value={form.customerId} onValueChange={handleCustomerChange}>
                                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                                    <SelectContent>
                                      {customersData.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
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
                            </div>
                            {/* Admin-only fields */}
                            {!isCustomer && (
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
                            )}
                            {/* Amount Paid - Customer editable field */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Amount Paid (₱)</Label>
                                <Input type="number" min="0" step="0.01" value={form.amountPaid} onChange={(e) => setForm((prev) => ({ ...prev, amountPaid: parseFloat(e.target.value) || 0 }))} placeholder="Enter amount paid" />
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

      {/* Bulk Delete/Archive Dialog - Two-tier for active items, single option for archived */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete {selectionCount} Sales Order{selectionCount !== 1 ? "s" : ""}
            </DialogTitle>
            <DialogDescription>
              {showArchived
                ? "These sales orders are already archived. This action will permanently remove them from the system."
                : "Choose how you want to delete the selected sales orders:"}
            </DialogDescription>
          </DialogHeader>

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
                <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleBulkPermanentDelete}>
                  Permanently Delete All
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
                      Move to archive. Sales orders can be restored later.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleBulkArchive}>
                    Archive
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
                    <Button variant="destructive" size="sm" onClick={handleBulkPermanentDelete}>
                      Delete
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
