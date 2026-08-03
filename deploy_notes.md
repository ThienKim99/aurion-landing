# Deploy Notes — Aurion Landing

## Biến môi trường cần set trên VPS

| Tên biến   | Mô tả                                      | Bắt buộc |
|------------|--------------------------------------------|----------|
| SEPAY_KEY  | API key xác thực webhook Sepay             | Có       |
| PORT       | Port server lắng nghe (mặc định: 3000)     | Không    |

## Lệnh chạy server

```bash
npm install
npm start
# hoặc
node server.js
```

## Port
- Server lắng nghe: `3000` (hoặc giá trị PORT trong .env)
- Nginx/Caddy reverse proxy từ port 80/443 → 3000

## API Endpoints
- `GET/POST /api/order` — Proxy form submissions → Google Apps Script
- `POST /api/webhook` — Nhận webhook Sepay (cần header `Authorization: Apikey <SEPAY_KEY>`)
- `GET /health` — Health check

## Sepay Webhook URL (cập nhật sau khi có domain)
Vào sepay.vn → cập nhật webhook URL thành: `https://aurionelite.travel/api/webhook`

## Systemd service
Tên service: `aurion-landing`
Chạy trên: `/opt/aurion-landing`
