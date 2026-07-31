// netlify/functions/order.js
// Proxy giữa frontend và Google Apps Script (tránh CORS)

const SHEET_URL = "https://script.google.com/macros/s/AKfycbzXm1VxJ6DssZ15J3_12fKcPXpQ1Kz1Cd1OQi6Npcf0st_M0el1tMpqK1GxSho5DOeUag/exec";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  try {
    if (event.httpMethod === "GET") {
      const qs = new URLSearchParams(event.queryStringParameters || {}).toString();
      const res = await fetch(`${SHEET_URL}?${qs}`, { redirect: "follow" });
      const text = await res.text();
      return { statusCode: 200, headers: CORS, body: text };
    }

    if (event.httpMethod === "POST") {
      const res = await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: event.body,
        redirect: "follow"
      });
      const text = await res.text();
      return { statusCode: 200, headers: CORS, body: text };
    }

    return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: String(err) }) };
  }
};
