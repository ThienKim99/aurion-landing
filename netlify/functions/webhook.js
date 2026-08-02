// netlify/functions/webhook.js
// Nhận webhook Sepay -> forward sang Google Apps Script để cập nhật Sheet
// SEPAY_KEY được đọc từ Netlify Environment Variable, KHÔNG hardcode trong code
 
const SEPAY_KEY = process.env.SEPAY_KEY;
const SHEET_URL = "https://script.google.com/macros/s/AKfycbzXm1VxJ6DssZ15J3_12fKcPXpQ1Kz1Cd1OQi6Npcf0st_M0el1tMpqK1GxSho5DOeUag/exec";
 
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
 
  if (!SEPAY_KEY) {
    console.error("Thiếu biến môi trường SEPAY_KEY trên Netlify — vào Site configuration > Environment variables để thêm.");
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "server_misconfigured" }) };
  }
 
  const auth = event.headers["authorization"] || event.headers["Authorization"] || "";
  if (auth !== `Apikey ${SEPAY_KEY}`) {
    console.log("Unauthorized:", auth);
    return { statusCode: 401, body: JSON.stringify({ success: false }) };
  }
 
  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ success: false }) }; }
 
  console.log("Sepay webhook:", JSON.stringify(payload));
 
  if (payload.transferType !== "in") {
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }
 
  try {
    const res = await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });
    const text = await res.text();
    console.log("Apps Script response:", text.slice(0,200));
  } catch (err) {
    console.error("Lỗi forward Apps Script:", err);
  }
 
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
