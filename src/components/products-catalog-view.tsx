import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { InventoryItem } from "@/types";
import { getInventory } from "@/services/firebase-inventory-api";
import { getCategories } from "@/services/api";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Search,
  Package,
  ImageIcon,
  Tag,
  Eye,
  Layers,
} from "lucide-react";
import type { ViewType } from "@/App";
import type { CategoryDefinition } from "@/types";

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

interface ProductsCatalogViewProps {
  navigateToView: (view: ViewType) => void;
}

export function ProductsCatalogView({ navigateToView }: ProductsCatalogViewProps) {
  const { addToCart, getCartItem, itemCount, cartTotal } = useCart();
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [categoryDefinitions, setCategoryDefinitions] = useState<CategoryDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [quantityInput, setQuantityInput] = useState<string>("1");

  useEffect(() => {
    async function loadData() {
      try {
        const [inventory, cats] = await Promise.all([
          getInventory(),
          getCategories()
        ]);
        setInventoryData(inventory);
        setCategoryDefinitions(cats);
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

  // Get categories from the category definitions (matching inventory module)
  const categories = useMemo(() => {
    return categoryDefinitions.map(cat => ({
      id: cat.name,
      name: cat.name,
    }));
  }, [categoryDefinitions]);

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
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Inventory</h1>
          <p className="text-muted-foreground">
            Browse our complete inventory of {allProducts.length} items
          </p>
        </div>
        {itemCount > 0 && (
          <Button onClick={() => navigateToView("customer-cart")}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Order ({itemCount}) - {formatCurrency(cartTotal)}
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

      {/* Product Grid - 2 columns on mobile */}
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
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
          {filteredProducts.map((product) => {
            const availability = getAvailability(product);
            const cartItem = getCartItem(product.id);
            const inCart = !!cartItem;

            return (
              <Card key={product.id} className="group overflow-hidden hover:shadow-md transition-all">
                {/* Product Image */}
                <div
                  className="aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative overflow-hidden cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  {product.photoUrl ? (
                    <img
                      src={product.photoUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground/50">
                      <ImageIcon className="h-6 w-6 sm:h-10 sm:w-10 mb-1" />
                      <span className="text-[10px] sm:text-xs">No image</span>
                    </div>
                  )}
                  <Badge
                    className={`absolute top-1 right-1 sm:top-2 sm:right-2 text-[10px] sm:text-xs ${
                      availability === "In Stock" ? "bg-green-500/90" :
                      availability === "Low Stock" ? "bg-amber-500/90" : "bg-red-500/90"
                    }`}
                  >
                    {availability === "Out of Stock" ? "Out" : availability === "Low Stock" ? "Low" : "In Stock"}
                  </Badge>
                  {/* View Details overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="sm" variant="secondary" className="gap-1">
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">View Details</span>
                    </Button>
                  </div>
                </div>
                {/* Product Details */}
                <CardContent className="p-2 sm:p-4">
                  <h4 className="font-semibold text-xs sm:text-base line-clamp-1">{product.name}</h4>
                  <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                    <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                    <span className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{product.brand}</span>
                  </div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground line-clamp-2 mt-1 sm:mt-2 min-h-[1.5rem] sm:min-h-[2.5rem] hidden sm:block">
                    {product.description || `Quality ${product.brand} product.`}
                  </p>
                  <Separator className="my-1.5 sm:my-3" />
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-sm sm:text-lg font-bold ${availability === "Out of Stock" ? "text-muted-foreground" : "text-primary"}`}>
                      {formatCurrency(product.pricePerPiece)}
                    </span>
                    {availability === "Out of Stock" ? (
                      <Button size="sm" variant="outline" disabled className="opacity-60 h-7 sm:h-9 text-[10px] sm:text-sm px-2 sm:px-3">
                        Out
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        className="gap-1 h-7 sm:h-9 text-[10px] sm:text-sm px-2 sm:px-3"
                        variant={inCart ? "secondary" : "default"}
                      >
                        <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{inCart ? "Add More" : "Add"}</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => {
        if (!open) {
          setSelectedProduct(null);
          setQuantityInput("1");
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedProduct && (() => {
            const availability = getAvailability(selectedProduct);
            const cartItem = getCartItem(selectedProduct.id);
            const inCart = !!cartItem;
            const maxQty = selectedProduct.quantity - (cartItem?.quantity || 0);
            const parsedQty = parseInt(quantityInput) || 0;
            const validQty = Math.min(Math.max(1, parsedQty), maxQty);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl">{selectedProduct.name}</DialogTitle>
                </DialogHeader>

                {/* Product Image */}
                <div className="aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted rounded-lg flex items-center justify-center overflow-hidden">
                  {selectedProduct.photoUrl ? (
                    <img
                      src={selectedProduct.photoUrl}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground/50">
                      <ImageIcon className="h-16 w-16 mb-2" />
                      <span className="text-sm">No image available</span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-4">
                  {/* Brand & Category */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {selectedProduct.brand}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Layers className="h-3 w-3" />
                      {selectedProduct.category}
                    </Badge>
                    <Badge
                      className={`${
                        availability === "In Stock" ? "bg-green-500" :
                        availability === "Low Stock" ? "bg-amber-500" : "bg-red-500"
                      }`}
                    >
                      {availability}
                    </Badge>
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                    <p className="text-sm">
                      {selectedProduct.description || `Quality ${selectedProduct.brand} product. Great value for your money.`}
                    </p>
                  </div>

                  {/* Stock Info */}
                  {availability !== "Out of Stock" && (
                    <div className="text-sm text-muted-foreground">
                      {selectedProduct.quantity} units available
                    </div>
                  )}

                  <Separator />

                  {/* Quantity Input */}
                  {availability !== "Out of Stock" && maxQty > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantity</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={maxQty}
                          value={quantityInput}
                          onChange={(e) => setQuantityInput(e.target.value)}
                          onBlur={() => {
                            // Validate and clamp on blur
                            const parsed = parseInt(quantityInput) || 1;
                            const clamped = Math.min(Math.max(1, parsed), maxQty);
                            setQuantityInput(clamped.toString());
                          }}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">
                          of {maxQty} available
                        </span>
                      </div>
                      {parsedQty > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Subtotal: {formatCurrency(selectedProduct.pricePerPiece * validQty)}
                        </p>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Price & Add to Cart */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Price per unit</p>
                      <p className={`text-2xl font-bold ${availability === "Out of Stock" ? "text-muted-foreground" : "text-primary"}`}>
                        {formatCurrency(selectedProduct.pricePerPiece)}
                      </p>
                    </div>

                    {availability === "Out of Stock" ? (
                      <Button disabled variant="outline" className="opacity-60">
                        Out of Stock
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          addToCart(selectedProduct, validQty);
                          toast.success(`Added ${validQty} × ${selectedProduct.name} to order`);
                          setSelectedProduct(null);
                          setQuantityInput("1");
                        }}
                        disabled={maxQty <= 0 || validQty <= 0}
                        className="gap-2"
                        variant={inCart ? "secondary" : "default"}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {inCart ? `Add ${validQty} More` : `Add ${validQty} to Order`}
                      </Button>
                    )}
                  </div>

                  {inCart && (
                    <p className="text-sm text-muted-foreground text-center">
                      You have {cartItem.quantity} in your order
                    </p>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

