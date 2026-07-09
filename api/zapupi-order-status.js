export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { order_id } = req.body;

  try {
    const zapRes = await fetch("https://pay.zapupi.com/api/order-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zap_key: process.env.ZAPUPI_KEY,
        order_id,
      }),
    });

    const data = await zapRes.json();

    if (data.status === "success" && data.data) {
      res.status(200).json({
        verified: data.data.status === "Success",
        status: data.data.status,
        amount: data.data.amount,
      });
    } else {
      res.status(404).json({ verified: false, status: "not_found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
