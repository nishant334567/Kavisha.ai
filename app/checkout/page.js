"use client";

import { useEffect, useState } from "react";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { useCart } from "../context/cart/CartContextProvider";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import ConfirmModal from "../components/ConfirmModal";
import { ArrowLeft } from "lucide-react";

function ensureRazorpayLoaded() {
    if (typeof window === "undefined" || window.Razorpay) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = resolve;
        s.onerror = () => reject(new Error("Could not load payment"));
        document.body.appendChild(s);
    });
}

export default function CheckoutPage() {
    const router = useRouter();
    const { user } = useFirebaseSession();
    const brandContext = useBrandContext();
    const brand = brandContext?.subdomain;
    const { items, fetchCart } = useCart();
    const [products, setProducts] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [paying, setPaying] = useState(false);
    const [shippingPhone, setShippingPhone] = useState("");
    const [shippingAddress, setShippingAddress] = useState("");
    const [checkoutError, setCheckoutError] = useState("");

    useEffect(() => {
        if (!brand) return;
        fetch(`/api/products?brand=${encodeURIComponent(brand)}`)
            .then((r) => r.json())
            .then((d) => setProducts(d.products || []))
            .catch(() => setProducts([]));
    }, [brand]);

    const productMap = Object.fromEntries((products || []).map((p) => [p._id, p]));

    const total = items.reduce(
        (sum, i) => sum + (i.priceSnapshot || 0) * (i.quantity || 0),
        0
    );
    const isDeliveryReady =
        /^\d{10}$/.test(shippingPhone.trim()) && shippingAddress.trim().length >= 5;

    const validateDeliveryDetails = () => {
        const phone = shippingPhone.trim();
        const address = shippingAddress.trim();
        if (!/^\d{10}$/.test(phone)) {
            return {
                valid: false,
                message: "Please enter a valid 10-digit phone number.",
            };
        }
        if (address.length < 5) {
            return {
                valid: false,
                message: "Please enter your delivery address.",
            };
        }
        return { valid: true, phone, address };
    };

    const initiatePayment = async () => {
        if (!user?.id || !brand || items.length === 0) return;
        const validation = validateDeliveryDetails();
        if (!validation.valid) {
            setCheckoutError(validation.message);
            return;
        }

        setCheckoutError("");
        setPaying(true);
        try {
            const res = await fetch("/api/checkout/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ brand }),
            });
            const data = await res.json();
            if (!data?.orderId) throw new Error(data?.error || "Failed to create order");

            await ensureRazorpayLoaded();
            const cartItemsForVerify = items.map((i) => ({
                productId: i.productId?.toString?.() || i.productId,
                quantity: i.quantity,
                priceSnapshot: i.priceSnapshot,
            }));

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: data.amount,
                currency: data.currency || "INR",
                order_id: data.orderId,
                name: "Kavisha",
                description: "Product Order",
                prefill: { email: user?.email || "", contact: validation.phone },
                modal: { ondismiss: () => setPaying(false) },
                handler: async function (response) {
                    const verifyRes = await fetch("/api/razorpay/verify-payment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            userId: user.id,
                            type: "product_order",
                            metadata: {
                                brand,
                                cartItems: cartItemsForVerify,
                                shippingPhone: validation.phone,
                                shippingAddress: validation.address,
                            },
                            amount: data.amount,
                            currency: data.currency || "INR",
                        }),
                    });
                    const verifyData = await verifyRes.json();
                    if (verifyData?.success) {
                        await fetchCart();
                        router.push("/orders");
                    } else {
                        setPaying(false);
                        alert("Payment verification failed.");
                    }
                },
            };
            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", () => {
                setPaying(false);
                alert("Payment failed. Please try again.");
            });
            rzp.open();
        } catch (err) {
            console.error(err);
            setPaying(false);
            alert(err?.message || "Something went wrong.");
        }
    };

    if (!user) {
        return (
            <div className="px-6 py-12 max-w-2xl mx-auto text-center">
                <p className="text-gray-600 mb-4">Sign in to checkout.</p>
                <button
                    onClick={() => router.push("/")}
                    className="px-4 py-2 rounded-lg bg-[#2b6a5b] text-white hover:bg-[#235a4d] transition-colors"
                >
                    Go to Home
                </button>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="px-6 py-12 max-w-2xl mx-auto text-center">
                <h1 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h1>
                <p className="text-gray-600 mb-4">Add products to checkout.</p>
                <button
                    onClick={() => router.push("/products")}
                    className="px-4 py-2 rounded-lg bg-[#2b6a5b] text-white hover:bg-[#235a4d] transition-colors"
                >
                    Browse products
                </button>
            </div>
        );
    }

    return (
        <div className="px-6 py-8 max-w-3xl mx-auto">
            <button
                type="button"
                onClick={() => router.push("/cart")}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to cart
            </button>

            <h1 className="text-xl font-bold text-gray-800 mb-6">Checkout</h1>

            <div className="grid gap-6 md:grid-cols-[1fr,320px]">
                <div className="space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
                        <h2 className="font-semibold text-gray-800 mb-4">Delivery details</h2>
                        <div className="grid gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone number
                                </label>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={shippingPhone}
                                    onChange={(e) => {
                                        const digitsOnly = e.target.value.replace(/\D/g, "");
                                        setShippingPhone(digitsOnly.slice(0, 10));
                                        if (checkoutError) setCheckoutError("");
                                    }}
                                    placeholder="10-digit mobile number"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2b6a5b]/20 focus:border-[#2b6a5b]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Delivery address
                                </label>
                                <textarea
                                    rows={3}
                                    value={shippingAddress}
                                    onChange={(e) => {
                                        setShippingAddress(e.target.value);
                                        if (checkoutError) setCheckoutError("");
                                    }}
                                    placeholder="House/Flat, street, area, city, state, pincode"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2b6a5b]/20 focus:border-[#2b6a5b] resize-y"
                                />
                            </div>
                            {checkoutError && (
                                <p className="text-sm text-red-600">{checkoutError}</p>
                            )}
                        </div>
                    </div>

                    <h2 className="font-semibold text-gray-800">Order summary</h2>
                    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-200">
                        {items.map((item) => {
                            const product = productMap[item.productId?.toString?.() || item.productId];
                            const imageUrl = product?.images?.[0];
                            const name = product?.name || "Product";
                            const lineTotal = (item.priceSnapshot || 0) * (item.quantity || 0);

                            return (
                                <div
                                    key={item.productId?.toString?.() || item.productId}
                                    className="flex gap-4 p-4"
                                >
                                    <div className="w-16 h-16 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
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
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 truncate">{name}</p>
                                        <p className="text-sm text-gray-500">
                                            Qty: {item.quantity} × Rs. {Math.round(item.priceSnapshot || 0)}/-
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="font-semibold text-gray-800">
                                            Rs. {Math.round(lineTotal)}/-
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="h-fit rounded-xl border border-gray-200 bg-white p-6">
                    <h2 className="font-semibold text-gray-800 mb-4">Payment</h2>
                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="font-medium">Rs. {Math.round(total)}/-</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                            <span className="text-gray-600">Total</span>
                            <span className="font-bold text-gray-900">Rs. {Math.round(total)}/-</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        disabled={paying || !isDeliveryReady}
                        className="w-full py-3 rounded-lg bg-[#2b6a5b] text-white font-medium hover:bg-[#235a4d] disabled:opacity-60 transition-colors"
                    >
                        {paying ? "Processing..." : "Proceed to payment"}
                    </button>
                    {!isDeliveryReady && (
                        <p className="mt-2 text-xs text-gray-500">
                            Add valid phone number and delivery address to continue.
                        </p>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={showConfirmModal}
                title="Proceed to payment?"
                rows={[
                    { label: "Items", value: `${items.length} item(s)` },
                    { label: "Amount", value: `Rs. ${Math.round(total)}/-*`, note: "*Incl. taxes", isAmount: true },
                    { label: "Phone", value: shippingPhone || "-" },
                    {
                        label: "Address",
                        value:
                            shippingAddress && shippingAddress.length > 50
                                ? `${shippingAddress.slice(0, 50)}...`
                                : shippingAddress || "-",
                    },
                ]}
                onConfirm={() => {
                    setShowConfirmModal(false);
                    initiatePayment();
                }}
                onCancel={() => setShowConfirmModal(false)}
                confirmLabel="Proceed"
                cancelLabel="Cancel"
            />
        </div>
    );
}
