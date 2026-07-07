import Razorpay from "razorpay";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const order = await instance.orders.create({
      amount: 199 * 100, // paise mein — ₹199
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });
    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
