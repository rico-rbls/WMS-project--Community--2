import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { useNotifications } from "@/context/notifications-context";
import {
  getFirebaseCustomers,
  createFirebaseCustomer,
  updateFirebaseCustomer,
} from "@/services/firebase-customers-api";
import { createFirebaseSalesOrder, updateFirebaseSalesOrder } from "@/services/firebase-sales-orders-api";
import { createFirebaseShipment } from "@/services/firebase-shipments-api";
import type { Customer, SalesOrder } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Minus,
  Trash2,
  Package,
  ImageIcon,
  ArrowLeft,
  CheckCircle2,
  ShoppingBag,
  MapPin,
  Banknote,
  Printer,
  Truck,
  Clock,
  Receipt,
  User,
  Calendar,
  Hash,
  Home,
  Edit3,
  Phone,
} from "lucide-react";
import type { ViewType } from "@/App";
import { useEffect } from "react";

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

interface CustomerCartViewProps {
  navigateToView: (view: ViewType) => void;
}

export function CustomerCartView({ navigateToView }: CustomerCartViewProps) {
  const { user } = useAuth();
  const { cart, updateQuantity, removeFromCart, clearCart, cartTotal, itemCount } = useCart();
  const { sendNotification } = useNotifications();
  const [notes, setNotes] = useState("");
  const [useDefaultAddress, setUseDefaultAddress] = useState(true);
  const [customDeliveryAddress, setCustomDeliveryAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<SalesOrder | null>(null);
  const [customersData, setCustomersData] = useState<Customer[]>([]);

  // Load customers data
  useEffect(() => {
    getFirebaseCustomers().then(setCustomersData).catch(() => {});
  }, []);

  // Find customer record matching logged-in user
  const customerRecord = useMemo(() => {
    if (!user?.email) return null;
    return customersData.find(c => c.email === user.email);
  }, [user?.email, customersData]);

  // Get effective delivery address
  const effectiveDeliveryAddress = useMemo(() => {
    // If user chose to use a different address (toggle is OFF) and provided one
    if (!useDefaultAddress && customDeliveryAddress.trim()) {
      return customDeliveryAddress.trim();
    }
    // If user wants default address and customer has one saved
    if (useDefaultAddress && customerRecord?.address) {
      const parts = [customerRecord.address, customerRecord.city, customerRecord.country].filter(Boolean);
      return parts.join(", ");
    }
    // If no saved address, use custom address even if toggle is on
    if (customDeliveryAddress.trim()) {
      return customDeliveryAddress.trim();
    }
    return "";
  }, [useDefaultAddress, customDeliveryAddress, customerRecord]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!user?.email) {
      toast.error("Please log in to place an order.");
      return;
    }

    // Ensure we have a delivery address
    if (!effectiveDeliveryAddress) {
      toast.error("Please provide a delivery address");
      return;
    }

    setIsSubmitting(true);
    try {
      // Use existing customer record or auto-create one
      let customer = customerRecord;
      const displayName = user.displayName || user.email.split("@")[0];

      if (!customer) {
        // Auto-create customer record from user profile with full details
        // Extract city from custom address if provided
        const addressParts = effectiveDeliveryAddress.split(",").map(s => s.trim());
        const city = addressParts.length > 1 ? addressParts[1] : "";
        const address = addressParts[0] || effectiveDeliveryAddress;

        customer = await createFirebaseCustomer({
          name: displayName,
          contact: displayName,
          email: user.email,
          phone: "",
          address: address,
          city: city,
          country: "Philippines",
          status: "Active",
          purchases: cartTotal,
          payments: 0,
        });
        // Update local state
        setCustomersData(prev => [...prev, customer!]);
        toast.info("Customer profile created automatically.");
      } else {
        // Update existing customer with order info - sync address if using new address
        const updates: Partial<Customer> & { id: string } = {
          id: customer.id,
          purchases: (customer.purchases || 0) + cartTotal,
        };

        // If customer doesn't have an address or is using a new address, update it
        if (!customer.address && effectiveDeliveryAddress) {
          const addressParts = effectiveDeliveryAddress.split(",").map(s => s.trim());
          updates.address = addressParts[0] || effectiveDeliveryAddress;
          if (addressParts.length > 1) {
            updates.city = addressParts[1];
          }
        }

        customer = await updateFirebaseCustomer(updates);
        setCustomersData(prev => prev.map(c => c.id === customer!.id ? customer! : c));
      }

      const orderItems = cart.map(item => ({
        inventoryItemId: item.inventoryItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }));

      // Create order with createdBy set to user email for tracking
      const order = await createFirebaseSalesOrder({
        customerId: customer.id,
        customerName: customer.name,
        customerCountry: customer.country || "Philippines",
        customerCity: customer.city || "",
        deliveryAddress: effectiveDeliveryAddress,
        soDate: new Date().toISOString().split("T")[0],
        items: orderItems,
        totalAmount: cartTotal,
        receiptStatus: "Unpaid",
        notes: notes || undefined,
        amountPaid: 0,
        createdBy: user.email, // Critical for order tracking - must match user.email
        shippingStatus: "Processing", // Auto-set to Processing since shipment will be created
      });

      // Automatically create shipment for the order with random carrier
      const carriers = ["J&T Express", "LBC", "JRS Express", "Grab Express", "Lalamove", "Ninja Van", "Flash Express", "GoGo Xpress"];
      const randomCarrier = carriers[Math.floor(Math.random() * carriers.length)];

      try {
        await createFirebaseShipment({
          salesOrderId: order.id,
          destination: effectiveDeliveryAddress,
          carrier: randomCarrier,
          status: "Pending",
          eta: undefined, // Admin will set ETA later
        });
        console.log("[Checkout] Shipment auto-created for order:", order.id, "with carrier:", randomCarrier);
      } catch (shipmentError) {
        // If shipment creation fails, still proceed - order was created successfully
        // Just update the order's shipping status back to "Pending"
        console.warn("[Checkout] Failed to auto-create shipment:", shipmentError);
        try {
          await updateFirebaseSalesOrder({
            id: order.id,
            shippingStatus: "Pending",
          });
        } catch {
          // Ignore update error - order still exists
        }
      }

      setOrderPlaced(order);
      clearCart();
      toast.success("Order placed successfully!");

      // Notify admins (non-blocking - don't fail the order if notification fails)
      try {
        await sendNotification({
          title: "New Customer Order",
          message: `${customer.name} placed an order for ${formatCurrency(cartTotal)}`,
          type: "info",
          recipientRoles: ["Admin", "Owner"],
        });
      } catch (notificationError) {
        console.warn("[Checkout] Failed to send notification:", notificationError);
        // Don't show error to user - order was successful
      }
    } catch (error) {
      console.error("Order error:", error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Print receipt function
  const handlePrintReceipt = () => {
    window.print();
  };

  // Order confirmation view with detailed receipt
  if (orderPlaced) {
    const orderDateTime = new Date(orderPlaced.soDate);

    return (
      <div className="max-w-2xl mx-auto py-4 sm:py-8 px-2 sm:px-0">
        {/* Success Banner */}
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 mb-6">
          <CardContent className="pt-6 pb-4 text-center">
            <div className="flex justify-center mb-3">
              <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-3">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-1">Order Placed Successfully!</h2>
            <p className="text-sm text-muted-foreground">
              Thank you for your order. We&apos;ll process it shortly.
            </p>
          </CardContent>
        </Card>

        {/* Detailed Receipt */}
        <Card className="print:shadow-none print:border-none" id="order-receipt">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Order Receipt</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handlePrintReceipt} className="print:hidden gap-1">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Order ID</p>
                  <p className="font-mono font-medium text-xs sm:text-sm">{orderPlaced.id}</p>
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
                  <p className="font-medium text-xs sm:text-sm">{orderPlaced.customerName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Shipping Status</p>
                  <Badge variant="outline" className="text-xs mt-0.5">
                    <Clock className="h-3 w-3 mr-1" />
                    {orderPlaced.shippingStatus || "Pending"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {orderPlaced.deliveryAddress && (
              <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Delivery Address</p>
                  <p className="text-sm">{orderPlaced.deliveryAddress}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Items Ordered */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Items Ordered ({orderPlaced.items.length})
              </h4>
              <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                {orderPlaced.items.map((item, idx) => (
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
            </div>

            <Separator />

            {/* Order Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(orderPlaced.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(orderPlaced.totalAmount)}</span>
              </div>
            </div>

            <Separator />

            {/* Payment Info */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-sm">Payment Method</span>
              </div>
              <div className="flex justify-between items-center">
                <Badge variant="secondary" className="gap-1">
                  <Banknote className="h-3 w-3" />
                  Cash on Delivery
                </Badge>
                <Badge
                  variant={orderPlaced.receiptStatus === "Paid" ? "default" : "outline"}
                  className={orderPlaced.receiptStatus === "Paid" ? "bg-green-600" : "text-amber-600 border-amber-300"}
                >
                  {orderPlaced.receiptStatus === "Paid" ? "Paid" : "Unpaid - Pay on Delivery"}
                </Badge>
              </div>
              {orderPlaced.amountPaid > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Amount paid: {formatCurrency(orderPlaced.amountPaid)} •
                  Balance due: {formatCurrency(orderPlaced.totalAmount - orderPlaced.amountPaid)}
                </p>
              )}
            </div>

            {/* Notes */}
            {orderPlaced.notes && (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Order Notes:</p>
                <p className="italic">{orderPlaced.notes}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 print:hidden">
            <Button variant="outline" onClick={() => navigateToView("sales-orders")} className="w-full sm:w-auto">
              View My Orders
            </Button>
            <Button onClick={() => { setOrderPlaced(null); navigateToView("products"); }} className="w-full sm:w-auto">
              Continue Shopping
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Empty cart view
  if (cart.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigateToView("products")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
            <p className="text-muted-foreground">Your cart is empty</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center text-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-6">
                Looks like you haven&apos;t added any items to your cart yet.
              </p>
              <Button onClick={() => navigateToView("products")}>
                <Package className="h-4 w-4 mr-2" />
                Browse Products
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigateToView("products")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Shopping Cart</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{itemCount} item(s) in your cart</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <Card key={item.inventoryItemId}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex gap-3 sm:gap-4">
                  {/* Product Image */}
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
                    )}
                  </div>
                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base line-clamp-2">{item.itemName}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">{item.brand}</p>
                    <p className="text-primary font-medium mt-1 text-sm sm:text-base">{formatCurrency(item.unitPrice)}</p>
                    {/* Mobile: Quantity controls inline */}
                    <div className="flex items-center justify-between mt-2 sm:hidden">
                      <div className="flex items-center gap-1 bg-accent rounded-lg p-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.inventoryItemId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.inventoryItemId, item.quantity + 1)}
                          disabled={item.quantity >= item.availableStock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-semibold text-sm">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  </div>
                  {/* Desktop: Quantity Controls */}
                  <div className="hidden sm:flex flex-col items-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(item.inventoryItemId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2 bg-accent rounded-lg p-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.inventoryItemId, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.inventoryItemId, item.quantity + 1)}
                        disabled={item.quantity >= item.availableStock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
                  </div>
                  {/* Mobile: Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0 sm:hidden"
                    onClick={() => removeFromCart(item.inventoryItemId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items List */}
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.inventoryItemId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">
                      {item.itemName} × {item.quantity}
                    </span>
                    <span>{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Subtotal & Total */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              {/* Payment Method Badge */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium">Payment Method</span>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Banknote className="h-3 w-3" />
                    Cash on Delivery
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Pay when your order arrives at your doorstep
                </p>
              </div>

              <Separator />

              {/* Customer Information */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Customer Information
                </Label>
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {customerRecord?.name || user?.displayName || user?.email?.split("@")[0] || "Customer"}
                    </span>
                  </div>
                  {customerRecord?.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{customerRecord.phone}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-amber-600 dark:text-amber-400">
                        No phone number saved - update your profile
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Delivery Address Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Delivery Address
                </Label>

                {/* Address Selection Toggle - Only show if customer has saved address */}
                {customerRecord?.address ? (
                  <div className="space-y-3">
                    {/* Toggle between saved and new address */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Use saved address</span>
                      </div>
                      <Switch
                        checked={useDefaultAddress}
                        onCheckedChange={setUseDefaultAddress}
                      />
                    </div>

                    {/* Show saved address when toggle is ON */}
                    {useDefaultAddress ? (
                      <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-800 dark:text-green-200">Saved Address</p>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                              {[customerRecord.address, customerRecord.city, customerRecord.country].filter(Boolean).join(", ")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Show textarea when toggle is OFF */
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Edit3 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Enter a different address</span>
                        </div>
                        <textarea
                          id="customDeliveryAddress"
                          placeholder="Enter your delivery address..."
                          value={customDeliveryAddress}
                          onChange={(e) => setCustomDeliveryAddress(e.target.value)}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* No saved address - show input directly */
                  <div>
                    <div className="p-3 mb-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        💡 Enter your delivery address. It will be saved for future orders.
                      </p>
                    </div>
                    <textarea
                      id="deliveryAddress"
                      placeholder="Enter your full delivery address (e.g., 123 Main St, Calamba, Laguna)..."
                      value={customDeliveryAddress}
                      onChange={(e) => setCustomDeliveryAddress(e.target.value)}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                )}

                {/* Show effective address summary */}
                {effectiveDeliveryAddress && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Delivering to: {effectiveDeliveryAddress}
                  </div>
                )}
              </div>

              <Separator />

              {/* Order Notes */}
              <div>
                <Label htmlFor="notes">Order Notes (Optional)</Label>
                <textarea
                  id="notes"
                  placeholder="Any special instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={isSubmitting || cart.length === 0}
              >
                {isSubmitting ? (
                  "Placing Order..."
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Place Order - {formatCurrency(cartTotal)}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

