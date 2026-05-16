import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Categoria } from '../lib/api-types';
import { useAuth } from './auth';

export interface CartItem {
  operacionId: string;
  titulo: string;
  totalAmount: string;
  currency: string;
  categoria: Categoria | null;
  stock: number;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  addToCart: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  removeFromCart: (operacionId: string) => void;
  updateQty: (operacionId: string, qty: number) => void;
  inCart: (operacionId: string) => boolean;
  getQty: (operacionId: string) => number;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  count: 0,
  addToCart: () => {},
  removeFromCart: () => {},
  updateQty: () => {},
  inCart: () => false,
  getQty: () => 0,
});

function storageKey(userId: string) {
  return `om.cart.${userId}`;
}

function loadItems(userId: string): CartItem[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveItems(userId: string, items: CartItem[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(items));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (userId) setItems(loadItems(userId));
    else setItems([]);
  }, [userId]);

  const persist = useCallback(
    (next: CartItem[]) => {
      if (userId) saveItems(userId, next);
      setItems(next);
    },
    [userId],
  );

  const addToCart = useCallback(
    (item: Omit<CartItem, 'qty'>, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.operacionId === item.operacionId);
        const next = existing
          ? prev.map((i) =>
              i.operacionId === item.operacionId
                ? { ...i, qty: Math.min(item.stock, i.qty + qty) }
                : i,
            )
          : [...prev, { ...item, qty: Math.min(item.stock, qty) }];
        if (userId) saveItems(userId, next);
        return next;
      });
    },
    [userId],
  );

  const removeFromCart = useCallback(
    (operacionId: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.operacionId !== operacionId);
        if (userId) saveItems(userId, next);
        return next;
      });
    },
    [userId],
  );

  const updateQty = useCallback(
    (operacionId: string, qty: number) => {
      setItems((prev) => {
        const next = prev.map((i) =>
          i.operacionId === operacionId ? { ...i, qty: Math.max(1, Math.min(i.stock, qty)) } : i,
        );
        if (userId) saveItems(userId, next);
        return next;
      });
    },
    [userId],
  );

  const inCart = useCallback((operacionId: string) => items.some((i) => i.operacionId === operacionId), [items]);
  const getQty = useCallback((operacionId: string) => items.find((i) => i.operacionId === operacionId)?.qty ?? 0, [items]);

  void persist;

  return (
    <CartContext.Provider value={{ items, count: items.length, addToCart, removeFromCart, updateQty, inCart, getQty }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
