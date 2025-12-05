import { useState, useMemo } from "react";
import { toast } from "sonner";
import type { InventoryItem, Customer, SalesOrder } from "@/types";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  Package,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface CartItem {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availableStock: number;
}

interface CustomerOrderFormProps {
  inventoryData: InventoryItem[];
  customersData: Customer[];
  onSubmitOrder: (orderData: {
    items: Omit<CartItem, "availableStock">[];
    notes: string;
    amountPaid: number;
    customerName: string;
    customerId: string;
    customerCountry: string;
    customerCity: string;
  }) => Promise<SalesOrder>;
  onCancel: () => void;
}

const formatCurrency = (amount: number) => `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

export function CustomerOrderForm({ inventoryData, customersData, onSubmitOrder, onCancel }: CustomerOrderFormProps) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState<SalesOrder | null>(null);

  // Find customer record matching logged-in user
  const customerRecord = useMemo(() => {
    if (!user?.email) return null;
    return customersData.find(c => c.email === user.email);
  }, [user?.email, customersData]);

  // Filter available products (in stock only)
  const availableProducts = useMemo(() => {
    return inventoryData.filter(item => {
      const inStock = item.quantity > 0;
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      return inStock && matchesSearch;
    });
  }, [inventoryData, searchTerm]);

  // Calculate totals
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const addToCart = (product: InventoryItem) => {
    const existingIndex = cart.findIndex(item => item.inventoryItemId === product.id);
    if (existingIndex >= 0) {
      // Update quantity if already in cart
      const newCart = [...cart];
      const newQty = Math.min(newCart[existingIndex].quantity + 1, product.quantity);
      newCart[existingIndex] = {
        ...newCart[existingIndex],
        quantity: newQty,
        totalPrice: newQty * newCart[existingIndex].unitPrice,
      };
      setCart(newCart);
    } else {
      // Add new item
      setCart([...cart, {
        inventoryItemId: product.id,
        itemName: product.name,
        quantity: 1,
        unitPrice: product.price ?? 0,
        totalPrice: product.price ?? 0,
        availableStock: product.quantity,
      }]);
    }
    toast.success(`Added ${product.name} to cart`);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    const newQty = newCart[index].quantity + delta;
    if (newQty <= 0) {
      newCart.splice(index, 1);
    } else if (newQty <= newCart[index].availableStock) {
      newCart[index] = {
        ...newCart[index],
        quantity: newQty,
        totalPrice: newQty * newCart[index].unitPrice,
      };
    }
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast.error("Please add items to your cart");
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await onSubmitOrder({
        items: cart.map(({ availableStock, ...item }) => item),
        notes,
        amountPaid,
        customerName: customerRecord?.name || user?.displayName || user?.email || "Customer",
        customerId: customerRecord?.id || "",
        customerCountry: customerRecord?.country || "",
        customerCity: customerRecord?.city || "",
      });
      setOrderComplete(order);
      toast.success("Order placed successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order confirmation view
  if (orderComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">Order Confirmed!</CardTitle>
              <CardDescription className="text-green-700">
                Thank you for your order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono font-semibold">{orderComplete.id}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(orderComplete.soDate).toLocaleDateString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span>{orderComplete.items.length} item(s)</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold text-lg">{formatCurrency(orderComplete.totalAmount)}</span>
                </div>
                {orderComplete.amountPaid > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span className="text-green-600">{formatCurrency(orderComplete.amountPaid)}</span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Pending
                  </Badge>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium mb-2">Order Items</h4>
                <div className="space-y-2">
                  {orderComplete.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.itemName} × {item.quantity}</span>
                      <span>{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={onCancel}>
                Continue Shopping
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Catalog */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Product Catalog
                </CardTitle>
                <CardDescription>Browse and add products to your order</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {availableProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mb-4 opacity-50" />
                  <p>No products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableProducts.map((product) => {
                    const inCart = cart.find(item => item.inventoryItemId === product.id);
                    return (
                      <div
                        key={product.id}
                        className="border rounded-lg p-4 hover:border-primary/50 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{product.name}</h4>
                            <p className="text-sm text-muted-foreground">{product.category}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {product.quantity} in stock
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-lg font-semibold text-primary">
                            {formatCurrency(product.price ?? 0)}
                          </span>
                          {inCart ? (
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(cart.indexOf(inCart), -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">{inCart.quantity}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(cart.indexOf(inCart), 1)}
                                disabled={inCart.quantity >= product.quantity}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" onClick={() => addToCart(product)}>
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Shopping Cart */}
      <div className="space-y-4">
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Your Cart
              {itemCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {itemCount} item{itemCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Your cart is empty</p>
                <p className="text-sm">Add products to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={item.inventoryItemId} className="flex items-center gap-3 p-2 rounded-lg bg-accent/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.itemName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.unitPrice)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(index, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(index, 1)}
                        disabled={item.quantity >= item.availableStock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right w-20">
                      <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeFromCart(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          {cart.length > 0 && (
            <>
              <Separator />
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Special Instructions (optional)</label>
                  <Input
                    placeholder="Any special requests..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount to Pay Now (optional)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={amountPaid || ""}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <Separator />
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(cartTotal)}</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "Placing Order..."
                  ) : (
                    <>
                      Place Order
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button variant="ghost" className="w-full" onClick={onCancel}>
                  Cancel
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
