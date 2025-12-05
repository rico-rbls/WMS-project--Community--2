import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import type { InventoryItem } from "@/types";

// Cart item structure
export interface CartItem {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availableStock: number;
  imageUrl?: string;
  brand: string;
  category: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: InventoryItem, quantity?: number) => void;
  removeFromCart: (inventoryItemId: string) => void;
  updateQuantity: (inventoryItemId: string, newQuantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  itemCount: number;
  isInCart: (inventoryItemId: string) => boolean;
  getCartItem: (inventoryItemId: string) => CartItem | undefined;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = useCallback((item: InventoryItem, quantity: number = 1) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(c => c.inventoryItemId === item.id);
      if (existingIndex >= 0) {
        // Update existing item quantity
        const newCart = [...prev];
        const newQty = Math.min(
          newCart[existingIndex].quantity + quantity,
          newCart[existingIndex].availableStock
        );
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newQty,
          totalPrice: newQty * newCart[existingIndex].unitPrice,
        };
        return newCart;
      }
      // Add new item
      const newItem: CartItem = {
        inventoryItemId: item.id,
        itemName: item.name,
        quantity: Math.min(quantity, item.quantity),
        unitPrice: item.pricePerPiece,
        totalPrice: Math.min(quantity, item.quantity) * item.pricePerPiece,
        availableStock: item.quantity,
        imageUrl: item.photoUrl,
        brand: item.brand,
        category: item.category,
      };
      return [...prev, newItem];
    });
  }, []);

  const removeFromCart = useCallback((inventoryItemId: string) => {
    setCart(prev => prev.filter(item => item.inventoryItemId !== inventoryItemId));
  }, []);

  const updateQuantity = useCallback((inventoryItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(inventoryItemId);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.inventoryItemId === inventoryItemId) {
        const qty = Math.min(newQuantity, item.availableStock);
        return {
          ...item,
          quantity: qty,
          totalPrice: qty * item.unitPrice,
        };
      }
      return item;
    }));
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const isInCart = useCallback((inventoryItemId: string) => {
    return cart.some(item => item.inventoryItemId === inventoryItemId);
  }, [cart]);

  const getCartItem = useCallback((inventoryItemId: string) => {
    return cart.find(item => item.inventoryItemId === inventoryItemId);
  }, [cart]);

  const value: CartContextType = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    itemCount,
    isInCart,
    getCartItem,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

