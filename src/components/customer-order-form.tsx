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
  Star,
  ImageIcon,
  Tag,
} from "lucide-react";

// Customer-friendly product representation
interface CustomerProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  availability: "In Stock" | "Low Stock" | "Out of Stock";
  imageUrl?: string;
  maxQuantity: number; // Hidden stock for cart validation
}

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

// Customer-friendly category names mapping
const categoryDisplayNames: Record<string, string> = {
  "Books": "Books & Literature",
  "Clothing": "Fashion & Apparel",
  "Electronics": "Electronics & Gadgets",
  "Food": "Food & Beverages",
  "Furniture": "Home & Furniture",
  "Health": "Health & Wellness",
  "Sports": "Sports & Outdoors",
  "Toys": "Toys & Games",
  "Other": "Other Products",
};

// Transform inventory item to customer-friendly product
function transformToCustomerProduct(item: InventoryItem): CustomerProduct {
  // Determine availability status (hide exact numbers)
  let availability: CustomerProduct["availability"] = "In Stock";
  if (item.quantity <= 0) {
    availability = "Out of Stock";
  } else if (item.quantity <= (item.reorderLevel ?? 10)) {
    availability = "Low Stock";
  }

  return {
    id: item.id,
    name: item.name,
    description: item.description || `Quality ${item.brand} ${item.name} in the ${item.category} category.`,
    category: categoryDisplayNames[item.category] || item.category,
    brand: item.brand,
    price: item.pricePerPiece,
    availability,
    imageUrl: item.photoUrl,
    maxQuantity: item.quantity, // Hidden - only used for cart validation
  };
}

export function CustomerOrderForm({ inventoryData, customersData, onSubmitOrder, onCancel }: CustomerOrderFormProps) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [notes, setNotes] = useState("");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState<SalesOrder | null>(null);

  // Find customer record matching logged-in user
  const customerRecord = useMemo(() => {
    if (!user?.email) return null;
    return customersData.find(c => c.email === user.email);
  }, [user?.email, customersData]);

  // Transform inventory to customer-friendly products
  const customerProducts = useMemo(() => {
    return inventoryData
      .filter(item => !item.archived && item.quantity > 0) // Only show non-archived, in-stock items
      .map(transformToCustomerProduct);
  }, [inventoryData]);

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(customerProducts.map(p => p.category))];
    return uniqueCategories.sort();
  }, [customerProducts]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return customerProducts.filter(product => {
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [customerProducts, searchTerm, selectedCategory]);

  // Calculate totals
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const addToCart = (product: CustomerProduct) => {
    const existingIndex = cart.findIndex(item => item.inventoryItemId === product.id);
    if (existingIndex >= 0) {
      // Update quantity if already in cart
      const newCart = [...cart];
      const newQty = Math.min(newCart[existingIndex].quantity + 1, product.maxQuantity);
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
        unitPrice: product.price,
        totalPrice: product.price,
        availableStock: product.maxQuantity,
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
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Shop Products
                  </CardTitle>
                  <CardDescription>
                    {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} available
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products, brands..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setSelectedCategory("all")}
                >
                  All Products
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px]">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mb-4 opacity-50" />
                  <p className="font-medium">No products found</p>
                  <p className="text-sm">Try adjusting your search or category filter</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find(item => item.inventoryItemId === product.id);
                    return (
                      <div
                        key={product.id}
                        className="group border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-md transition-all"
                      >
                        {/* Product Image */}
                        <div className="aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative overflow-hidden">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-muted-foreground/50">
                              <ImageIcon className="h-12 w-12 mb-1" />
                              <span className="text-xs">No image</span>
                            </div>
                          )}
                          {/* Availability Badge */}
                          <Badge
                            variant={product.availability === "Low Stock" ? "secondary" : "default"}
                            className={`absolute top-2 right-2 text-xs ${
                              product.availability === "In Stock" ? "bg-green-500/90" :
                              product.availability === "Low Stock" ? "bg-amber-500/90 text-white" : ""
                            }`}
                          >
                            {product.availability}
                          </Badge>
                        </div>
                        {/* Product Details */}
                        <div className="p-4">
                          <div className="mb-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold line-clamp-1">{product.name}</h4>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{product.brand}</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
                            {product.description}
                          </p>
                          <Separator className="my-3" />
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-primary">
                              {formatCurrency(product.price)}
                            </span>
                            {inCart ? (
                              <div className="flex items-center gap-1.5 bg-accent rounded-lg p-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(cart.indexOf(inCart), -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center font-semibold text-sm">{inCart.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(cart.indexOf(inCart), 1)}
                                  disabled={inCart.quantity >= product.maxQuantity}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => addToCart(product)}
                                className="gap-1"
                              >
                                <ShoppingCart className="h-4 w-4" />
                                Add to Cart
                              </Button>
                            )}
                          </div>
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
