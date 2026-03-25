"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useCart } from "../context/cart/CartContextProvider";
import { useBrandContext } from "../context/brand/BrandContextProvider";

const TEAL = "#2b6a5b";
const GREEN = "#28a745";

export default function ProductCardUser({ product }) {
    const brandContext = useBrandContext();
    const brand = brandContext?.subdomain;
    const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
    const detailHref = `/products/${product?._id}${qs}`;
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
        <div className="flex h-full min-h-[260px] items-stretch gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:gap-4 sm:p-4">
            {/* Left: Image + Quantity controls */}
            <div className="w-[40%] shrink-0 max-w-[180px] self-stretch flex flex-col sm:w-[42%]">
                <Link href={detailHref} className="w-full block">
                    <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-muted-bg transition-opacity hover:opacity-90">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={product.name || ""}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                                No image
                            </div>
                        )}
                    </div>
                </Link>
                <div className="mt-auto w-full pt-2">
                    {!isAuthenticated ? (
                        <button
                            type="button"
                            disabled
                            className="w-full rounded-lg border-2 px-2 py-1.5 text-[11px] font-medium leading-4 opacity-60 cursor-not-allowed sm:text-xs"
                            style={{ borderColor: TEAL, color: TEAL }}
                        >
                            Sign in to add
                        </button>
                    ) : quantityInCart > 0 ? (
                        <div
                            className="flex w-full items-center justify-center gap-1 rounded-lg border-2 px-1.5 py-1"
                            style={{ borderColor: TEAL }}
                        >
                            <button
                                type="button"
                                onClick={handleDecrease}
                                disabled={loading}
                                className="rounded p-1 transition-colors hover:bg-muted-bg disabled:opacity-50"
                                style={{ color: TEAL }}
                                aria-label="Decrease quantity"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="min-w-[22px] text-center text-sm font-semibold" style={{ color: TEAL }}>
                                {quantityInCart}
                            </span>
                            <button
                                type="button"
                                onClick={handleIncrease}
                                disabled={loading}
                                className="rounded p-1 transition-colors hover:bg-muted-bg disabled:opacity-50"
                                style={{ color: TEAL }}
                                aria-label="Increase quantity"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleIncrease}
                            disabled={loading}
                            className="w-full rounded-lg border-2 px-2 py-1.5 text-[11px] font-medium leading-4 transition-colors hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
                            style={{ borderColor: TEAL, color: TEAL }}
                        >
                            Add to cart
                        </button>
                    )}
                </div>
            </div>

            {/* Right: Product details */}
            <div className="min-w-0 flex-1 self-stretch">
                <div className="flex h-full flex-col justify-between">
                    <div>
                    <Link href={detailHref}>
                        <h3
                            className="min-h-[5rem] line-clamp-4 text-sm font-bold leading-tight hover:underline sm:text-base"
                            style={{ color: TEAL }}
                        >
                            {product.name || "Untitled"}
                        </h3>
                    </Link>
                    <p className="mt-1.5 min-h-[5rem] line-clamp-4 text-xs text-muted sm:text-sm">{description}</p>
                    <p className="text-xs sm:text-sm mt-1.5 font-medium" style={{ color: GREEN }}>
                        In stock
                    </p>
                    </div>
                    <div className="mt-2 pt-2">
                        <span className="text-sm font-bold text-foreground sm:text-base">
                            Rs. {Math.round(currentPrice)}/-
                        </span>
                        {discount > 0 ? (
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
                                <span className="text-xs text-muted line-through sm:text-sm">
                                    Rs. {Math.round(originalPrice)}/-
                                </span>
                                <span className="text-xs sm:text-sm font-medium" style={{ color: GREEN }}>
                                    {Math.round(discount)}% off
                                </span>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
