"use client";

import Link from "next/link";

export default function ProductCard({
  product,
  onDelete,
  brand,
  deleting,
  orders = 0,
  revenue = 0,
}) {
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
  const editHref = `/admin/products/${product._id}/edit${qs}`;
  const imageUrl =
    Array.isArray(product.images) && product.images[0] ? product.images[0] : null;
  const price = Number(product.price) || 0;
  const discount = Math.min(
    100,
    Math.max(0, Number(product.discountPercentage) || 0)
  );
  const priceAfterDiscount = price * (1 - discount / 100);
  const description =
    product.description ||
    product.tagline ||
    "This is a small description of the product or anything the admin wants to write to give the first impression.";

  return (
    <div className="flex min-h-[228px] gap-6 rounded-xl border border-border bg-card p-6 shadow-md">
      <div className="flex min-w-0 flex-1 items-stretch gap-6 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="min-h-[3.5rem] line-clamp-2 text-lg font-bold text-highlight">
            {product.name || "Untitled"}
          </h3>
          <p className="mt-1.5 min-h-[2.75rem] line-clamp-2 text-sm text-muted">
            {description}
          </p>
          <p className="mt-2 font-semibold text-highlight">
            Rs. {priceAfterDiscount.toFixed(0)}/-
            {discount > 0 && (
              <span className="ml-1 text-sm font-normal text-muted line-through">
                Rs. {price}/-
              </span>
            )}
          </p>
        </div>

        <div className="h-24 w-24 flex-shrink-0 shrink-0 overflow-hidden rounded-lg border border-border bg-muted-bg">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted">
              No image
            </div>
          )}
        </div>

        <div className="flex min-w-[140px] shrink-0 flex-col items-stretch gap-3">
          <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border">
            <span className="bg-card px-3 py-2 text-center text-sm font-medium text-foreground">
              Orders
            </span>
            <span className="bg-highlight px-3 py-2 text-center text-sm font-medium text-white">
              {orders}
            </span>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border">
            <span className="bg-card px-3 py-2 text-center text-sm font-medium text-foreground">
              Revenue
            </span>
            <span className="bg-highlight px-3 py-2 text-center text-sm font-medium whitespace-nowrap text-white">
              Rs. {Number(revenue || 0).toLocaleString()}/-
            </span>
          </div>
          <Link
            href={editHref}
            className="inline-flex items-center justify-center rounded-lg bg-highlight px-4 py-2 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Edit product
          </Link>
          <button
            type="button"
            onClick={() => onDelete?.(product)}
            disabled={deleting}
            className="inline-flex items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-muted-bg disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete product"}
          </button>
        </div>
      </div>
    </div>
  );
}
