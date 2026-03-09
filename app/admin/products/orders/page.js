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
                <h1 className="text-xl font-bold text-gray-900 mb-6">Orders</h1>
                <p className="text-sm text-gray-500">Loading…</p>
            </div>
        );
    }

    return (
        <div className="px-8 py-8">
            <h1 className="text-xl font-bold text-[#2D545E] mb-6">Orders</h1>

            {orderGroups.length === 0 ? (
                <p className="text-sm text-gray-500">No orders yet.</p>
            ) : (
                <div className="space-y-6">
                    {orderGroups.map((group) => (
                        <div
                            key={group.orderId}
                            className="rounded-xl border border-gray-200 bg-white overflow-hidden h-[320px] flex flex-col md:flex-row"
                        >
                            {/* Left: Items with image, title, description - scrollable */}
                            <div className="flex-1 min-w-0 flex flex-col border-b md:border-b-0 md:border-r border-gray-200 overflow-hidden">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-4 pt-4 shrink-0">
                                    Items
                                </h3>
                                <ul className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-0">
                                    {group.items.map((item) => (
                                        <li
                                            key={item._id}
                                            className="flex gap-3 py-2 border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="w-12 h-12 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
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
                                                <p className="font-medium text-gray-900 text-sm">
                                                    {item.productSnapshot?.name || "Product"} ×{" "}
                                                    {item.quantity}
                                                </p>
                                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                                    {item.productSnapshot?.description ||
                                                        "No description"}
                                                </p>
                                                <p className="text-xs font-medium text-gray-700 mt-1">
                                                    Rs. {Math.round(item.totalAmount || 0)}/-
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0 font-semibold text-gray-900 flex justify-between">
                                    <span>Total</span>
                                    <span>Rs. {Math.round(group.total)}/-</span>
                                </div>
                            </div>

                            {/* Right: Customer, Order, Payment - static */}
                            <div className="w-full md:w-80 shrink-0 p-4 bg-gray-50 space-y-4">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                            Customer
                                        </h3>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                                {group.customer?.image ? (
                                                    <img
                                                        src={group.customer.image}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-medium">
                                                        {(group.customer?.name || "?")[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-medium text-gray-900 text-sm">
                                                {group.customer?.name || "—"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            {group.customer?.email || "—"}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            {group.shippingPhone || "—"}
                                        </p>
                                        <p className="text-xs text-gray-600 truncate" title={group.shippingAddress}>
                                            {group.shippingAddress || "—"}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                            Order
                                        </h3>
                                        <p className="text-xs text-gray-700">
                                            ID: {group.orderId.slice(-8)}
                                        </p>
                                        <p className="text-xs text-gray-700">
                                            {formatDate(group.date)}
                                        </p>
                                        <p className="text-xs">
                                            Status:{" "}
                                            <span className="capitalize font-medium">
                                                {group.items[0]?.orderStatus || "—"}
                                            </span>
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                            Payment
                                        </h3>
                                        <p className="text-xs text-gray-700">
                                            {group.items[0]?.paymentMethod || "UPI/Card"}
                                        </p>
                                        <p className="text-xs">
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
                                        <p className="text-xs text-gray-700">
                                            Delivery:{" "}
                                            {group.items[0]?.deliveryDate
                                                ? formatDate(group.items[0].deliveryDate)
                                                : "—"}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => handleViewPayments(group)}
                                            className="mt-2 flex items-center gap-1.5 text-xs text-[#2D545E] hover:text-[#1e3d45] font-medium"
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
                        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-bold text-gray-900 mb-4">Payment details</h3>
                        {paymentModal.loading ? (
                            <p className="text-gray-500">Loading…</p>
                        ) : paymentModal.error ? (
                            <p className="text-red-600">{paymentModal.error}</p>
                        ) : (
                            <div className="space-y-2 text-sm">
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
