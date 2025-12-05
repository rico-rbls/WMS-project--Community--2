import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { InventoryItem } from "@/types";
import { getInventory } from "@/services/firebase-inventory-api";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Plus,
  Minus,
  Search,
  Package,
  ImageIcon,
  Tag,
  Filter,
  Grid3X3,
  LayoutList,
  ArrowRight,
} from "lucide-react";
import type { ViewType } from "@/App";

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

// Category display names
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

interface ProductsCatalogViewProps {
  navigateToView: (view: ViewType) => void;
}

export function ProductsCatalogView({ navigateToView }: ProductsCatalogViewProps) {
  const { addToCart, getCartItem, updateQuantity, itemCount, cartTotal } = useCart();
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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

  // Get all products (non-archived)
  const allProducts = useMemo(() => {
    return inventoryData.filter(item => !item.archived);
  }, [inventoryData]);

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCats = [...new Set(allProducts.map(p => p.category))];
    return uniqueCats.map(cat => ({
      id: cat,
      name: categoryDisplayNames[cat] || cat,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allProducts, searchTerm, selectedCategory]);

  const getAvailability = (item: InventoryItem) => {
    if (item.quantity <= 0) return "Out of Stock";
    if (item.quantity <= (item.reorderLevel ?? 10)) return "Low Stock";
    return "In Stock";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Browse our complete catalog of {allProducts.length} products
          </p>
        </div>
        {itemCount > 0 && (
          <Button onClick={() => navigateToView("customer-cart")}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Cart ({itemCount}) - {formatCurrency(cartTotal)}
          </Button>
        )}
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products, brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                All
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredProducts.length} of {allProducts.length} products
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="font-medium">No products found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
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
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2 min-h-[2.5rem]">
                    {product.description || `Quality ${product.brand} product.`}
                  </p>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-bold ${availability === "Out of Stock" ? "text-muted-foreground" : "text-primary"}`}>
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
      )}
    </div>
  );
}

