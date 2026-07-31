// netlify/functions/webhook.js
// Nhận webhook từ Sepay → cập nhật đơn hàng pending -> success trên JSONBin

const SEPAY_KEY = "M3RAN0BAZOSEG3WTX6OHSFL9SKJYWZXD5O4C18VKICAPEEUY2R77VH8FZ6YQVVMT";
const JSONBIN_KEY = "$2a$10$xVrPdo4UpUIWmuf7NlPw/eacHNVZpRTsi/fypuRqfxtgVY/IyBvmm";
const JSONBIN_BASE = "https://api.jsonbin.io/v3/b";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  // Xác thực Sepay API Key
  const auth = event.headers["authorization"] || event.headers["Authorization"] || "";
  if (auth !== `Apikey ${SEPAY_KEY}`) {
    console.log("Unauthorized:", auth);
    return { statusCode: 401, body: JSON.stringify({ success: false }) };
  }

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ success: false }) }; }

  console.log("Sepay webhook:", JSON.stringify(payload));

  // Chỉ xử lý tiền VÀO
  if (payload.transferType !== "in") return { statusCode: 200, body: JSON.stringify({ success: true }) };

  const content = (payload.content || "").toUpperCase();
  const match = content.match(/AET\d{6}/);
  if (!match) return { statusCode: 200, body: JSON.stringify({ success: true, note: "no AET code" }) };

  const orderCode = match[0];
  console.log("Cập nhật đơn:", orderCode);

  // Tìm bin chứa đơn hàng này trên JSONBin
  try {
    // Đọc bin danh sách đơn hàng (lưu tất cả đơn)
    const listRes = await fetch(`${JSONBIN_BASE}/meta`, {
      headers: { "X-Master-Key": JSONBIN_KEY, "X-Bin-Name": "aurion-orders" }
    });

    // Tìm bin theo orderCode — dùng search
    const searchRes = await fetch(`https://api.jsonbin.io/v3/b?search=${orderCode}`, {
      headers: { "X-Master-Key": JSONBIN_KEY }
    });

    // Cách đơn giản hơn: mỗi đơn là 1 bin riêng, tên bin = orderCode
    // Đọc tất cả bins rồi tìm
    const binsRes = await fetch("https://api.jsonbin.io/v3/b", {
      headers: { "X-Master-Key": JSONBIN_KEY }
    });

    if (binsRes.ok) {
      const binsData = await binsRes.json();
      const bins = binsData.result || [];
      // Tìm bin có tên = orderCode
      const targetBin = bins.find(b => b.record && b.record.orderCode === orderCode ||
                                       b.snippetMeta && b.snippetMeta.name === orderCode);
      if (targetBin) {
        // Cập nhật bin đó
        const updateRes = await fetch(`${JSONBIN_BASE}/${targetBin._id}`, {
          method: "PUT",
          headers: { "X-Master-Key": JSONBIN_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            ...targetBin.record,
            status: "success",
            paidAt: new Date().toISOString(),
            paidAmount: payload.transferAmount,
            transactionId: payload.id
          })
        });
        console.log("Đã cập nhật bin:", targetBin._id);
      }
    }
  } catch(err) {
    console.error("Lỗi JSONBin:", err);
  }

  return { statusCode: 200, body: JSON.stringify({ success: true, orderCode }) };
};
