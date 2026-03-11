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
            <div className="px-6 py-8">
                <p className="text-gray-500">Loading products...</p>
            </div>
        );
    }

    return (
        <div className="px-6 py-8 max-w-4xl mx-auto">
            <div className="space-y-4">
                {products.length === 0 ? (
                    <p className="text-gray-500">No products yet.</p>
                ) : (
                    products.map((product) => (
                        <ProductCardUser key={product._id} product={product} />
                    ))
                )}
            </div>
        </div>
    );
}
