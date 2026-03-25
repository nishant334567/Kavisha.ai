"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { Package, PanelLeft } from "lucide-react";
import UserProductsSidebar from "../products/components/UserProductsSidebar";

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
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

    let content;
    if (!user) {
        content = (
            <div className="px-6 py-12 max-w-2xl mx-auto text-center">
                <p className="mb-4 text-muted">Sign in to view your orders.</p>
                <button
                    onClick={() => router.push("/")}
                    className="px-4 py-2 rounded-lg bg-[#2b6a5b] text-white hover:bg-[#235a4d] transition-colors"
                >
                    Go to Home
                </button>
            </div>
        );
    } else if (loading) {
        content = (
            <div className="px-6 py-12 max-w-2xl mx-auto text-center">
                <p className="text-muted">Loading orders...</p>
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
        shippingPhone: items[0]?.shippingPhone || "",
        shippingAddress: items[0]?.shippingAddress || "",
    }));

    if (!content) {
        content = (
            <div className="px-6 py-8 max-w-2xl mx-auto">
                <h1 className="mb-6 text-xl font-bold text-foreground">My Orders</h1>

                {orderGroups.length === 0 ? (
                    <div className="rounded-xl border border-border bg-muted-bg py-12 text-center">
                        <Package className="mx-auto mb-3 h-12 w-12 text-muted" />
                        <p className="mb-2 text-muted">No orders yet</p>
                        <p className="mb-4 text-sm text-muted">Your orders will appear here.</p>
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
                                className="overflow-hidden rounded-xl border border-border bg-card"
                            >
                                <div className="flex items-center justify-between border-b border-border bg-muted-bg px-4 py-3">
                                    <span className="text-sm font-medium text-muted">
                                        Order #{group.orderId.slice(-8)}
                                    </span>
                                    <span className="text-sm text-muted">
                                        {formatDate(group.date)}
                                    </span>
                                </div>
                                <div className="divide-y divide-border">
                                    {group.items.map((item) => (
                                        <div
                                            key={item._id}
                                            className="flex gap-4 p-4"
                                        >
                                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted-bg">
                                                {item.productSnapshot?.images?.[0] ? (
                                                    <img
                                                        src={item.productSnapshot.images[0]}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                                                        —
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate font-medium text-foreground">
                                                    {item.productSnapshot?.name || "Product"}
                                                </p>
                                                <p className="text-sm text-muted">
                                                    Qty: {item.quantity} × Rs.{" "}
                                                    {Math.round(
                                                        (item.totalAmount || 0) / (item.quantity || 1)
                                                    )}
                                                    /-
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="font-semibold text-foreground">
                                                    Rs. {Math.round(item.totalAmount || 0)}/-
                                                </p>
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded ${
                                                        item.paymentStatus === "completed"
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-muted-bg text-muted"
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
                                <div className="flex items-center justify-between border-t border-border bg-muted-bg px-4 py-3">
                                    <span className="font-medium text-foreground">Total</span>
                                    <span className="font-bold text-foreground">
                                        Rs. {Math.round(group.total)}/-
                                    </span>
                                </div>
                                <div className="border-t border-border bg-card px-4 py-3">
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                                        Delivery details
                                    </p>
                                    <p className="text-sm text-foreground">
                                        <span className="font-medium">Phone:</span>{" "}
                                        {group.shippingPhone || "—"}
                                    </p>
                                    <p className="break-words text-sm text-foreground">
                                        <span className="font-medium">Address:</span>{" "}
                                        {group.shippingAddress || "—"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex min-h-screen justify-center bg-background text-foreground">
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
                        className="fixed left-0 top-16 z-40 rounded-r-lg border border-border border-l-0 bg-card p-2 shadow-sm hover:bg-muted-bg md:hidden"
                        aria-label="Open panel"
                    >
                        <PanelLeft className="h-5 w-5 text-muted" />
                    </button>
                )}
                <main className="flex-1 min-w-0 overflow-auto">{content}</main>
            </div>
        </div>
    );
}
