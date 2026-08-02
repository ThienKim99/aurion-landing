# Aurion Elite Travel — Website & Hệ thống bán hàng tự động

Landing page + trang thanh toán + admin panel cho Tour VIP Khảo sát TMĐT Nghĩa Ô.

## Kiến trúc hệ thống

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Landing page, `/thanh-toan`, `/admin` | HTML/CSS/JS thuần, host trên Netlify | Giao diện người dùng |
| `netlify/functions/*.js` | Netlify Functions (Node.js) | Cầu nối tránh lỗi CORS giữa trình duyệt và Google Apps Script |
| **Google Apps Script** (deploy dạng Web App) | JavaScript (Apps Script) | **Toàn bộ logic nghiệp vụ thật**: nhận form, tạo đơn, xử lý webhook Sepay, gửi email qua Resend |
| **Google Sheet** | — | **Database vận hành thật** (Orders, Customers, Products, DangKy, KhaoSat, ChuaKhop) |
| Sepay | Dịch vụ ngoài | Nhận diện biến động số dư ngân hàng, gửi webhook khi có tiền vào |
| Resend | Dịch vụ ngoài | Gửi email tự động (chào mừng, chăm sóc, xác nhận đơn hàng) qua domain riêng |

> **Lưu ý quan trọng:** dự án này **không dùng** `brain.db`/`waitlist.json` kiểu SQLite/JSON cục bộ như một số dự án mẫu khác. Toàn bộ dữ liệu vận hành (khách hàng, đơn hàng, sản phẩm) nằm trong **Google Sheet**, được Apps Script đọc/ghi thay mặt hệ thống. File `brain.db` (nếu có trong thư mục `my-brain/` riêng) chỉ phục vụ việc **viết content** (brand voice, business info), không liên quan tới vận hành website.

## Cấu trúc thư mục

```
aurion-landing/
├── index.html              # Landing page (form, chatbot, hero CTA)
├── thanh-toan.html         # Trang thanh toán QR Sepay
├── admin.html              # CRM / Admin panel
├── netlify.toml            # Cấu hình Netlify (functions + redirect)
├── .env.example            # Mẫu biến môi trường cần thiết (KHÔNG chứa giá trị thật)
├── .gitignore
└── netlify/
    └── functions/
        ├── webhook.js      # Nhận webhook Sepay, forward sang Apps Script
        └── order.js        # Proxy gọi Apps Script (tránh CORS)
```

## Cách chạy thử ở máy local (không cần deploy)

Vì đây là các file HTML/JS thuần (không cần build), có thể xem thử ngay trên máy:

```bash
# Cách 1: mở trực tiếp file trong trình duyệt
# (một số tính năng gọi API sẽ không chạy do CORS, nhưng xem được giao diện)
mở file index.html bằng trình duyệt

# Cách 2: chạy local server đơn giản (khuyến nghị hơn)
npx serve .
# sau đó mở http://localhost:3000
```

⚠️ Lưu ý: `netlify/functions/*.js` chỉ chạy được khi deploy thật lên Netlify (hoặc dùng `netlify dev` nếu cài Netlify CLI), không chạy được nếu chỉ mở file tĩnh.

## Biến môi trường cần thiết

### 1. Netlify Environment Variables (Site configuration → Environment variables)

| Tên biến | Mô tả |
|---|---|
| `SEPAY_KEY` | API Key xác thực webhook Sepay (lấy tại sepay.vn → API Access) |

### 2. Google Apps Script Script Properties (Project Settings → Script Properties)

| Tên biến | Mô tả |
|---|---|
| `SEPAY_KEY` | Giống key phía trên (dùng nếu Apps Script cần tự xác thực) |
| `RESEND_API_KEY` | API Key của Resend (resend.com → API keys) |

⚠️ **Không** commit giá trị thật của các key này vào Git dưới bất kỳ hình thức nào. Nếu key bị lộ (đã từng commit lên repo Public), phải **thu hồi (rotate) key cũ** tại dashboard Sepay/Resend, không chỉ xóa khỏi code.

## Các bước deploy cơ bản

1. **Deploy frontend lên Netlify:**
   - Kết nối repo GitHub này với Netlify (Add new site → Import from Git)
   - Thêm biến môi trường `SEPAY_KEY` trong Site configuration
   - Netlify tự build khi có commit mới vào nhánh `main`

2. **Deploy backend (Google Apps Script):**
   - Mở Google Sheet database → Tiện ích mở rộng → Apps Script
   - Dán code, thêm Script Properties (`SEPAY_KEY`, `RESEND_API_KEY`)
   - Triển khai → Quản lý bản triển khai → chọn "Phiên bản mới" mỗi khi sửa code → Triển khai
   - Copy link `/exec`, cập nhật vào `SHEET_URL` trong `netlify/functions/*.js` và trong `index.html`/`thanh-toan.html`/`admin.html`

3. **Gắn domain riêng:**
   - Netlify → Domain management → Add a domain
   - Cấu hình DNS (CNAME trỏ subdomain về Netlify) tại nhà cung cấp domain

4. **Cấu hình webhook Sepay:**
   - Vào my.sepay.vn → Webhooks → thêm webhook trỏ tới `https://<domain>/.netlify/functions/webhook`
   - Dùng đúng `SEPAY_KEY` đã cấu hình ở bước 1

5. **Verify domain gửi email trên Resend:**
   - Resend → Domains → Add domain → thêm các bản ghi DNS (DKIM/MX/SPF/DMARC) theo hướng dẫn hiển thị

## Bảo mật (đã xử lý & còn cần lưu ý)

- ✅ API key không còn hardcode trong code (đọc từ biến môi trường)
- ✅ Form có validate định dạng email & số điện thoại
- ⚠️ Trang `/admin` hiện **chưa có mật khẩu** — cần bổ sung trước khi vận hành với dữ liệu khách thật quy mô lớn
- ⚠️ Một số API đọc dữ liệu (`action=customers`, `action=orders`) hiện **chưa yêu cầu xác thực** — khuyến nghị bổ sung khóa truy cập riêng cho các lệnh đọc dữ liệu nhạy cảm
