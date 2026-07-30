// netlify/functions/order.js
// API nội bộ cho trang thanh-toan.html:
//   GET  ?code=AET123456        → lấy trạng thái đơn
//   POST body={order object}    → tạo / cập nhật đơn

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;

  if (!siteId || !token) {
    // Dev mode: trả về mock để test local
    if (event.httpMethod === "GET") {
      return { statusCode: 200, headers, body: JSON.stringify({ status: "pending" }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, mock: true }) };
  }

  // ---- GET: kiểm tra trạng thái ----
  if (event.httpMethod === "GET") {
    const code = (event.queryStringParameters || {}).code;
    if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: "missing code" }) };

    const url = `https://api.netlify.com/api/v1/sites/${siteId}/blobs/orders/${code}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { statusCode: 200, headers, body: JSON.stringify({ status: "pending" }) };
    const data = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  }

  // ---- POST: tạo đơn mới ----
  if (event.httpMethod === "POST") {
    let body;
    try { body = JSON.parse(event.body); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "invalid json" }) }; }

    const code = body.orderCode;
    if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: "missing orderCode" }) };

    const url = `https://api.netlify.com/api/v1/sites/${siteId}/blobs/orders/${code}`;
    await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, status: "pending", createdAt: new Date().toISOString() })
    });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, orderCode: code }) };
  }

  // ---- OPTIONS (CORS preflight) ----
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { ...headers, "Access-Control-Allow-Methods": "GET,POST,OPTIONS" }, body: "" };
  }

  return { statusCode: 405, headers, body: "Method Not Allowed" };
};
