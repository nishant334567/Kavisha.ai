"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useCart } from "@/app/context/cart/CartContextProvider";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import Link from "next/link";

const TEAL = "#2D545E";

export default function ProductDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const brandContext = useBrandContext();
    const brand =
        searchParams?.get("subdomain")?.trim() ||
        searchParams?.get("brand")?.trim() ||
        brandContext?.subdomain;

    const { addToCart, updateQuantity, items, isAuthenticated, loading } = useCart();
    const [product, setProduct] = useState(null);
    const [loadingProduct, setLoadingProduct] = useState(true);
    const [imageIndex, setImageIndex] = useState(0);

    const productId = params?.id;

    useEffect(() => {
        if (!productId || !brand) {
            setLoadingProduct(false);
            return;
        }
        fetch(
            `/api/products/${productId}?subdomain=${encodeURIComponent(brand)}`,
            { credentials: "include" }
        )
            .then((r) => r.json())
            .then((d) => {
                if (d.product) setProduct(d.product);
            })
            .catch(() => {})
            .finally(() => setLoadingProduct(false));
    }, [productId, brand]);

    const productIdStr = String(product?._id || "");
    const cartItem = items.find((i) => String(i.productId) === productIdStr);
    const quantityInCart = cartItem?.quantity ?? 0;

    const images = Array.isArray(product?.images) ? product.images : [];
    const currentImage = images[imageIndex] || images[0];
    const hasMultipleImages = images.length > 1;

    const originalPrice = Number(product?.price) || 0;
    const discount = Math.min(
        100,
        Math.max(0, Number(product?.discountPercentage) || 0)
    );
    const currentPrice = originalPrice * (1 - discount / 100);

    const description =
        product?.description ||
        product?.tagline ||
        "This is a small description of the product or anything the admin wants to write to give the first impression.";

    const handleIncrease = () => {
        if (!isAuthenticated || !product) return;
        if (quantityInCart === 0) {
            addToCart(product, 1);
        } else {
            updateQuantity(product._id, quantityInCart + 1);
        }
    };

    const handleDecrease = () => {
        if (!isAuthenticated || !product || quantityInCart <= 0) return;
        updateQuantity(product._id, quantityInCart - 1);
    };

    const prevImage = () =>
        setImageIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
    const nextImage = () =>
        setImageIndex((i) => (i >= images.length - 1 ? 0 : i + 1));

    const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
    const productsHref = `/products${qs}`;

    if (loadingProduct) {
        return (
            <div className="mx-auto max-w-5xl bg-background px-6 py-8 text-foreground">
                <p className="text-muted">Loading...</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="mx-auto max-w-5xl bg-background px-6 py-8 text-foreground">
                <p className="text-muted">Product not found.</p>
                <Link
                    href={productsHref}
                    className="mt-4 inline-block text-sm font-medium"
                    style={{ color: TEAL }}
                >
                    ← Back to products
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl bg-background px-6 py-8 text-foreground">
            {/* Top section: two-column layout */}
            <div className="flex flex-col md:flex-row gap-8 mb-12">
                {/* Left: Product image with carousel */}
                <div className="flex-1 min-w-0">
                    <div className="relative aspect-square max-h-[400px] overflow-hidden rounded-2xl border border-border bg-muted-bg">
                        {currentImage ? (
                            <img
                                src={currentImage}
                                alt={product.name || ""}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted">
                                No image
                            </div>
                        )}
                        {hasMultipleImages && (
                            <>
                                <button
                                    type="button"
                                    onClick={prevImage}
                                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-muted shadow-md transition-colors hover:bg-card hover:text-foreground"
                                    aria-label="Previous image"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={nextImage}
                                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-muted shadow-md transition-colors hover:bg-card hover:text-foreground"
                                    aria-label="Next image"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                    {hasMultipleImages && (
                        <div className="flex justify-center gap-2 mt-3">
                            {images.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setImageIndex(i)}
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                        i === imageIndex
                                            ? "bg-foreground"
                                            : "bg-border hover:bg-muted"
                                    }`}
                                    aria-label={`View image ${i + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Product info */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <h1
                        className="font-bold text-2xl mb-3"
                        style={{ color: TEAL }}
                    >
                        {product.name || "Untitled"}
                    </h1>
                    <p className="mb-4 text-sm leading-relaxed text-muted">
                        {description}
                    </p>
                    <div className="mb-6">
                        <span
                            className="font-bold text-xl"
                            style={{ color: TEAL }}
                        >
                            Rs. {Math.round(currentPrice)}/-
                        </span>
                        {discount > 0 && (
                            <span className="ml-2 text-sm text-muted line-through">
                                Rs. {Math.round(originalPrice)}/-
                            </span>
                        )}
                    </div>

                    {/* Quantity controls */}
                    {!isAuthenticated ? (
                        <div className="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border-2 border-border px-6 py-3 text-sm text-muted">
                            Sign in to add to cart
                        </div>
                    ) : quantityInCart > 0 ? (
                        <div
                            className="w-full max-w-xs flex items-center justify-center gap-4 px-6 py-3 rounded-xl border-2"
                            style={{ borderColor: TEAL }}
                        >
                            <button
                                type="button"
                                onClick={handleDecrease}
                                disabled={loading}
                                className="rounded-lg p-2 transition-colors hover:bg-muted-bg disabled:opacity-50"
                                style={{ color: TEAL }}
                                aria-label="Decrease quantity"
                            >
                                <Minus className="w-5 h-5" />
                            </button>
                            <span
                                className="min-w-[32px] text-center font-semibold text-lg"
                                style={{ color: TEAL }}
                            >
                                {quantityInCart}
                            </span>
                            <button
                                type="button"
                                onClick={handleIncrease}
                                disabled={loading}
                                className="rounded-lg p-2 transition-colors hover:bg-muted-bg disabled:opacity-50"
                                style={{ color: TEAL }}
                                aria-label="Increase quantity"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleIncrease}
                            disabled={loading}
                            className="w-full max-w-xs py-3.5 px-6 rounded-xl font-semibold text-white disabled:opacity-60 hover:opacity-95 transition-opacity"
                            style={{ backgroundColor: TEAL }}
                        >
                            Add to cart
                        </button>
                    )}
                </div>
            </div>

            {/* Below: All other related info */}
            <div className="space-y-6 border-t border-border pt-8">
                {product.tagline && product.tagline !== description && (
                    <section>
                        <h2
                            className="font-semibold text-lg mb-2"
                            style={{ color: TEAL }}
                        >
                            Tagline
                        </h2>
                        <p className="text-sm text-muted">{product.tagline}</p>
                    </section>
                )}
                {product.specifications && (
                    <section>
                        <h2
                            className="font-semibold text-lg mb-2"
                            style={{ color: TEAL }}
                        >
                            Specifications
                        </h2>
                        <div className="whitespace-pre-wrap text-sm text-muted">
                            {product.specifications}
                        </div>
                    </section>
                )}
                {product.url && (
                    <section>
                        <h2
                            className="font-semibold text-lg mb-2"
                            style={{ color: TEAL }}
                        >
                            More info
                        </h2>
                        <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline"
                            style={{ color: TEAL }}
                        >
                            {product.url}
                        </a>
                    </section>
                )}
                {product.termsAndConditions && (
                    <section>
                        <h2
                            className="font-semibold text-lg mb-2"
                            style={{ color: TEAL }}
                        >
                            Terms and conditions
                        </h2>
                        <div className="whitespace-pre-wrap text-sm text-muted">
                            {product.termsAndConditions}
                        </div>
                    </section>
                )}
            </div>

            <Link
                href={productsHref}
                className="mt-8 inline-block text-sm font-medium hover:underline"
                style={{ color: TEAL }}
            >
                ← Back to products
            </Link>
        </div>
    );
}
