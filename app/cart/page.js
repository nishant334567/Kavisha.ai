"use client";

import { useEffect, useState } from "react";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { useCart } from "../context/cart/CartContextProvider";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { Trash2, Minus, Plus, PanelLeft } from "lucide-react";
import UserProductsSidebar from "../products/components/UserProductsSidebar";

export default function CartPage() {
  const router = useRouter();
  const { user } = useFirebaseSession();
  const brandContext = useBrandContext();
  const brand = brandContext?.subdomain;
  const { items, updateQuantity, removeFromCart, loading } = useCart();
  const [products, setProducts] = useState([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!brand) return;
    fetch(`/api/products?brand=${encodeURIComponent(brand)}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => setProducts([]));
  }, [brand]);

  const productMap = Object.fromEntries(
    (products || []).map((p) => [p._id, p])
  );

  let content;
  if (!user) {
    content = (
      <div className="px-6 py-12 max-w-2xl mx-auto text-center">
        <p className="text-gray-600 mb-4">Sign in to view your cart.</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded-lg bg-[#2b6a5b] text-white hover:bg-[#235a4d] transition-colors"
        >
          Go to Home
        </button>
      </div>
    );
  } else if (items.length === 0) {
    content = (
      <div className="px-6 py-12 max-w-2xl mx-auto text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h1>
        <p className="text-gray-600 mb-4">Add products from the store.</p>
        <button
          onClick={() => router.push("/products")}
          className="px-4 py-2 rounded-lg bg-[#2b6a5b] text-white hover:bg-[#235a4d] transition-colors"
        >
          Browse products
        </button>
      </div>
    );
  }

  const total = items.reduce(
    (sum, i) => sum + (i.priceSnapshot || 0) * (i.quantity || 0),
    0
  );

  if (!content) {
    content = (
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Cart</h1>
        <div className="space-y-4">
          {items.map((item) => {
            const product = productMap[item.productId?.toString?.() || item.productId];
            const imageUrl = product?.images?.[0];
            const name = product?.name || "Product";

            return (
              <div
                key={item.productId?.toString?.() || item.productId}
                className="flex gap-4 p-4 rounded-xl border border-gray-200 bg-white"
              >
                <div className="w-20 h-20 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{name}</p>
                  <p className="text-sm text-gray-600">
                    Rs. {Math.round(item.priceSnapshot || 0)}/- × {item.quantity}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.productId, Math.max(1, (item.quantity || 1) - 1))
                      }
                      disabled={loading}
                      className="p-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.productId, (item.quantity || 1) + 1)
                      }
                      disabled={loading}
                      className="p-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      disabled={loading}
                      className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-gray-800">
                    Rs. {Math.round((item.priceSnapshot || 0) * (item.quantity || 0))}/-
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-800">Total</span>
            <span className="font-bold text-lg text-gray-800">
              Rs. {Math.round(total)}/-
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/checkout")}
            disabled={loading}
            className="mt-4 w-full py-3 rounded-lg bg-[#2b6a5b] text-white font-medium hover:bg-[#235a4d] disabled:opacity-60 transition-colors"
          >
            {loading ? "Updating..." : "Proceed to checkout"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-6xl flex min-h-screen relative">
        <div className="hidden md:block">
          <UserProductsSidebar />
        </div>
        {mobileSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-y-0 left-0 z-40 w-[280px] max-w-[85vw] md:hidden">
              <UserProductsSidebar onClose={() => setMobileSidebarOpen(false)} />
            </div>
          </>
        )}
        {!mobileSidebarOpen && (
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="fixed left-0 top-16 z-40 md:hidden p-2 rounded-r-lg bg-white border border-l-0 border-gray-200 shadow-sm hover:bg-gray-50"
            aria-label="Open panel"
          >
            <PanelLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <main className="flex-1 min-w-0 overflow-auto">{content}</main>
      </div>
    </div>
  );
}
