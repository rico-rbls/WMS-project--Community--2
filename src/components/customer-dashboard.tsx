import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { InventoryItem } from "@/types";
import { getInventory } from "@/services/firebase-inventory-api";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Plus,
  Minus,
  Package,
  Sparkles,
  ImageIcon,
  Tag,
  ArrowRight,
  TrendingUp,
  Star,
} from "lucide-react";
import type { ViewType } from "@/App";

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

// Category display names mapping
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

interface CustomerDashboardProps {
  navigateToView: (view: ViewType) => void;
}

export function CustomerDashboard({ navigateToView }: CustomerDashboardProps) {
  const { user } = useAuth();
  const { addToCart, isInCart, getCartItem, updateQuantity, itemCount, cartTotal } = useCart();
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getInventory();
        setInventoryData(data);
      } catch (error) {
        toast.error("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Get featured products (non-archived, in-stock, limit 8)
  const featuredProducts = useMemo(() => {
    return inventoryData
      .filter(item => !item.archived && item.quantity > 0)
      .slice(0, 8);
  }, [inventoryData]);

  // Get categories with product counts
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    inventoryData.filter(i => !i.archived).forEach(item => {
      const displayName = categoryDisplayNames[item.category] || item.category;
      counts[displayName] = (counts[displayName] || 0) + 1;
    });
    return Object.entries(counts).slice(0, 6);
  }, [inventoryData]);

  const getAvailability = (item: InventoryItem) => {
    if (item.quantity <= 0) return "Out of Stock";
    if (item.quantity <= (item.reorderLevel ?? 10)) return "Low Stock";
    return "In Stock";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
        <CardContent className="py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome back, {user?.displayName || "User"}! 👋
              </h1>
              <p className="text-muted-foreground mt-2">
                Browse warehouse inventory and place your orders with ease.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigateToView("customer-cart")}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Orders ({itemCount})
              </Button>
              <Button onClick={() => navigateToView("products")}>
                <Package className="h-4 w-4 mr-2" />
                Browse Inventory
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {itemCount > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">You have {itemCount} item(s) in your order</p>
                  <p className="text-sm text-muted-foreground">Total: {formatCurrency(cartTotal)}</p>
                </div>
              </div>
              <Button onClick={() => navigateToView("customer-cart")}>
                View Order <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Shop by Category
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {categoriesWithCounts.map(([category, count]) => (
            <Card
              key={category}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigateToView("products")}
            >
              <CardContent className="p-4 text-center">
                <p className="font-medium text-sm">{category}</p>
                <p className="text-xs text-muted-foreground">{count} products</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Featured Products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Featured Products
          </h2>
          <Button variant="ghost" onClick={() => navigateToView("products")}>
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredProducts.map((product) => {
            const availability = getAvailability(product);
            const cartItem = getCartItem(product.id);
            const inCart = !!cartItem;

            return (
              <Card key={product.id} className="group overflow-hidden hover:shadow-md transition-all">
                {/* Product Image */}
                <div className="aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative overflow-hidden">
                  {product.photoUrl ? (
                    <img
                      src={product.photoUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground/50">
                      <ImageIcon className="h-10 w-10 mb-1" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                  <Badge
                    className={`absolute top-2 right-2 text-xs ${
                      availability === "In Stock" ? "bg-green-500/90" :
                      availability === "Low Stock" ? "bg-amber-500/90" : "bg-red-500/90"
                    }`}
                  >
                    {availability}
                  </Badge>
                </div>
                {/* Product Details */}
                <CardContent className="p-4">
                  <h4 className="font-semibold line-clamp-1">{product.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{product.brand}</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(product.pricePerPiece)}
                    </span>
                    {availability === "Out of Stock" ? (
                      <Button size="sm" variant="outline" disabled className="opacity-60">
                        Out of Stock
                      </Button>
                    ) : inCart ? (
                      <div className="flex items-center gap-1.5 bg-accent rounded-lg p-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-semibold text-sm">{cartItem.quantity}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                          disabled={cartItem.quantity >= product.quantity}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => addToCart(product)} className="gap-1">
                        <ShoppingCart className="h-4 w-4" />
                        Add
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

