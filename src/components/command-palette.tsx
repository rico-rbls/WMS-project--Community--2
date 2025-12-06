import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import {
  Search, SearchX, Package, ShoppingCart, ClipboardList, Truck, Users,
  Clock, X, Loader2, HelpCircle
} from "lucide-react";
import { cn } from "./ui/utils";
import { useAppContext } from "../context/app-context";
import { useAuth } from "../context/auth-context";
import { getPurchaseOrders } from "../services/api";
import { useDebounce } from "../hooks/useDebounce";
import type { PurchaseOrder, EntityType } from "../types";
import type { ViewType } from "../App";

// Types for search results
interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  module: EntityType;
  moduleName: string;
  icon: typeof Package;
  matchedFields: string[];
}

interface ParsedFilter {
  key: string;
  value: string;
  operator?: ">" | "<" | "=" | ">=" | "<=";
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: ViewType, itemId?: string) => void;
}

const STORAGE_KEY = "wms_recent_searches";
const MAX_RECENT_SEARCHES = 10;
const MIN_SEARCH_LENGTH = 2;
const MAX_RESULTS_PER_MODULE = 10;

// Module configuration
const MODULE_CONFIG: Record<EntityType, { name: string; icon: typeof Package; view: ViewType }> = {
  inventory: { name: "Inventory", icon: Package, view: "inventory" },
  orders: { name: "Orders", icon: ShoppingCart, view: "orders" },
  "purchase-orders": { name: "Purchase Orders", icon: ClipboardList, view: "purchase-orders" },
  shipments: { name: "Shipments", icon: Truck, view: "shipments" },
  suppliers: { name: "WMS Suppliers", icon: Users, view: "suppliers" },
};

// Filter syntax help
const FILTER_HELP = [
  { syntax: "status:critical", description: "Filter by status" },
  { syntax: "category:electronics", description: "Filter by category" },
  { syntax: "module:inventory", description: "Search in specific module" },
  { syntax: "supplier:ABC Corp", description: "Filter by supplier" },
  { syntax: "location:warehouse-a", description: "Filter by location" },
  { syntax: "price:>100", description: "Numeric range filter" },
];

export function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const { inventory, orders, shipments, suppliers } = useAppContext();
  const { user } = useAuth();
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setRecentSearches(parsed[user.id] || []);
        } catch { setRecentSearches([]); }
      }
    }
  }, [user]);

  // Load purchase orders when palette opens
  useEffect(() => {
    if (open) {
      getPurchaseOrders().then(setPurchaseOrders).catch(console.error);
      inputRef.current?.focus();
    } else {
      setQuery("");
      setSelectedIndex(0);
      setShowHelp(false);
    }
  }, [open]);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!user || searchQuery.length < MIN_SEARCH_LENGTH) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    let allSearches: Record<string, string[]> = {};
    if (stored) { try { allSearches = JSON.parse(stored); } catch {} }
    const userSearches = allSearches[user.id] || [];
    const filtered = userSearches.filter(s => s !== searchQuery);
    const updated = [searchQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    allSearches[user.id] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allSearches));
    setRecentSearches(updated);
  }, [user]);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    if (!user) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    let allSearches: Record<string, string[]> = {};
    if (stored) { try { allSearches = JSON.parse(stored); } catch {} }
    delete allSearches[user.id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allSearches));
    setRecentSearches([]);
  }, [user]);

  // Parse filters from query
  const parseFilters = useCallback((searchQuery: string): { filters: ParsedFilter[]; cleanQuery: string } => {
    const filters: ParsedFilter[] = [];
    let cleanQuery = searchQuery;
    // Match patterns like key:value, key:>value, key:<value
    const filterRegex = /(\w+):([<>=]*)([^\s]+)/g;
    let match;
    while ((match = filterRegex.exec(searchQuery)) !== null) {
      const [fullMatch, key, operator, value] = match;
      filters.push({ key: key.toLowerCase(), value, operator: operator as ParsedFilter["operator"] });
      cleanQuery = cleanQuery.replace(fullMatch, "").trim();
    }
    return { filters, cleanQuery };
  }, []);

  // Search across all modules
  const searchResults = useMemo(() => {
    if (debouncedQuery.length < MIN_SEARCH_LENGTH) return [];
    setIsLoading(true);

    const { filters, cleanQuery } = parseFilters(debouncedQuery);
    const searchLower = cleanQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Check module filter
    const moduleFilter = filters.find(f => f.key === "module")?.value.toLowerCase();
    const statusFilter = filters.find(f => f.key === "status")?.value.toLowerCase();
    const categoryFilter = filters.find(f => f.key === "category")?.value.toLowerCase();
    const supplierFilter = filters.find(f => f.key === "supplier")?.value.toLowerCase();
    const locationFilter = filters.find(f => f.key === "location")?.value.toLowerCase();
    const priceFilter = filters.find(f => f.key === "price");

    // Search Inventory
    if (!moduleFilter || moduleFilter === "inventory") {
      const items = (inventory || []).filter(item => {
        if (statusFilter && item.status.toLowerCase() !== statusFilter) return false;
        if (categoryFilter && item.category.toLowerCase() !== categoryFilter) return false;
        if (locationFilter && !item.location.toLowerCase().includes(locationFilter)) return false;
        if (priceFilter) {
          const price = item.pricePerPiece;
          const filterVal = parseFloat(priceFilter.value);
          if (priceFilter.operator === ">" && price <= filterVal) return false;
          if (priceFilter.operator === "<" && price >= filterVal) return false;
        }
        if (!cleanQuery) return true;
        return (
          item.id.toLowerCase().includes(searchLower) ||
          item.name.toLowerCase().includes(searchLower) ||
          item.brand.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower) ||
          item.location.toLowerCase().includes(searchLower)
        );
      }).slice(0, MAX_RESULTS_PER_MODULE);

      items.forEach(item => {
        const matchedFields: string[] = [];
        if (item.id.toLowerCase().includes(searchLower)) matchedFields.push("ID");
        if (item.name.toLowerCase().includes(searchLower)) matchedFields.push("Name");
        if (item.brand.toLowerCase().includes(searchLower)) matchedFields.push("Brand");
        results.push({
          id: item.id,
          title: item.name,
          subtitle: `${item.id} • ${item.brand} • ${item.category} • ${item.location}`,
          module: "inventory",
          moduleName: "Inventory",
          icon: Package,
          matchedFields,
        });
      });
    }

    // Search Orders
    if (!moduleFilter || moduleFilter === "orders") {
      const items = (orders || []).filter(order => {
        if (statusFilter && order.status.toLowerCase() !== statusFilter) return false;
        if (!cleanQuery) return true;
        return (
          order.id.toLowerCase().includes(searchLower) ||
          order.customer.toLowerCase().includes(searchLower) ||
          order.status.toLowerCase().includes(searchLower)
        );
      }).slice(0, MAX_RESULTS_PER_MODULE);

      items.forEach(order => {
        results.push({
          id: order.id,
          title: order.customer,
          subtitle: `${order.id} • ${order.status} • ${order.total}`,
          module: "orders",
          moduleName: "Orders",
          icon: ShoppingCart,
          matchedFields: [],
        });
      });
    }

    // Search Purchase Orders
    if (!moduleFilter || moduleFilter === "purchase-orders" || moduleFilter === "po") {
      const items = purchaseOrders.filter(po => {
        if (statusFilter && po.status.toLowerCase().replace(/\s/g, "-") !== statusFilter) return false;
        if (supplierFilter && !po.supplierName.toLowerCase().includes(supplierFilter)) return false;
        if (!cleanQuery) return true;
        return (
          po.id.toLowerCase().includes(searchLower) ||
          po.supplierName.toLowerCase().includes(searchLower) ||
          po.status.toLowerCase().includes(searchLower)
        );
      }).slice(0, MAX_RESULTS_PER_MODULE);

      items.forEach(po => {
        results.push({
          id: po.id,
          title: `${po.id} - ${po.supplierName}`,
          subtitle: `${po.status} • ₱${po.totalAmount.toLocaleString()}`,
          module: "purchase-orders",
          moduleName: "Purchase Orders",
          icon: ClipboardList,
          matchedFields: [],
        });
      });
    }

    // Search Shipments
    if (!moduleFilter || moduleFilter === "shipments") {
      const items = (shipments || []).filter(shipment => {
        if (statusFilter && shipment.status.toLowerCase().replace(/\s/g, "-") !== statusFilter) return false;
        if (!cleanQuery) return true;
        return (
          shipment.id.toLowerCase().includes(searchLower) ||
          shipment.orderId.toLowerCase().includes(searchLower) ||
          shipment.destination.toLowerCase().includes(searchLower) ||
          shipment.carrier.toLowerCase().includes(searchLower)
        );
      }).slice(0, MAX_RESULTS_PER_MODULE);

      items.forEach(shipment => {
        results.push({
          id: shipment.id,
          title: `${shipment.id} → ${shipment.destination}`,
          subtitle: `Order: ${shipment.orderId} • ${shipment.carrier} • ${shipment.status}`,
          module: "shipments",
          moduleName: "Shipments",
          icon: Truck,
          matchedFields: [],
        });
      });
    }

    // Search Suppliers
    if (!moduleFilter || moduleFilter === "suppliers") {
      const items = (suppliers || []).filter(supplier => {
        if (statusFilter && supplier.status.toLowerCase() !== statusFilter) return false;
        if (categoryFilter && !supplier.category.toLowerCase().includes(categoryFilter)) return false;
        if (!cleanQuery) return true;
        return (
          supplier.id.toLowerCase().includes(searchLower) ||
          supplier.name.toLowerCase().includes(searchLower) ||
          supplier.contact.toLowerCase().includes(searchLower) ||
          supplier.email.toLowerCase().includes(searchLower) ||
          supplier.category.toLowerCase().includes(searchLower)
        );
      }).slice(0, MAX_RESULTS_PER_MODULE);

      items.forEach(supplier => {
        results.push({
          id: supplier.id,
          title: supplier.name,
          subtitle: `${supplier.id} • ${supplier.contact} • ${supplier.category}`,
          module: "suppliers",
          moduleName: "WMS Suppliers",
          icon: Users,
          matchedFields: [],
        });
      });
    }

    setIsLoading(false);
    return results;
  }, [debouncedQuery, inventory, orders, purchaseOrders, shipments, suppliers, parseFilters]);

  // Group results by module
  const groupedResults = useMemo(() => {
    const groups: Record<EntityType, SearchResult[]> = {
      inventory: [],
      orders: [],
      "purchase-orders": [],
      shipments: [],
      suppliers: [],
    };
    searchResults.forEach(result => {
      groups[result.module].push(result);
    });
    return groups;
  }, [searchResults]);

  // Flatten for keyboard navigation
  const flatResults = useMemo(() => {
    return Object.values(groupedResults).flat();
  }, [groupedResults]);

  // Get active filters from query
  const activeFilters = useMemo(() => {
    return parseFilters(query).filters;
  }, [query, parseFilters]);

  // Handle result selection
  const handleSelect = useCallback((result: SearchResult) => {
    saveRecentSearch(query);
    onNavigate(MODULE_CONFIG[result.module].view, result.id);
    onOpenChange(false);
  }, [query, saveRecentSearch, onNavigate, onOpenChange]);

  // Handle recent search click
  const handleRecentSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);

  // Remove filter from query
  const removeFilter = useCallback((filterKey: string) => {
    const regex = new RegExp(`${filterKey}:[^\\s]+\\s*`, "gi");
    setQuery(prev => prev.replace(regex, "").trim());
  }, []);

  // Keyboard navigation - handle on the input element to avoid interfering with typing
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (flatResults[selectedIndex]) handleSelect(flatResults[selectedIndex]);
        break;
      case "Escape":
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  }, [flatResults, selectedIndex, handleSelect, onOpenChange]);

  // Reset selection when results change
  useEffect(() => { setSelectedIndex(0); }, [flatResults]);

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query || query.length < MIN_SEARCH_LENGTH) return text;
    const { cleanQuery } = parseFilters(query);
    if (!cleanQuery) return text;
    const regex = new RegExp(`(${cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{part}</mark> : part
    );
  };

  const showRecentSearches = query.length === 0 && recentSearches.length > 0;
  const showNoResults = query.length >= MIN_SEARCH_LENGTH && searchResults.length === 0 && !isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b px-4 py-3 gap-3">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search across all modules... (type ? for help)"
            className="border-0 focus-visible:ring-0 p-0 h-auto text-base"
            aria-label="Global search"
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1 hover:bg-muted rounded"
            title="Show filter syntax help"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 py-2 border-b bg-muted/30">
            {activeFilters.map((filter, idx) => (
              <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                <span className="font-medium">{filter.key}:</span>
                <span>{filter.operator || ""}{filter.value}</span>
                <button
                  onClick={() => removeFilter(filter.key)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Filter Help */}
        {showHelp && (
          <div className="px-4 py-3 border-b bg-blue-50 dark:bg-blue-950/30">
            <p className="text-sm font-medium mb-2">Filter Syntax:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {FILTER_HELP.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{item.syntax}</code>
                  <span className="text-muted-foreground">{item.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Area */}
        <ScrollArea className="max-h-[400px]" ref={resultsRef}>
          {/* Recent Searches */}
          {showRecentSearches && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1 mb-1">
                <span className="text-xs font-medium text-muted-foreground">Recent Searches</span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
              {recentSearches.map((search, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRecentSearch(search)}
                  className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted rounded-md transition-colors"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {showNoResults && (
            <div className="p-8 text-center">
              <SearchX className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No results found for "{query}"</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Try different keywords or use filters like <code className="bg-muted px-1 rounded">status:active</code>
              </p>
            </div>
          )}

          {/* Grouped Results */}
          {searchResults.length > 0 && (
            <div className="p-2">
              {(Object.entries(groupedResults) as [EntityType, SearchResult[]][])
                .filter(([, results]) => results.length > 0)
                .map(([module, results]) => (
                  <div key={module} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 px-2 py-1 mb-1">
                      {(() => {
                        const Icon = MODULE_CONFIG[module].icon;
                        return <Icon className="h-4 w-4 text-muted-foreground" />;
                      })()}
                      <span className="text-xs font-medium text-muted-foreground">
                        {MODULE_CONFIG[module].name}
                      </span>
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {results.length}
                      </Badge>
                    </div>
                    {results.map((result, idx) => {
                      const globalIdx = flatResults.indexOf(result);
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          className={cn(
                            "flex items-start gap-3 w-full px-3 py-2 text-left rounded-md transition-colors",
                            isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          )}
                        >
                          <result.icon className="h-4 w-4 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {highlightMatch(result.title, query)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {highlightMatch(result.subtitle, query)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
            </div>
          )}

          {/* Empty State for Initial Load */}
          {query.length === 0 && recentSearches.length === 0 && (
            <div className="p-8 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Start typing to search across all modules</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Search inventory, orders, purchase orders, shipments, and WMS suppliers
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Footer with Keyboard Hints */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px]">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px]">Enter</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px]">Esc</kbd>
              to close
            </span>
          </div>
          <span>{searchResults.length} result{searchResults.length !== 1 ? "s" : ""}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for keyboard shortcut
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}

