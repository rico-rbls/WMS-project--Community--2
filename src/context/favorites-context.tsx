import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { EntityType, FavoriteItem, SavedSearch, QuickLink } from "../types";

const FAVORITES_STORAGE_KEY = "wms_favorites";
const SAVED_SEARCHES_STORAGE_KEY = "wms_saved_searches";

interface FavoritesContextType {
  favorites: FavoriteItem[];
  savedSearches: SavedSearch[];
  quickLinks: QuickLink[];
  // Favorite operations
  addFavorite: (entityType: EntityType, entityId: string, entityName: string) => void;
  removeFavorite: (entityType: EntityType, entityId: string) => void;
  toggleFavorite: (entityType: EntityType, entityId: string, entityName: string) => void;
  isFavorite: (entityType: EntityType, entityId: string) => boolean;
  getFavoritesByType: (entityType: EntityType) => FavoriteItem[];
  getRecentFavorites: (limit?: number) => FavoriteItem[];
  // Saved search operations
  saveSearch: (name: string, entityType: EntityType, searchTerm?: string, filters?: Record<string, string | string[]>) => void;
  deleteSearch: (searchId: string) => void;
  getSearchesByType: (entityType: EntityType) => SavedSearch[];
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

// Default quick links for common filtered views
const defaultQuickLinks: QuickLink[] = [
  { id: "ql-1", label: "Low Stock Items", entityType: "inventory", filters: { status: "Low Stock" }, icon: "alert" },
  { id: "ql-2", label: "Critical Stock", entityType: "inventory", filters: { status: "Critical" }, icon: "alert-circle" },
  { id: "ql-3", label: "Pending Orders", entityType: "orders", filters: { status: "Pending" }, icon: "clock" },
  { id: "ql-4", label: "Processing Orders", entityType: "orders", filters: { status: "Processing" }, icon: "loader" },
  { id: "ql-5", label: "In Transit Shipments", entityType: "shipments", filters: { status: "In Transit" }, icon: "truck" },
  { id: "ql-6", label: "Active WMS Suppliers", entityType: "suppliers", filters: { status: "Active" }, icon: "users" },
];

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [quickLinks] = useState<QuickLink[]>(defaultQuickLinks);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
      const storedSearches = localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY);
      if (storedSearches) {
        setSavedSearches(JSON.parse(storedSearches));
      }
    } catch (error) {
      console.error("Failed to load favorites from localStorage:", error);
    }
  }, []);

  // Persist favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error("Failed to save favorites to localStorage:", error);
    }
  }, [favorites]);

  // Persist saved searches to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(savedSearches));
    } catch (error) {
      console.error("Failed to save searches to localStorage:", error);
    }
  }, [savedSearches]);

  const addFavorite = useCallback((entityType: EntityType, entityId: string, entityName: string) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.entityType === entityType && f.entityId === entityId);
      if (exists) return prev;
      const newFavorite: FavoriteItem = {
        id: `fav-${entityType}-${entityId}-${Date.now()}`,
        entityType,
        entityId,
        entityName,
        favoritedAt: new Date().toISOString(),
      };
      return [newFavorite, ...prev];
    });
  }, []);

  const removeFavorite = useCallback((entityType: EntityType, entityId: string) => {
    setFavorites(prev => prev.filter(f => !(f.entityType === entityType && f.entityId === entityId)));
  }, []);

  const toggleFavorite = useCallback((entityType: EntityType, entityId: string, entityName: string) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.entityType === entityType && f.entityId === entityId);
      if (exists) {
        return prev.filter(f => !(f.entityType === entityType && f.entityId === entityId));
      } else {
        const newFavorite: FavoriteItem = {
          id: `fav-${entityType}-${entityId}-${Date.now()}`,
          entityType,
          entityId,
          entityName,
          favoritedAt: new Date().toISOString(),
        };
        return [newFavorite, ...prev];
      }
    });
  }, []);

  const isFavorite = useCallback((entityType: EntityType, entityId: string) => {
    return favorites.some(f => f.entityType === entityType && f.entityId === entityId);
  }, [favorites]);

  const getFavoritesByType = useCallback((entityType: EntityType) => {
    return favorites.filter(f => f.entityType === entityType);
  }, [favorites]);

  const getRecentFavorites = useCallback((limit: number = 10) => {
    return [...favorites]
      .sort((a, b) => new Date(b.favoritedAt).getTime() - new Date(a.favoritedAt).getTime())
      .slice(0, limit);
  }, [favorites]);

  const saveSearch = useCallback((name: string, entityType: EntityType, searchTerm?: string, filters?: Record<string, string | string[]>) => {
    const newSearch: SavedSearch = {
      id: `search-${Date.now()}`,
      name,
      entityType,
      searchTerm,
      filters: filters || {},
      createdAt: new Date().toISOString(),
    };
    setSavedSearches(prev => [newSearch, ...prev]);
  }, []);

  const deleteSearch = useCallback((searchId: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== searchId));
  }, []);

  const getSearchesByType = useCallback((entityType: EntityType) => {
    return savedSearches.filter(s => s.entityType === entityType);
  }, [savedSearches]);

  return (
    <FavoritesContext.Provider value={{
      favorites,
      savedSearches,
      quickLinks,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      isFavorite,
      getFavoritesByType,
      getRecentFavorites,
      saveSearch,
      deleteSearch,
      getSearchesByType,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}

