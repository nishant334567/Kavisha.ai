"use client";

import { Minus, Plus } from "lucide-react";
import { useCart } from "../context/cart/CartContextProvider";

const TEAL = "#2b6a5b";
const GREEN = "#28a745";

export default function ProductCardUser({ product }) {
    const { items, addToCart, updateQuantity, isAuthenticated, loading } = useCart();

    if (!product) return null;

    const productId = String(product._id);
    const cartItem = items.find((i) => String(i.productId) === productId);
    const quantityInCart = cartItem?.quantity ?? 0;

    const imageUrl = Array.isArray(product.images) && product.images[0] ? product.images[0] : null;
    const originalPrice = Number(product.price) || 0;
    const discount = Math.min(100, Math.max(0, Number(product.discountPercentage) || 0));
    const currentPrice = originalPrice * (1 - discount / 100);
    const description =
        product.description ||
        product.tagline ||
        "This is a small description of the product or anything the admin wants to write to give the first impression.";

    const handleIncrease = () => {
        if (!isAuthenticated) return;
        if (quantityInCart === 0) {
            addToCart(product, 1);
        } else {
            updateQuantity(product._id, quantityInCart + 1);
        }
    };

    const handleDecrease = () => {
        if (!isAuthenticated || quantityInCart <= 0) return;
        updateQuantity(product._id, quantityInCart - 1);
    };

    return (
        <div className="flex gap-6 p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Left: Product details */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-lg" style={{ color: TEAL }}>
                        {product.name || "Untitled"}
                    </h3>
                    <p className="text-sm text-gray-500 mt-2">{description}</p>
                    <p className="text-sm mt-2 font-medium" style={{ color: GREEN }}>
                        In stock
                    </p>
                    <div className="mt-3">
                        <span className="font-bold text-gray-800">
                            Rs. {Math.round(currentPrice)}/-
                        </span>
                        {discount > 0 && (
                            <span className="ml-2 text-sm text-gray-400 line-through">
                                Rs. {Math.round(originalPrice)}/-
                            </span>
                        )}
                        {discount > 0 && (
                            <span className="ml-2 text-sm font-medium" style={{ color: GREEN }}>
                                {Math.round(discount)}% off
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Image + Quantity controls */}
            <div className="shrink-0 flex flex-col items-center gap-4 w-[40%] max-w-[200px]">
                <div className="w-full aspect-square rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={product.name || ""}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No image
                        </div>
                    )}
                </div>
                {!isAuthenticated ? (
                    <button
                        type="button"
                        disabled
                        className="w-full py-2.5 px-4 rounded-lg font-medium text-sm border-2 opacity-60 cursor-not-allowed"
                        style={{ borderColor: TEAL, color: TEAL }}
                    >
                        Sign in to add to cart
                    </button>
                ) : quantityInCart > 0 ? (
                    <div className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2" style={{ borderColor: TEAL }}>
                        <button
                            type="button"
                            onClick={handleDecrease}
                            disabled={loading}
                            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
                            style={{ color: TEAL }}
                            aria-label="Decrease quantity"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className="min-w-[24px] text-center font-semibold" style={{ color: TEAL }}>
                            {quantityInCart}
                        </span>
                        <button
                            type="button"
                            onClick={handleIncrease}
                            disabled={loading}
                            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
                            style={{ color: TEAL }}
                            aria-label="Increase quantity"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleIncrease}
                        disabled={loading}
                        className="w-full py-2.5 px-4 rounded-lg font-medium text-sm border-2 transition-colors hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ borderColor: TEAL, color: TEAL }}
                    >
                        Add to cart
                    </button>
                )}
            </div>
        </div>
    );
}
