// server.js — Express server thay thế Netlify Functions
// Node 18+ required (dùng built-in fetch)

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SEPAY_KEY = process.env.SEPAY_KEY;
const SHEET_URL = "https://script.google.com/macros/s/AKfycbzXm1VxJ6DssZ15J3_12fKcPXpQ1Kz1Cd1OQi6Npcf0st_M0el1tMpqK1GxSho5DOeUag/exec";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Static files
app.use(express.static(path.join(__dirname)));

// Route pages
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/thanh-toan', (req, res) => res.sendFile(path.join(__dirname, 'thanh-toan.html')));

// API: Proxy đến Google Apps Script (order/form submissions)
app.all('/api/order', async (req, res) => {
  try {
    if (req.method === 'GET') {
      const qs = new URLSearchParams(req.query).toString();
      const r = await fetch(`${SHEET_URL}?${qs}`, { redirect: 'follow' });
      const text = await r.text();
      return res.status(200).type('json').send(text);
    }
    if (req.method === 'POST') {
      const r = await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        redirect: 'follow'
      });
      const text = await r.text();
      return res.status(200).type('json').send(text);
    }
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('[/api/order]', err);
    res.status(500).json({ error: String(err) });
  }
});

// API: Sepay webhook
app.post('/api/webhook', async (req, res) => {
  if (!SEPAY_KEY) {
    console.error('Thiếu SEPAY_KEY trong environment variables');
    return res.status(500).json({ success: false, error: 'server_misconfigured' });
  }

  const auth = req.headers['authorization'] || '';
  if (auth !== `Apikey ${SEPAY_KEY}`) {
    console.log('[webhook] Unauthorized:', auth);
    return res.status(401).json({ success: false });
  }

  const payload = req.body;
  console.log(`[webhook] ${new Date().toISOString()} Sepay:`, JSON.stringify(payload));

  if (payload.transferType !== 'in') {
    return res.status(200).json({ success: true });
  }

  try {
    const r = await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const text = await r.text();
    console.log('[webhook] Apps Script response:', text.slice(0, 200));
  } catch (err) {
    console.error('[webhook] Lỗi forward Apps Script:', err);
  }

  res.status(200).json({ success: true });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Aurion Landing running on port ${PORT}`);
});
