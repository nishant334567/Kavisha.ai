"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { Package } from "lucide-react";

function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function MyOrdersPage() {
    const router = useRouter();
    const { user } = useFirebaseSession();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        fetch("/api/orders", { credentials: "include" })
            .then((r) => r.json())
            .then((d) => setOrders(d.orders || []))
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    }, [user]);

    if (!user) {
        return (
            <div className="px-6 py-12 max-w-2xl mx-auto text-center">
                <p className="text-gray-600 mb-4">Sign in to view your orders.</p>
                <button
                    onClick={() => router.push("/")}
                    className="px-4 py-2 rounded-lg bg-[#2b6a5b] text-white hover:bg-[#235a4d] transition-colors"
                >
                    Go to Home
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="px-6 py-12 max-w-2xl mx-auto text-center">
                <p className="text-gray-500">Loading orders...</p>
            </div>
        );
    }

    const ordersByGroup = orders.reduce((acc, o) => {
        const id = o.orderId || o._id?.toString?.();
        if (!acc[id]) acc[id] = [];
        acc[id].push(o);
        return acc;
    }, {});

    const orderGroups = Object.entries(ordersByGroup).map(([orderId, items]) => ({
        orderId,
        items,
        date: items[0]?.createdAt,
        total: items.reduce((s, i) => s + (i.totalAmount || 0), 0),
    }));

    return (
        <div className="px-6 py-8 max-w-2xl mx-auto">
            <h1 className="text-xl font-bold text-gray-800 mb-6">My Orders</h1>

            {orderGroups.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-gray-200 bg-gray-50">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">No orders yet</p>
                    <p className="text-sm text-gray-500 mb-4">Your orders will appear here.</p>
                    <button
                        onClick={() => router.push("/products")}
                        className="px-4 py-2 rounded-lg bg-[#2b6a5b] text-white hover:bg-[#235a4d] transition-colors"
                    >
                        Browse products
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {orderGroups.map((group) => (
                        <div
                            key={group.orderId}
                            className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                        >
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">
                                    Order #{group.orderId.slice(-8)}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {formatDate(group.date)}
                                </span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {group.items.map((item) => (
                                    <div
                                        key={item._id}
                                        className="flex gap-4 p-4"
                                    >
                                        <div className="w-14 h-14 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                                            {item.productSnapshot?.images?.[0] ? (
                                                <img
                                                    src={item.productSnapshot.images[0]}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                                    —
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 truncate">
                                                {item.productSnapshot?.name || "Product"}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Qty: {item.quantity} × Rs.{" "}
                                                {Math.round(
                                                    (item.totalAmount || 0) / (item.quantity || 1)
                                                )}
                                                /-
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="font-semibold text-gray-800">
                                                Rs. {Math.round(item.totalAmount || 0)}/-
                                            </p>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded ${
                                                    item.paymentStatus === "completed"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-100 text-gray-600"
                                                }`}
                                            >
                                                {item.paymentStatus === "completed"
                                                    ? "Paid"
                                                    : item.paymentStatus || "—"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                                <span className="font-medium text-gray-700">Total</span>
                                <span className="font-bold text-gray-900">
                                    Rs. {Math.round(group.total)}/-
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
