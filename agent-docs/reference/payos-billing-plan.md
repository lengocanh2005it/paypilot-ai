# 💳 Kế hoạch triển khai — Nâng cấp gói qua PayOS

> **Trạng thái: ĐÃ HOÀN THÀNH** (đồng bộ code Sprint 4). Luồng nâng cấp gói (Free → Starter → Pro → Enterprise), webhook PayOS, mock dev-only, overage billing và UI Settings đã triển khai. Chi tiết API xem [`agent-docs/00-current-state.md`](../00-current-state.md).
>
> **Không có account PayOS thật trong phạm vi đồ án** — khi thiếu `PAYOS_CLIENT_ID`/`PAYOS_API_KEY`, `PayosService` tự fallback mock; demo qua nút mock-confirm trên UI (dev) hoặc Postman.

---

## Đã có sẵn trước khi triển khai (giữ nguyên)

- Schema `PaymentOrder` + `Subscription` ✅
- `GET /billing/current-plan`, `GET /billing/usage-history` ✅
- `partner.service.getRevenueTrend()` đọc từ `payment_orders` ✅

---

## SDK: `@payos/node` ✅

- Package đã cài: `@payos/node`
- `orderCode` dạng **số** — tra `tenantId` qua bảng `PaymentOrder`, không parse từ orderCode
- Env: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `PAYOS_BILLING_WEBHOOK_URL` (có trong `apps/backend/.env.example`)

---

## Phase 1 — Backend: tạo Payment Order + PayOS Payment Link ✅

- [x] `@payos/node` + `PayosService` (`payos.service.ts`) — mock fallback khi thiếu keys
- [x] `BillingService.upgrade()` — validate, tạo `PaymentOrder`, gọi PayOS
- [x] `POST /billing/upgrade` — `@Roles(Role.ADMIN)`
- [x] `GET /billing/plans` — danh sách gói từ `plan_pricing`
- [x] Chặn downgrade tự nâng cấp (so `pricePerMonth` từ DB)

## Phase 2 — Backend: Webhook nhận callback PayOS ✅

- [x] `POST /webhook/payos-billing` — `payos-webhook.controller.ts`, verify chữ ký SDK
- [x] `BillingService.confirmPayment()` — idempotent, cập nhật `Subscription`, audit log
- [x] Phân biệt `orderType`: `upgrade` vs `overage`

## Phase 3 — Frontend: chọn gói + hiển thị thanh toán ✅

- [x] Tab Billing trong `SettingsPage` — 4 gói, disable gói hiện tại / gói thấp hơn
- [x] Dialog QR — `QRCodeSVG` từ `qrcode.react` (PayOS trả VietQR string)
- [x] Poll `GET /billing/current-plan` khi dialog mở
- [x] Dialog không đóng khi click outside / Escape

## Phase 4 — Mock/demo path ✅

- [x] `POST /billing/upgrade/:orderCode/mock-confirm` — dev-only (`NODE_ENV !== 'production'`)
- [x] `POST /billing/overage-order/:orderCode/mock-confirm` — dev-only cho phí vượt quota
- [x] Nút mock trên UI khi `import.meta.env.DEV`

## Phase 5 — Overage billing (bổ sung sau plan gốc) ✅

- [x] `planPricing.overagePricePerTransaction` — Partner chỉnh qua UI
- [x] `BillingCycleService` cron 2am — tạo đơn overage khi hết chu kỳ
- [x] `GET /billing/overage-orders`, `POST /billing/overage-order`
- [x] Banner + dialog thanh toán overage trên BillingTab

## Phase 6 — Đồng bộ tài liệu ✅

- [x] `agent-docs/00-current-state.md` — billing + payos-webhook
- [x] `pnpm verify` pass

---

## Quyết định đã chốt (tham khảo)

1. **PayOS sandbox:** fallback mock khi thiếu key — không bắt buộc account thật để demo.
2. **Demo thanh toán:** endpoint dev-only `mock-confirm` + nút trên UI (có guard production).
3. **Enterprise:** hiển thị "Liên hệ" — không nằm trong luồng tự thanh toán QR (giữ theo `rbac.md`).
