"use client";

import { useEffect, useState } from "react";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import ProductCardUser from "../components/ProductCardUser";

export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const brandContext = useBrandContext();
    const brand = brandContext?.subdomain;
    useEffect(() => {
        if (!brand) {
            setLoading(false);
            return;
        }
        const fetchProducts = async () => {
            try {
                const response = await fetch(`/api/products?subdomain=${brand}`);
                const data = await response.json();
                if (response.ok) {
                    setProducts(data.products || []);
                } else {
                    console.error("Failed to fetch products:", data.error);
                }
            } catch (err) {
                console.error("Failed to fetch products:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [brand]);

    if (loading) {
        return (
            <div className="px-4 py-8 sm:px-6 lg:px-8">
                <p className="text-muted">Loading products...</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {products.length === 0 ? (
                <p className="text-muted">No products yet.</p>
            ) : (
                <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                    {products.map((product) => (
                        <li key={product._id} className="min-w-0">
                            <ProductCardUser product={product} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
