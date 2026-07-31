// netlify/functions/order.js
// API trung gian giữa frontend và JSONBin
// GET  ?code=AET123456  → đọc trạng thái đơn
// POST {order}          → tạo đơn mới (pending)
// PUT  {orderCode, status} → cập nhật trạng thái

const JSONBIN_KEY = "$2a$10$xVrPdo4UpUIWmuf7NlPw/eacHNVZpRTsi/fypuRqfxtgVY/IyBvmm";
const BASE = "https://api.jsonbin.io/v3/b";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

async function findBin(orderCode) {
  // Lấy danh sách tất cả bins
  const r = await fetch(BASE, { headers: { "X-Master-Key": JSONBIN_KEY } });
  if (!r.ok) return null;
  const data = await r.json();
  const bins = data.result || [];
  // Tìm bin tên = orderCode
  return bins.find(b => b.snippetMeta && b.snippetMeta.name === orderCode) || null;
}

async function readBin(binId) {
  const r = await fetch(`${BASE}/${binId}/latest`, {
    headers: { "X-Master-Key": JSONBIN_KEY }
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d.record || null;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  // ── GET: đọc trạng thái đơn ──
  if (event.httpMethod === "GET") {
    const code = (event.queryStringParameters || {}).code;
    if (!code) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "missing code" }) };
    try {
      const bin = await findBin(code);
      if (!bin) return { statusCode: 200, headers: CORS, body: JSON.stringify({ status: "pending", found: false }) };
      const record = await readBin(bin._id);
      return { statusCode: 200, headers: CORS, body: JSON.stringify(record || { status: "pending" }) };
    } catch(e) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ status: "pending" }) };
    }
  }

  // ── POST: tạo đơn mới ──
  if (event.httpMethod === "POST") {
    let body;
    try { body = JSON.parse(event.body); } catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "invalid json" }) }; }
    const code = body.orderCode;
    if (!code) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "missing orderCode" }) };
    try {
      const r = await fetch(BASE, {
        method: "POST",
        headers: {
          "X-Master-Key": JSONBIN_KEY,
          "Content-Type": "application/json",
          "X-Bin-Name": code,
          "X-Bin-Private": "false"
        },
        body: JSON.stringify({ ...body, status: "pending", createdAt: new Date().toISOString() })
      });
      const d = await r.json();
      console.log("Tạo đơn:", code, d);
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, orderCode: code, binId: d.metadata && d.metadata.id }) };
    } catch(e) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: String(e) }) };
    }
  }

  // ── PUT: cập nhật trạng thái thủ công ──
  if (event.httpMethod === "PUT") {
    let body;
    try { body = JSON.parse(event.body); } catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "invalid json" }) }; }
    const { orderCode, status } = body;
    if (!orderCode || !status) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "missing fields" }) };
    try {
      const bin = await findBin(orderCode);
      if (!bin) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "order not found" }) };
      const current = await readBin(bin._id) || {};
      const r = await fetch(`${BASE}/${bin._id}`, {
        method: "PUT",
        headers: { "X-Master-Key": JSONBIN_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, status, updatedAt: new Date().toISOString() })
      });
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
    } catch(e) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: String(e) }) };
    }
  }

  return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
};
