"use client";

import Link from "next/link";

const TEAL = "#2D545E";

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
    <div className="flex gap-6 p-6 rounded-xl border border-gray-200 bg-white shadow-md">
      <div className="flex-1 min-w-0 flex gap-6 overflow-hidden">
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-lg"
            style={{ color: TEAL }}
          >
            {product.name || "Untitled"}
          </h3>
          <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">
            {description}
          </p>
          <p
            className="font-semibold mt-2"
            style={{ color: TEAL }}
          >
            Rs. {priceAfterDiscount.toFixed(0)}/-
            {discount > 0 && (
              <span className="text-gray-500 text-sm font-normal ml-1 line-through">
                Rs. {price}/-
              </span>
            )}
          </p>
        </div>

        <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
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

        <div className="shrink-0 flex flex-col gap-3 items-stretch min-w-[140px]">
          <div className="grid grid-cols-2 rounded-lg overflow-hidden border border-gray-200">
            <span className="px-3 py-2 bg-white text-gray-900 text-sm font-medium text-center">
              Orders
            </span>
            <span
              className="px-3 py-2 text-sm font-medium text-white text-center"
              style={{ backgroundColor: TEAL }}
            >
              {orders}
            </span>
          </div>
          <div className="grid grid-cols-2 rounded-lg overflow-hidden border border-gray-200">
            <span className="px-3 py-2 bg-white text-gray-900 text-sm font-medium text-center">
              Revenue
            </span>
            <span
              className="px-3 py-2 text-sm font-medium text-white text-center whitespace-nowrap"
              style={{ backgroundColor: TEAL }}
            >
              Rs. {Number(revenue || 0).toLocaleString()}/-
            </span>
          </div>
          <Link
            href={editHref}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 text-center"
            style={{ backgroundColor: TEAL }}
          >
            Edit product
          </Link>
          <button
            type="button"
            onClick={() => onDelete?.(product)}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete product"}
          </button>
        </div>
      </div>
    </div>
  );
}
