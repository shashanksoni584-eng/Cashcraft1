export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount, customer_mobile, remark } = req.body;
  const orderId = "CC" + Date.now();

  const origin = `https://${req.headers.host}`;

  try {
    const zapRes = await fetch("https://pay.zapupi.com/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zap_key: process.env.ZAPUPI_KEY,
        order_id: orderId,
        amount: amount || 199,
        customer_mobile: customer_mobile || "",
        remark: remark || "CashCraft Course",
        success_url: `${origin}/?order_id=${orderId}&status=success`,
        failed_url: `${origin}/?order_id=${orderId}&status=failed`,
        timeout_url: `${origin}/?order_id=${orderId}&status=timeout`,
      }),
    });

    const data = await zapRes.json();

    if (data.status === "success") {
      res.status(200).json({
        order_id: orderId,
        payment_url: data.payment_url,
        txn_id: data.txn_id,
      });
    } else {
      res.status(400).json({ error: data.message || "Order creation failed" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
