// netlify/functions/webhook.js
// Nhận webhook Sepay -> forward sang Google Apps Script để cập nhật Sheet

const SEPAY_KEY = "M3RAN0BAZOSEG3WTX6OHSFL9SKJYWZXD5O4C18VKICAPEEUY2R77VH8FZ6YQVVMT";
const SHEET_URL = "https://script.google.com/macros/s/AKfycbzXm1VxJ6DssZ15J3_12fKcPXpQ1Kz1Cd1OQi6Npcf0st_M0el1tMpqK1GxSho5DOeUag/exec";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

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

  // Forward toàn bộ payload sang Apps Script để xử lý & cập nhật Sheet
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
