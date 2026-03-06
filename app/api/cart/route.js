import { connectDB } from "@/app/lib/db";
import Cart from "@/app/models/Cart";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { NextResponse } from "next/server";
import Product from "@/app/models/Product";
export async function GET(req) {
    return withAuth(req, {
        onAuthenticated: async ({ decodedToken }) => {
            try {
                const user = await getUserFromDB(decodedToken.email);
                if (!user) {
                    return NextResponse.json({ error: "User not found" }, { status: 404 })
                }

                const { searchParams } = new URL(req.url);
                const brand = searchParams.get("brand") || searchParams.get("subdomain");
                if (!brand) {
                    return NextResponse.json({ error: "brand or subdomain is required" }, { status: 400 });
                }
                await connectDB();
                const cart = await Cart.findOne({ userId: user.id, brand });
                const items = cart?.items || [];
                return NextResponse.json({ cart: { items } });
            } catch (err) {
                console.error("Cart GET error:", err);
                return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 });
            }
        },
        onUnauthenticated: async () => NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    });
}

export async function POST(req) {
    return withAuth(req, {
        onAuthenticated: async ({ decodedToken }) => {
            try {
                const user = await getUserFromDB(decodedToken.email);
                if (!user) {
                    return NextResponse.json({ error: "User not found" }, { status: 404 });
                }
                const body = await req.json();
                const { productId, quantity = 1, brand } = body;
                if (!productId || !brand) {
                    return NextResponse.json(
                        { error: "productId and brand are required" },
                        { status: 400 }
                    );
                }
                await connectDB();
                const product = await Product.findById(productId).lean();
                if (!product) {
                    return NextResponse.json({ error: "Product not found" }, { status: 404 });
                }
                if (product.brand !== brand) {
                    return NextResponse.json({ error: "Product not found" }, { status: 404 });
                }

                const discount = Math.min(100, Math.max(0, Number(product.discountPercentage) || 0));
                const priceSnapshot = (Number(product.price) || 0) * (1 - discount / 100);
                const qty = Math.max(1, Math.floor(Number(quantity) || 1));

                let cart = await Cart.findOne({ userId: user.id, brand });
                if (!cart) {
                    cart = await Cart.create({
                        userId: user.id,
                        brand,
                        items: [{ productId, quantity: qty, priceSnapshot }]
                    })
                } else {
                    const existingIdx = cart.items.findIndex((i) => i.productId?.toString() === productId);
                    if (existingIdx >= 0) {
                        cart.items[existingIdx].quantity += qty;
                    } else {
                        cart.items.push({ productId, quantity: qty, priceSnapshot });
                    }
                    await cart.save();
                }
                return NextResponse.json({ cart: { items: cart.items } });
            } catch (err) {
                console.error("Cart POST error:", err);
                return NextResponse.json({ error: "Failed to add to cart" }, { status: 500 });
            }
        },
        onUnauthenticated: async () =>
            NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    });
}

export async function PATCH(req) {
    return withAuth(req, {
        onAuthenticated: async ({ decodedToken }) => {
            try {
                const user = await getUserFromDB(decodedToken.email);
                if (!user) {
                    return NextResponse.json({ error: "User not found" }, { status: 404 });
                }
                const body = await req.json();
                const { productId, quantity, brand } = body;
                if (!productId || !brand) {
                    return NextResponse.json(
                        { error: "productId and brand are required" },
                        { status: 400 }
                    );
                }
                await connectDB();
                const cart = await Cart.findOne({ userId: user.id, brand });
                if (!cart) {
                    return NextResponse.json({ cart: { items: [] } });
                }
                const idx = cart.items.findIndex((i) => i.productId?.toString() === productId);
                if (idx < 0) {
                    return NextResponse.json({ cart: { items: cart.items } });
                }
                const qty = Math.max(0, Math.floor(Number(quantity) ?? 0));
                if (qty <= 0) {
                    cart.items.splice(idx, 1);
                } else {
                    cart.items[idx].quantity = qty;
                }
                await cart.save();
                return NextResponse.json({ cart: { items: cart.items } });
            } catch (err) {
                console.error("Cart PATCH error:", err);
                return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
            }
        },
        onUnauthenticated: async () =>
            NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    });
}