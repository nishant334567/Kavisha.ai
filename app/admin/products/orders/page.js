"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { CreditCard } from "lucide-react";

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

export default function AdminOrdersPage() {
    const searchParams = useSearchParams();
    const brandContext = useBrandContext();
    const brand =
        searchParams?.get("subdomain")?.trim() ||
        searchParams?.get("brand")?.trim() ||
        brandContext?.subdomain;

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paymentModal, setPaymentModal] = useState(null);

    useEffect(() => {
        if (!brand) {
            setLoading(false);
            return;
        }
        fetch(`/api/admin/orders?brand=${encodeURIComponent(brand)}`, {
            credentials: "include",
        })
            .then((r) => r.json())
            .then((d) => setOrders(d.orders || []))
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    }, [brand]);

    const fetchPaymentDetails = async (razorpayOrderId) => {
        if (!razorpayOrderId) return null;
        const res = await fetch(
            `/api/admin/payments?razorpayOrderId=${encodeURIComponent(razorpayOrderId)}`,
            { credentials: "include" }
        );
        const data = await res.json();
        return res.ok ? data.payment : null;
    };

    const handleViewPayments = async (orderGroup) => {
        const first = orderGroup.items[0];
        if (!first?.razorpayOrderId) {
            setPaymentModal({ error: "No payment record" });
            return;
        }
        setPaymentModal({ loading: true });
        const payment = await fetchPaymentDetails(first.razorpayOrderId);
        setPaymentModal(payment ? { payment } : { error: "Payment not found" });
    };

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
        customer: items[0]?.customerId,
        shippingPhone: items[0]?.shippingPhone,
        shippingAddress: items[0]?.shippingAddress,
    }));

    if (loading) {
        return (
            <div className="px-8 py-8">
                <h1 className="mb-6 text-xl font-bold text-foreground">Orders</h1>
                <p className="text-sm text-muted">Loading…</p>
            </div>
        );
    }

    return (
        <div className="px-8 py-8">
            <h1 className="mb-6 text-xl font-bold text-highlight">Orders</h1>

            {orderGroups.length === 0 ? (
                <p className="text-sm text-muted">No orders yet.</p>
            ) : (
                <div className="space-y-6">
                    {orderGroups.map((group) => (
                        <div
                            key={group.orderId}
                            className="flex h-[320px] flex-col overflow-hidden rounded-xl border border-border bg-card md:flex-row"
                        >
                            {/* Left: Items with image, title, description - scrollable */}
                            <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-b border-border md:border-b-0 md:border-r">
                                <h3 className="shrink-0 px-4 pt-4 text-sm font-semibold uppercase tracking-wide text-muted">
                                    Items
                                </h3>
                                <ul className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-0">
                                    {group.items.map((item) => (
                                        <li
                                            key={item._id}
                                            className="flex gap-3 border-b border-border py-2 last:border-b-0"
                                        >
                                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted-bg">
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
                                                <p className="text-sm font-medium text-foreground">
                                                    {item.productSnapshot?.name || "Product"} ×{" "}
                                                    {item.quantity}
                                                </p>
                                                <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                                                    {item.productSnapshot?.description ||
                                                        "No description"}
                                                </p>
                                                <p className="mt-1 text-xs font-medium text-foreground">
                                                    Rs. {Math.round(item.totalAmount || 0)}/-
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex shrink-0 justify-between border-t border-border bg-card px-4 py-3 font-semibold text-foreground">
                                    <span>Total</span>
                                    <span>Rs. {Math.round(group.total)}/-</span>
                                </div>
                            </div>

                            {/* Right: Customer, Order, Payment - static */}
                            <div className="w-full shrink-0 space-y-4 bg-muted-bg p-4 md:w-80">
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
                                            Customer
                                        </h3>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-border">
                                                {group.customer?.image ? (
                                                    <img
                                                        src={group.customer.image}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted">
                                                        {(group.customer?.name || "?")[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-foreground">
                                                {group.customer?.name || "—"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted">
                                            {group.customer?.email || "—"}
                                        </p>
                                        <p className="text-xs text-muted">
                                            <span className="font-medium">Phone:</span>{" "}
                                            {group.shippingPhone || "—"}
                                        </p>
                                        <p className="break-words text-xs text-muted" title={group.shippingAddress}>
                                            <span className="font-medium">Address:</span>{" "}
                                            {group.shippingAddress || "—"}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
                                            Order
                                        </h3>
                                        <p className="text-xs text-foreground">
                                            ID: {group.orderId.slice(-8)}
                                        </p>
                                        <p className="text-xs text-foreground">
                                            {formatDate(group.date)}
                                        </p>
                                        <p className="text-xs text-foreground">
                                            Status:{" "}
                                            <span className="capitalize font-medium">
                                                {group.items[0]?.orderStatus || "—"}
                                            </span>
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
                                            Payment
                                        </h3>
                                        <p className="text-xs text-foreground">
                                            {group.items[0]?.paymentMethod || "UPI/Card"}
                                        </p>
                                        <p className="text-xs text-foreground">
                                            Status:{" "}
                                            <span
                                                className={
                                                    group.items[0]?.paymentStatus === "completed"
                                                        ? "text-green-600 font-medium"
                                                        : "font-medium"
                                                }
                                            >
                                                {group.items[0]?.paymentStatus || "—"}
                                            </span>
                                        </p>
                                        <p className="text-xs text-foreground">
                                            Delivery:{" "}
                                            {group.items[0]?.deliveryDate
                                                ? formatDate(group.items[0].deliveryDate)
                                                : "—"}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => handleViewPayments(group)}
                                            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-highlight hover:opacity-80"
                                        >
                                            <CreditCard className="w-3.5 h-3.5" />
                                            View payment details
                                        </button>
                                    </div>
                                </div>
                        </div>
                    ))}
                </div>
            )}

            {paymentModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    onClick={() => setPaymentModal(null)}
                >
                    <div
                        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="mb-4 font-bold text-foreground">Payment details</h3>
                        {paymentModal.loading ? (
                            <p className="text-muted">Loading…</p>
                        ) : paymentModal.error ? (
                            <p className="text-red-600">{paymentModal.error}</p>
                        ) : (
                            <div className="space-y-2 text-sm text-foreground">
                                <p>
                                    <strong>Razorpay Order ID:</strong>{" "}
                                    {paymentModal.payment?.razorpayOrderId || "—"}
                                </p>
                                <p>
                                    <strong>Razorpay Payment ID:</strong>{" "}
                                    {paymentModal.payment?.razorpayPaymentId || "—"}
                                </p>
                                <p>
                                    <strong>Amount:</strong> Rs.{" "}
                                    {paymentModal.payment?.amount
                                        ? (paymentModal.payment.amount / 100).toFixed(2)
                                        : "—"}
                                </p>
                                <p>
                                    <strong>Currency:</strong>{" "}
                                    {paymentModal.payment?.currency || "INR"}
                                </p>
                                <p>
                                    <strong>Type:</strong> {paymentModal.payment?.type || "—"}
                                </p>
                                <p>
                                    <strong>Brand:</strong> {paymentModal.payment?.brand || "—"}
                                </p>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setPaymentModal(null)}
                            className="mt-4 w-full py-2 rounded-lg bg-[#2D545E] text-white font-medium hover:bg-[#235a4d]"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
