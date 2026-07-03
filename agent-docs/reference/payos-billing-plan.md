# 💳 Kế hoạch triển khai — Nâng cấp gói qua PayOS

> Trạng thái: **CHƯA LÀM** — tài liệu này mô tả các phase cần làm để hoàn thiện luồng nâng cấp gói dịch vụ (Free → Starter → Pro → Enterprise) do doanh nghiệp tự chọn và thanh toán qua PayOS, theo đúng thiết kế đã mô tả ở [`rbac.md`](./rbac.md) mục "Nâng cấp gói qua PayOS" và [`business-overview.md`](./business-overview.md).
>
> **Không có account PayOS thật trong phạm vi đồ án** — toàn bộ callback PayOS sẽ được mock (qua Postman hoặc nút demo trong Settings), theo đúng chủ trương đã ghi ở README/`04-environment-setup.md`.

---

## Đã có sẵn (không cần làm lại)

- Schema `PaymentOrder` (Prisma) — `id, tenantId, orderCode (unique), targetPlan, amount, status (pending/paid/expired/failed), paidAt, createdAt` ✅
- Schema `Subscription` — `plan, pricePerMonth, transactionQuota, status, currentCycleStart/End` ✅
- `billing` module hiện có: `GET /billing/current-plan`, `GET /billing/usage-history` ✅
- `partner.service.getRevenueTrend()` đã đọc từ `PaymentOrder` (status=paid) — khi có payment thật, biểu đồ Partner Dashboard tự động phản ánh, không cần sửa gì thêm ✅
- Env placeholder: `PAYOS_CHECKSUM_KEY`, `PAYOS_BILLING_WEBHOOK_URL` (giá trị mock) ✅

---

## SDK dùng: `@payos/node`

> ⚠️ **Lệch với mô tả gốc trong `rbac.md`:** tài liệu gốc giả định `orderCode` là chuỗi `UPG-{tenant_id}-{timestamp}` để tự giải mã ra `tenantId` khi PayOS callback về. Nhưng SDK `@payos/node` yêu cầu `orderCode` là **số nguyên** (`paymentRequests.create({ orderCode: 123, ... })`), không chấp nhận chuỗi có chữ. Cách xử lý: sinh `orderCode` là số (vd timestamp dạng số), lưu vào cột `PaymentOrder.orderCode` (đã là kiểu String trong Prisma nên lưu dạng chuỗi số vẫn unique bình thường) — khi webhook trả về, **tra `tenantId` trực tiếp qua bảng `PaymentOrder` của chính mình** (đã có cột `tenantId`) thay vì cố giải mã từ orderCode. Không cần sửa schema.

Cài đặt: `pnpm --filter @xcash/backend add @payos/node`

```typescript
import { PayOS } from '@payos/node';

const payos = new PayOS({
  clientId: configService.get('PAYOS_CLIENT_ID'),
  apiKey: configService.get('PAYOS_API_KEY'),
  checksumKey: configService.get('PAYOS_CHECKSUM_KEY'),
});

// Tạo payment link
const paymentLink = await payos.paymentRequests.create({
  orderCode: 123456789, // số nguyên, KHÔNG phải "UPG-xxx"
  amount: 299_000,
  description: 'X-Cash AI nang cap Starter',
  returnUrl: `${FRONTEND_URL}/settings?tab=billing&status=success`,
  cancelUrl: `${FRONTEND_URL}/settings?tab=billing&status=cancel`,
});
// paymentLink.checkoutUrl, paymentLink.qrCode

// Verify webhook (trong controller nhận POST /webhook/payos-billing)
const webhookData = await payos.webhooks.verify(req.body);
// webhookData.data.orderCode → dùng để tìm lại PaymentOrder + tenantId trong DB của mình
```

Cần thêm env var mới (chưa có trong `.env.example`): `PAYOS_CLIENT_ID`, `PAYOS_API_KEY` (khác `PAYOS_CHECKSUM_KEY` đã có sẵn).

---

## Phase 1 — Backend: tạo Payment Order + PayOS Payment Link

**Mục tiêu:** `POST /billing/upgrade` nhận `targetPlan`, tạo `PaymentOrder` (status=pending), gọi PayOS API tạo payment link, trả về `{ checkoutUrl, qrCode, orderCode }` cho FE.

- [ ] Thêm `@payos/node` vào `apps/backend/package.json`, thêm `PAYOS_CLIENT_ID`/`PAYOS_API_KEY` vào `configuration.ts` + `.env.example` (root và `apps/backend/`)
- [ ] Thêm `PayosService` (`src/modules/billing/payos.service.ts`):
  - Khởi tạo `PayOS` client từ `ConfigService` (xem code mẫu ở trên)
  - `createPaymentLink({ orderCode, amount, description })` → gọi `payos.paymentRequests.create(...)`, trả `{ checkoutUrl, qrCode }`
  - Nếu thiếu `PAYOS_CLIENT_ID`/`PAYOS_API_KEY` → trả về **mock response** (checkoutUrl giả dạng `/mock-payos-checkout?orderCode=...`, qrCode = placeholder) để vẫn demo được luồng UI mà không cần key thật
- [ ] `BillingService.upgrade(tenantId, targetPlan)`:
  - Validate `targetPlan` hợp lệ, khác plan hiện tại
  - Sinh `orderCode` **dạng số** (vd `Date.now()` hoặc `Number(\`${Date.now()}\`.slice(-9))` để tránh tràn số PayOS cho phép)
  - Tạo `PaymentOrder` (status=pending, lưu `tenantId`, `orderCode` dạng chuỗi số, `targetPlan`, `amount`)
  - Gọi `PayosService.createPaymentLink(...)` với `amount` theo bảng giá (`rbac.md` mục Pricing)
  - Trả về cho FE: `{ orderCode, checkoutUrl, qrCode, amount }`
- [ ] `POST /billing/upgrade` — `@Roles(Role.ADMIN)` (chỉ Admin nâng cấp gói, theo ma trận phân quyền hiện tại)
- [ ] Test: `billing.service.spec.ts` — mock PayosService, test tạo PaymentOrder đúng orderCode (số)/amount

## Phase 2 — Backend: Webhook nhận callback PayOS

**Mục tiêu:** `POST /webhook/payos-billing` verify bằng `payos.webhooks.verify()`, tra `PaymentOrder` theo `orderCode` để lấy `tenantId`, cập nhật `Subscription` sang plan mới.

- [ ] Module mới `src/modules/billing/payos-webhook.controller.ts` (route riêng, **không dùng chung** với `/webhook/cas`):
  - `POST /webhook/payos-billing` — Public nhưng verify bằng `payos.webhooks.verify(req.body)` (SDK tự check chữ ký theo `checksumKey`, throw nếu sai — bắt exception trả 400)
  - Idempotency: check `PaymentOrder.status` đã `paid` chưa trước khi xử lý lại (tránh double-processing nếu PayOS retry)
- [ ] `BillingService.confirmPayment(orderCode: string)`:
  - Tìm `PaymentOrder` theo `orderCode` → lấy `tenantId`, `targetPlan` (KHÔNG parse từ orderCode)
  - Set `PaymentOrder.status = paid`, `paidAt = now()`
  - Update `Subscription`: `plan = targetPlan`, `pricePerMonth`/`transactionQuota` theo bảng giá, `status = active`, reset `currentCycleStart/End`
  - Ghi `AuditLog` (action: `subscription_upgraded`)
- [ ] Test: `payos-webhook.controller.spec.ts` — chữ ký sai bị từ chối (SDK throw), chữ ký đúng cập nhật đúng subscription, gọi lại cùng `orderCode` không xử lý 2 lần
- [ ] Gọi `payos.webhooks.confirm(PAYOS_BILLING_WEBHOOK_URL)` một lần khi có key thật (đăng ký URL webhook với PayOS) — chỉ cần chạy 1 lần thủ công hoặc script riêng, không cần chạy mỗi lần start server

## Phase 3 — Frontend: chọn gói + hiển thị thanh toán

**Mục tiêu:** Tab Billing trong `SettingsPage` cho Admin chọn gói mới, hiện QR/link thanh toán, tự cập nhật khi thanh toán xong.

- [ ] Dialog "Nâng cấp gói": liệt kê 4 gói (Free/Starter/Pro/Enterprise) kèm giá + số GD/tháng (dùng đúng bảng giá `rbac.md`), disable gói hiện tại
- [ ] Khi chọn gói → gọi `POST /billing/upgrade` → hiện `Dialog` mới với QR code (dùng `<img src={qrCode}>` nếu PayOS trả base64/URL) + nút "Đã thanh toán, kiểm tra lại"
- [ ] Poll `GET /billing/current-plan` mỗi 5–10s trong lúc dialog thanh toán đang mở (tương tự pattern `useReviewCount`) — khi `plan` đổi thành `targetPlan` → đóng dialog, toast thành công
- [ ] Nếu `checkoutUrl` là mock (chưa có PayOS thật) → hiện thêm nút "Demo: giả lập thanh toán thành công" **chỉ hiện khi `import.meta.env.DEV`**, gọi thẳng một endpoint dev-only để tự confirm (xem Phase 4)

## Phase 4 — Mock/demo path (không cần account PayOS thật)

**Mục tiêu:** Demo được toàn bộ luồng mà không cần chờ tài khoản PayOS thật, đúng chủ trương đồ án.

- [ ] Thêm endpoint dev-only `POST /billing/upgrade/:orderCode/mock-confirm` — **chỉ mount khi `NODE_ENV !== 'production'`** (check trong `BillingModule` hoặc guard riêng), gọi thẳng `BillingService.confirmPayment(orderCode)` bỏ qua verify chữ ký PayOS
- [ ] Cách khác (không cần code thêm): dùng Postman gọi thẳng `POST /webhook/payos-billing` với payload + chữ ký tự tính bằng `PAYOS_CHECKSUM_KEY` — ghi hướng dẫn cụ thể vào README mục "Test PayOS webhook local"
- [ ] Chọn 1 trong 2 cách trên tuỳ mức độ tiện demo — **cần thảo luận với user trước khi chọn**, vì thêm endpoint dev-only là quyết định kiến trúc (rủi ro nếu quên guard khi lên production)

## Phase 5 — Đồng bộ tài liệu

- [ ] Cập nhật `agent-docs/00-current-state.md`: thêm billing upgrade + payos-webhook vào danh sách API, đánh dấu hoàn thành
- [ ] Cập nhật bảng phân quyền `rbac.md` nếu endpoint mock-confirm (Phase 4) tồn tại — ghi rõ đây là dev-only
- [ ] `pnpm verify` pass trước khi coi mỗi phase là xong

---

## Việc cần quyết định trước khi bắt đầu code (hỏi user)

1. **Có SDK/tài khoản PayOS sandbox thật để test không**, hay làm 100% mock (Phase 1 tự động fallback mock nếu thiếu key)?
2. **Cách demo thanh toán** (Phase 4): thêm endpoint dev-only tiện bấm nút trên UI, hay chỉ dùng Postman gọi webhook thủ công (an toàn hơn, không có route "cửa sau" nào tồn tại kể cả dev)?
3. Gói **Enterprise** hiện "Liên hệ" (không có giá cố định theo `rbac.md`) — nâng lên Enterprise có nằm trong luồng tự động này không, hay Enterprise luôn cần sale liên hệ thủ công (loại khỏi danh sách gói tự chọn trong Dialog)?
