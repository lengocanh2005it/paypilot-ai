# Environment Setup — Local Dev

## Yêu cầu

- Node.js ≥ 20
- pnpm ≥ 10 (`corepack enable` hoặc cài trực tiếp — repo pin version qua `packageManager` trong `package.json` root)
- Docker + Docker Compose (PostgreSQL + pgvector, Redis) — file `docker-compose.yml` sẽ được thêm ở Sprint 1 tuần 1, xem `reference/sprint-plan.md`
- `ngrok` (chỉ cần khi test webhook Cas thật ở local — Cas server không gọi được vào `localhost`)

## Cài đặt lần đầu

```bash
git clone <repo>
cd paypilot-ai
pnpm install
cp .env.example .env       # điền giá trị thật, KHÔNG commit .env
```

## Biến môi trường — nhóm chính (đầy đủ xem `.env.example` ở root)

| Nhóm | Biến quan trọng | Ghi chú |
|---|---|---|
| App | `PORT`, `APP_URL`, `FRONTEND_URL` | backend mặc định port 3000, frontend (Vite) port 5173 |
| Database | `DATABASE_URL` | PostgreSQL, **phải bật extension `pgvector`** trước khi migrate |
| Redis | `REDIS_URL` | dùng cho cache + BullMQ + webhook idempotency |
| JWT | `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN=15m`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN=7d` | Access token ngắn hạn, Refresh lưu HttpOnly Cookie |
| OpenAI | `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL`, `OPENAI_CHAT_MODEL` | công ty cấp sẵn key, không tự train model |
| Cas SDK | `CAS_API_BASE_URL`, `CAS_CLIENT_ID`, `CAS_SECRET_KEY`, `CAS_GRANT_REDIRECT_URI` | sandbox thật, lấy tại `sandbox.console.bankhub.dev/developer/keys` |
| Cas Webhook | `NGROK_WEBHOOK_URL` | chỉ cần khi test webhook local qua ngrok |
| PayOS (billing) | `PAYOS_CHECKSUM_KEY`, `PAYOS_BILLING_WEBHOOK_URL` | mock qua Postman, chưa có account PayOS thật |
| Webhook security | `WEBHOOK_SIGNATURE_HEADER`, `WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS`, `WEBHOOK_IDEMPOTENCY_TTL_SECONDS` | **cần đọc kỹ `https://cas.so/general/api/webhook` trước khi code phần verify signature** — tài liệu Cas chưa nêu rõ tên header chữ ký |
| AI Matching | `AI_MATCHING_AUTO_THRESHOLD=95`, `AI_MATCHING_MIN_THRESHOLD=50` | mặc định, tenant có thể override qua `tenants.matching_threshold` |
| Frontend | `VITE_API_BASE_URL` | file `.env` riêng trong `apps/frontend`, phải có prefix `VITE_` mới được Vite expose ra client |

## Chạy dev

```bash
pnpm dev                 # chạy backend (port 3000) + frontend (port 5173) song song
```

Swagger docs (khi backend đã setup): `http://localhost:3000/api/docs` (đường dẫn cụ thể tùy config trong `main.ts`).

## Test webhook Cas Balance Hook ở local

Cas server thật **không gọi vào được `localhost`**, nên phải dùng `ngrok`:

```bash
ngrok http 3000
# copy URL public (vd: https://abc123.ngrok-free.app) → cấu hình trên
# sandbox.console.bankhub.dev → Developer → Webhooks → loại TRANSACTIONS
# URL: https://abc123.ngrok-free.app/api/v1/webhook/cas
```

Đây là thao tác cấu hình **1 lần duy nhất cho toàn App** (không lặp lại cho từng tenant) — xem chi tiết tại `reference/business-overview.md` mục "Webhook URL — DÙNG CHUNG 1 URL cho toàn bộ App".

## Tài khoản demo Cas (sandbox)

Dùng khi test luồng Cas Link (liên kết ngân hàng) ở Onboarding:

```
username: bankusrdemo1
password: soproud
OTP:      123456
```

## Mock data có sẵn

3 file Excel mẫu để test import/webhook nằm ở: (đường dẫn gốc ngoài repo, copy vào `apps/backend/test/fixtures/` khi cần dùng cho integration test)
- `customers_import.xlsx` — mẫu import khách hàng
- `invoices_import.xlsx` — mẫu import hóa đơn
- `transactions_sample.xlsx` — mẫu payload giao dịch, dùng làm dữ liệu mock khi Cas sandbox không ổn định (xem rủi ro trong `reference/sprint-plan.md`)

## Troubleshooting nhanh

| Vấn đề | Nguyên nhân thường gặp |
|---|---|
| `pnpm install` báo lỗi workspace | Kiểm tra `package.json` của package mới có `name` dạng `@paypilot/<tên>` và nằm đúng dưới `apps/` hoặc `packages/` chưa |
| Turbo báo "no script found" | Bình thường nếu package đó chưa cần script đó — không phải lỗi |
| Webhook Cas không đến local | Ngrok tunnel đã tắt, hoặc URL trên Cas Console chưa cập nhật URL ngrok mới (ngrok free đổi URL mỗi lần restart) |
| `grantToken` hết hạn khi test Cas Link | Token chỉ sống 30 phút, dùng 1 lần — tạo lại token mới, không cache/reuse |
