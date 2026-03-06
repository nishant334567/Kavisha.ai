"use client"

import { useContext, useState, useEffect, useCallback } from "react"
import { useBrandContext } from '@/app/context/brand/BrandContextProvider';
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import CartContext from "./CartContext";

export function CartContextProvider({ children }) {
    const { user } = useFirebaseSession();
    const brandContext = useBrandContext()
    const brand = brandContext?.subdomain

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchCart = useCallback(async () => {
        if (!user?.id || !brand) {
            setItems([]);
            return;
        }

        try {
            const res = await fetch(`/api/cart?brand=${encodeURIComponent(brand)}`, {
                credentials: "include",
            });
            const data = await res.json();
            if (res.ok) {
                setItems(data.cart?.items || []);
            } else {
                setItems([]);
            }
        } catch {
            setItems([]);
        }

    }, [user?.id, brand]);

    useEffect(() => {
        fetchCart()
    }, [fetchCart])


    const addToCart = useCallback(async (product, quantity = 1) => {
        if (!user?.id) {
            console.error("Sign In to add to cart")
            return
        }
        if (!brand) {
            console.error("Sign In to add to cart")
            return
        }

        setLoading(true);
        try {
            const res = await fetch("/api/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    productId: product._id,
                    quantity,
                    brand,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setItems(data.cart?.items || []);
                return { ok: true };
            }
            return { ok: false, error: data.error || "Failed to add" };

        } catch (err) { return { ok: false, error: "Failed to add to cart" }; } finally { setLoading(false) }
    }, [user?.id, brand])

    const updateQuantity = useCallback(
        async (productId, quantity) => {
            if (!user?.id || !brand) return { ok: false };
            setLoading(true);
            try {
                const res = await fetch("/api/cart", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ productId, quantity, brand }),
                });
                const data = await res.json();
                if (res.ok) {
                    setItems(data.cart?.items || []);
                    return { ok: true };
                }
                return { ok: false };
            } catch {
                return { ok: false };
            } finally {
                setLoading(false);
            }
        },
        [user?.id, brand]
    );

    const removeFromCart = useCallback(
        async (productId) => {
            if (!user?.id || !brand) return { ok: false };
            return updateQuantity(productId, 0);
        },
        [user?.id, brand, updateQuantity]
    );

    const cartCount = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

    const value = { items, cartCount, loading, addToCart, updateQuantity, removeFromCart, fetchCart, isAuthenticated: !!user?.id }

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used with a CartContextProvider")
    }
    return context
}