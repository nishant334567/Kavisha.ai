"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import ProductCard from "./components/ProductCard";

export default function ProductsListPage() {
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!brand) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/products?brand=${encodeURIComponent(brand)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        setProducts(res.ok ? (data.products ?? []) : []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [brand]);

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    setDeletingId(product._id);
    try {
      const res = await fetch(`/api/admin/products/${product._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p._id !== product._id));
        setSelectedId((id) => (id === product._id ? null : id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch {
      alert("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="px-8 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">My Products</h1>
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="px-8 py-8">
      <h1 className="text-xl font-bold text-[#2D545E] mb-6">List of products</h1>

      {products.length === 0 ? (
        <p className="text-sm text-gray-500">No products yet.</p>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              selected={selectedId === product._id}
              onSelect={setSelectedId}
              onDelete={handleDelete}
              brand={brand}
              deleting={deletingId === product._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
