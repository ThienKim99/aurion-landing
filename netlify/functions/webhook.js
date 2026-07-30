// netlify/functions/webhook.js
// Nhận webhook từ Sepay khi có tiền vào TPBank
// Tự động cập nhật trạng thái đơn hàng: pending -> success

const SEPAY_API_KEY = "M3RAN0BAZOSEG3WTX6OHSFL9SKJYWZXD5O4C18VKICAPEEUY2R77VH8FZ6YQVVMT";

exports.handler = async (event) => {
  // Chỉ nhận POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Xác thực API Key từ header
  const authHeader = event.headers["authorization"] || event.headers["Authorization"] || "";
  if (authHeader !== `Apikey ${SEPAY_API_KEY}`) {
    console.log("Unauthorized webhook:", authHeader);
    return { statusCode: 401, body: JSON.stringify({ success: false, message: "Unauthorized" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: "Invalid JSON" }) };
  }

  console.log("Sepay webhook received:", JSON.stringify(payload));

  // Chỉ xử lý tiền VÀO
  if (payload.transferType !== "in") {
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  const content = (payload.content || "").toUpperCase();
  const amount  = payload.transferAmount;

  // Tìm mã đơn hàng trong nội dung chuyển khoản (dạng AET + 6 số, VD: AET123456)
  const orderMatch = content.match(/AET\d{6}/);
  if (!orderMatch) {
    console.log("Không tìm thấy mã đơn hàng trong nội dung:", content);
    return { statusCode: 200, body: JSON.stringify({ success: true, note: "no order code found" }) };
  }

  const orderCode = orderMatch[0];
  console.log(`Cập nhật đơn ${orderCode} → success, số tiền: ${amount}`);

  // Ghi vào Netlify Blobs (KV store) — key: orderCode, value: JSON
  // Netlify Blobs không cần import, dùng fetch đến internal API
  const siteId   = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  const token    = process.env.NETLIFY_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;

  if (siteId && token) {
    try {
      const blobUrl = `https://api.netlify.com/api/v1/sites/${siteId}/blobs/orders/${orderCode}`;
      // Đọc đơn cũ
      let order = {};
      const getRes = await fetch(blobUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (getRes.ok) {
        try { order = await getRes.json(); } catch {}
      }
      // Cập nhật trạng thái
      order.status       = "success";
      order.paidAmount   = amount;
      order.paidAt       = new Date().toISOString();
      order.transactionId = payload.id;
      order.orderCode    = orderCode;

      await fetch(blobUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });
      console.log(`Đã lưu đơn ${orderCode} vào Blobs`);
    } catch (err) {
      console.error("Lỗi lưu Blobs:", err);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, orderCode, amount })
  };
};
