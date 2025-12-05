import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { useNotifications } from "@/context/notifications-context";
import { getCustomers, createSalesOrder } from "@/services/api";
import type { Customer, SalesOrder } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  ImageIcon,
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  ShoppingBag,
  MapPin,
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
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<SalesOrder | null>(null);
  const [customersData, setCustomersData] = useState<Customer[]>([]);

  // Load customers data
  useEffect(() => {
    getCustomers().then(setCustomersData).catch(() => {});
  }, []);

  // Find customer record matching logged-in user
  const customerRecord = useMemo(() => {
    if (!user?.email) return null;
    return customersData.find(c => c.email === user.email);
  }, [user?.email, customersData]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!customerRecord) {
      toast.error("Customer account not found. Please contact support.");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItems = cart.map(item => ({
        inventoryItemId: item.inventoryItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }));

      const order = await createSalesOrder({
        customerId: customerRecord.id,
        customerName: customerRecord.name,
        customerCountry: customerRecord.country,
        customerCity: customerRecord.city,
        deliveryAddress: deliveryAddress || customerRecord.address || undefined,
        soDate: new Date().toISOString().split("T")[0],
        items: orderItems,
        totalAmount: cartTotal,
        receiptStatus: parseFloat(amountPaid) >= cartTotal ? "Paid" : parseFloat(amountPaid) > 0 ? "Partially Paid" : "Unpaid",
        notes: notes || undefined,
        amountPaid: parseFloat(amountPaid) || 0,
      });

      setOrderPlaced(order);
      clearCart();

      // Notify admins
      await sendNotification({
        title: "New Customer Order",
        message: `${customerRecord.name} placed an order for ${formatCurrency(cartTotal)}`,
        type: "info",
        recipientRoles: ["Admin", "Owner"],
      });

      toast.success("Order placed successfully!");
    } catch (error) {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order confirmation view
  if (orderPlaced) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Placed Successfully!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for your order. We&apos;ll process it shortly.
            </p>
            <div className="bg-background rounded-lg p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID:</span>
                <span className="font-mono font-medium">{orderPlaced.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{new Date(orderPlaced.soDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items:</span>
                <span>{orderPlaced.items.length} item(s)</span>
              </div>
              {orderPlaced.deliveryAddress && (
                <div className="flex items-start gap-2 pt-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-sm text-muted-foreground">Deliver to:</span>
                    <p className="text-sm">{orderPlaced.deliveryAddress}</p>
                  </div>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span className="text-primary">{formatCurrency(orderPlaced.totalAmount)}</span>
              </div>
              {orderPlaced.amountPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span>{formatCurrency(orderPlaced.amountPaid)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigateToView("sales-orders")}>
                View My Orders
              </Button>
              <Button onClick={() => { setOrderPlaced(null); navigateToView("products"); }}>
                Continue Shopping
              </Button>
            </div>
          </CardContent>
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigateToView("products")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
          <p className="text-muted-foreground">{itemCount} item(s) in your cart</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <Card key={item.inventoryItemId}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{item.itemName}</h4>
                    <p className="text-sm text-muted-foreground">{item.brand}</p>
                    <p className="text-primary font-medium mt-1">{formatCurrency(item.unitPrice)}</p>
                  </div>
                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end gap-2">
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
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(cartTotal)}</span>
              </div>

              <div className="space-y-3 pt-4">
                <div>
                  <Label htmlFor="deliveryAddress">Delivery Address</Label>
                  <textarea
                    id="deliveryAddress"
                    placeholder={customerRecord?.address || "Enter your delivery address..."}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="mt-1.5 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {customerRecord?.address && !deliveryAddress && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: {customerRecord.address}, {customerRecord.city}, {customerRecord.country}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <textarea
                    id="notes"
                    placeholder="Any special instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1.5 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div>
                  <Label htmlFor="amountPaid">Amount to Pay Now (Optional)</Label>
                  <Input
                    id="amountPaid"
                    type="number"
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
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
                    <CreditCard className="h-4 w-4 mr-2" />
                    Place Order
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

