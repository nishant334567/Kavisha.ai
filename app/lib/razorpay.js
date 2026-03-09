import Razorpay from "razorpay"

const CURRENCY = "INR";
const RECEIPT_MAX_LEN = 40;

export function getRazorpayClient() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay is not configured");
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
}

/**
 * Create a Razorpay order.
 * @param {Object} opts
 * @param {number} opts.amount - Amount in paise (100 paise = ₹1)
 * @param {string} [opts.currency="INR"]
 * @param {string} opts.receipt - Receipt id (max 40 chars)
 * @param {Object} [opts.notes={}] - Custom metadata
 * @returns {Promise<{id: string, amount: number, currency: string}>}
 */
export async function createRazorpayOrder({ amount, currency = CURRENCY, receipt, notes = {} }) {
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
        amount: Math.round(amount),
        currency,
        receipt: String(receipt).slice(0, RECEIPT_MAX_LEN),
        notes,
    });
    return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
    };
}