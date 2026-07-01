# 🗄 PayPilot AI — Database Schema

> Tài liệu này gom toàn bộ schema database từ `PayPilot_README.md` và `RBAC.md` vào một nơi duy nhất, đã rà soát và thống nhất các điểm từng bị định nghĩa rải rác ở 2 nơi khác nhau (đặc biệt là bảng `users`). Dùng file này làm nguồn tham chiếu chính khi viết Prisma schema thật.

---

## 📐 ERD tổng quan (quan hệ giữa các bảng)

```
                          ┌──────────────┐
                          │   tenants    │
                          └──────┬───────┘
                                 │ 1
            ┌────────────────────┼────────────────────┬──────────────┬──────────────┐
            │ N                  │ N                   │ N            │ N            │ N
      ┌─────▼─────┐       ┌──────▼──────┐       ┌──────▼──────┐  ┌───▼────────┐  ┌──▼──────────┐
      │   users   │       │ cas_grants  │       │ subscriptions│  │ customers  │  │  invoices   │
      └───────────┘       └─────────────┘       └──────┬──────┘  └─────┬──────┘  └──────┬──────┘
            │ 1                                         │ 1            │ 1               │ 1
            │ N                                         │ N            │ N               │ N
      ┌─────▼──────┐                              ┌─────▼────────┐    │           ┌──────▼────────┐
      │ audit_logs │                              │payment_orders│    │           │invoice_matches│
      │ (actor)    │                              └──────────────┘    │           └───────┬───────┘
      └────────────┘                                                  │                   │ N
                                                                       │                   │ 1
                                                                       │            ┌──────▼────────┐
                                                                       └───────────▶│ transactions  │
                                                                                     └───────────────┘

tenants ──N── usage_logs       (tổng hợp số liệu usage theo ngày/tháng)
tenants ──N── audit_logs       (entity_type = 'tenant' hoặc các entity khác trong tenant đó)
```

**Đọc nhanh quan hệ:**
- 1 `tenant` có nhiều `users`, nhiều `cas_grants` (mỗi lần liên kết thêm 1 tài khoản ngân hàng), 1 `subscriptions` đang active, nhiều `customers`, nhiều `invoices`
- 1 `invoice` có thể được ghép với nhiều `transactions` qua bảng trung gian `invoice_matches` (trường hợp Multiple Payment, Split Payment)
- 1 `transaction` cũng có thể match nhiều `invoice` (trường hợp 1 giao dịch trả gộp nhiều hóa đơn) — đây là lý do dùng bảng trung gian `invoice_matches` thay vì FK trực tiếp
- `users` với `role = cas_partner` có `tenant_id = NULL` — không thuộc tenant nào (xem `RBAC.md`)

---

## 📋 Danh sách bảng

| # | Bảng | Mục đích | Chi tiết |
|---|---|---|---|
| 1 | `tenants` | 1 doanh nghiệp = 1 dòng | [Xem](#1-tenants) |
| 2 | `users` | Tài khoản đăng nhập (Admin/Accountant/Viewer/Cas Partner) | [Xem](#2-users) |
| 3 | `cas_grants` | Tài khoản ngân hàng đã liên kết qua Cas Link | [Xem](#3-cas_grants) |
| 4 | `customers` | Khách hàng cuối của doanh nghiệp (học viên, bệnh nhân...) | [Xem](#4-customers) |
| 5 | `invoices` | Hóa đơn | [Xem](#5-invoices) |
| 6 | `transactions` | Giao dịch ngân hàng nhận từ Cas Balance Hook | [Xem](#6-transactions) |
| 7 | `invoice_matches` | Bảng trung gian — kết quả AI ghép transaction ↔ invoice | [Xem](#7-invoice_matches) |
| 8 | `subscriptions` | Gói dịch vụ đang active của 1 tenant | [Xem](#8-subscriptions) |
| 9 | `payment_orders` | Lịch sử thanh toán nâng cấp gói qua PayOS | [Xem](#9-payment_orders) |
| 10 | `usage_logs` | Log usage để Cas Partner xem thống kê | [Xem](#10-usage_logs) |
| 11 | `audit_logs` | Lịch sử thao tác toàn hệ thống | [Xem](#11-audit_logs) |

---

## 1. `tenants`

1 doanh nghiệp = 1 dòng. Không có cột nào liên quan đến Cas ID OAuth (đã loại bỏ thiết kế đó) hay webhook URL riêng (Cas dùng chung 1 webhook URL ở cấp App, định tuyến qua `cas_grants.grant_id`).

```
tenants
├── id                          PK
├── business_name               tự nhập khi đăng ký (form Register), KHÔNG lấy tự động từ Cas
├── matching_threshold          ngưỡng Confidence Score để Auto Match, mặc định 95
├── created_at
└── updated_at
```

**Không có:** `webhook_url_token`, `cas_user_id`, `payos_client_id`, `payos_api_key` — đều đã loại bỏ khỏi thiết kế ở các vòng chỉnh sửa trước.

---

## 2. `users`

> **Lưu ý quan trọng khi code:** Đây là bảng từng bị định nghĩa khác nhau ở 2 chỗ trong tài liệu cũ. Định nghĩa dưới đây là bản **chuẩn, đã gộp đầy đủ** — dùng bản này.

```
users
├── id                          PK
├── tenant_id                   FK → tenants.id, NULLABLE (NULL nếu role = cas_partner)
├── name
├── email                       unique
├── password_hash                bcrypt — đăng nhập email/password thuần, KHÔNG qua Cas ID
├── role                         enum: cas_partner / admin / accountant / viewer
├── invited_by                  FK → users.id, NULL nếu là Admin đầu tiên (người đăng ký tenant)
├── invited_at                  NULL nếu là Admin đầu tiên
├── created_at
└── updated_at
```

**Quy tắc tạo user (xem đầy đủ tại `RBAC.md`):**
- Đăng ký tenant mới (`POST /auth/register`) → tự động tạo 1 user với `role = admin`, `invited_by = NULL`
- Admin mời thêm thành viên → tạo user mới với `role` được chọn (`accountant`/`viewer`), `invited_by` = id của Admin mời
- `role = cas_partner` chỉ được tạo thủ công trong DB bởi đội PayPilot, không qua form đăng ký, `tenant_id = NULL`

---

## 3. `cas_grants`

Mỗi dòng = 1 lần doanh nghiệp liên kết 1 tài khoản ngân hàng qua Cas Link. Bảng quan trọng nhất để routing webhook đúng tenant.

```
cas_grants
├── id                          PK
├── tenant_id                   FK → tenants.id
├── grant_id                    unique, INDEXED — trả về từ Cas lúc /grant/exchange
│                                ← DÙNG ĐỂ TRA TENANT khi Cas Balance Hook gửi webhook về
├── access_token                encrypted — dùng gọi các API Cas khác (vd: GET /identity)
├── account_number               số tài khoản ngân hàng đã liên kết
├── bank_name                   lấy từ GET /identity
├── status                       enum: active / invalidated
└── linked_at
```

> **Vì sao `grant_id` phải có index:** Mọi webhook Cas gửi về đều query bảng này bằng `grant_id` để tìm `tenant_id` tương ứng — đây là query chạy real-time mỗi khi có giao dịch, bắt buộc phải nhanh.

---

## 4. `customers`

Khách hàng cuối của doanh nghiệp — ví dụ học viên của trung tâm Anh ngữ, bệnh nhân của phòng khám.

```
customers
├── id                          PK
├── tenant_id                   FK → tenants.id
├── name
├── phone
├── email
├── account_numbers              array — số tài khoản ngân hàng của khách (nếu biết trước)
├── embedding                    vector — pgvector, dùng cho AI Customer Matching
├── created_at
└── updated_at
```

---

## 5. `invoices`

```
invoices
├── id                          PK
├── tenant_id                   FK → tenants.id
├── customer_id                 FK → customers.id
├── invoice_code                 unique trong phạm vi tenant (vd: HD1025)
├── amount
├── paid_amount                  cộng dồn mỗi khi có invoice_matches mới
├── status                       enum: unpaid / partial / paid / overpaid
├── due_date
├── embedding                    vector — pgvector, dùng cho AI Transaction Matching
├── created_at
└── updated_at
```

---

## 6. `transactions`

Giao dịch ngân hàng nhận được từ Cas Balance Hook webhook.

```
transactions
├── id                          PK
├── tenant_id                   tra ra từ cas_grants.grant_id lúc nhận webhook, lưu lại để query nhanh
├── grant_id                    copy từ payload webhook — dùng để trace lại đã tra tenant qua grant nào
├── transaction_id              unique — transaction.id từ payload Cas Balance Hook (idempotency key)
├── amount
├── sender_account
├── receiver_account
├── content                      nội dung chuyển khoản (khách tự gõ)
├── transaction_date
├── status                       enum: pending / matched / review / skipped
├── confidence_score              kết quả AI Matching, 0–100
├── created_at
└── updated_at
```

**Không có cột `source`** — đã bỏ vì chỉ còn 1 nguồn giao dịch duy nhất (Cas Balance Hook), không còn PayOS cho nghiệp vụ nữa.

---

## 7. `invoice_matches`

Bảng trung gian (many-to-many) giữa `transactions` và `invoices` — vì 1 giao dịch có thể trả gộp nhiều hóa đơn, và 1 hóa đơn có thể được trả qua nhiều giao dịch (Partial Payment).

```
invoice_matches
├── id                          PK
├── transaction_id               FK → transactions.id
├── invoice_id                  FK → invoices.id
├── matched_amount                số tiền của giao dịch này được tính cho hóa đơn này
├── confidence_score              điểm AI Matching tại thời điểm ghép
├── match_type                   enum: auto / manual
├── matched_by                   'ai' hoặc user_id (nếu Human Review xác nhận thủ công)
└── created_at
```

---

## 8. `subscriptions`

Gói dịch vụ hiện tại của 1 tenant — luôn chỉ có **1 dòng active** cho mỗi tenant tại 1 thời điểm.

```
subscriptions
├── id                          PK
├── tenant_id                   FK → tenants.id
├── plan                         enum: free / starter / pro / enterprise
├── price_per_month
├── transaction_quota             số giao dịch tối đa/tháng theo gói
├── transaction_used_this_cycle  reset về 0 đầu mỗi chu kỳ (BullMQ cron job hàng ngày)
├── overage_price_per_transaction  phí mỗi giao dịch vượt quota (NULL nếu Enterprise không giới hạn)
├── status                       enum: active / suspended / cancelled
├── started_at
├── current_cycle_start
└── current_cycle_end
```

> Xem đầy đủ bảng giá 4 gói, cách đếm "1 giao dịch" để tính phí, và code mẫu check quota tại `RBAC.md` mục [Cách đếm "giao dịch" để tính phí](./RBAC.md#cách-đếm-giao-dịch-để-tính-phí).

---

## 9. `payment_orders`

Lịch sử thanh toán mỗi khi tenant nâng cấp gói qua PayOS. **Lưu ý:** PayOS ở đây phục vụ Billing (PayPilot thu phí tenant), khác hẳn với PayOS từng cân nhắc cho nghiệp vụ (đã loại bỏ).

```
payment_orders
├── id                          PK
├── tenant_id                   FK → tenants.id
├── order_code                  unique — dạng "UPG-{tenant_id}-{timestamp}"
│                                ← dùng để định tuyến khi PayOS callback (PayOS chỉ trả lại order_code đã gửi)
├── target_plan                  enum: starter / pro / enterprise
├── amount
├── status                       enum: pending / paid / expired / failed
├── paid_at
└── created_at
```

---

## 10. `usage_logs`

Log số liệu để Cas Partner xem được thống kê usage trên Partner Dashboard, tách biệt khỏi `subscriptions.transaction_used_this_cycle` (vốn chỉ track theo chu kỳ hiện tại, không giữ lịch sử dài hạn).

```
usage_logs
├── id                          PK
├── tenant_id                   FK → tenants.id
├── metric                       enum: transaction_count / ai_matching_calls / storage_mb
├── value
└── recorded_at
```

---

## 11. `audit_logs`

Lịch sử thao tác toàn hệ thống — cả hành động của AI lẫn của người dùng, phục vụ truy vết và compliance.

```
audit_logs
├── id                          PK
├── tenant_id                   FK → tenants.id (NULL nếu action ở cấp hệ thống, do Cas Partner thực hiện)
├── entity_type                  vd: 'transaction', 'invoice', 'tenant', 'user'
├── entity_id
├── action                       vd: 'auto_matched', 'confirmed', 'suspended', 'role_changed'
├── actor                        user_id hoặc 'system' (nếu AI tự động thực hiện)
├── before_state                 JSON
├── after_state                  JSON
└── created_at
```

---

## ⚠️ Những điểm cần lưu ý khi viết Prisma schema thật

1. **Index bắt buộc:** `cas_grants.grant_id`, `transactions.transaction_id`, `users.email`, `invoices.invoice_code` (composite unique với `tenant_id`), `payment_orders.order_code` — đây đều là các cột dùng để tra cứu real-time, thiếu index sẽ chậm khi data lớn.

2. **Soft delete:** `customers`, `invoices` nên có cột `deleted_at` (nullable) thay vì xóa cứng — đã nhắc trong README phần Database Design Principles nhưng chưa thể hiện rõ trong các bảng ở trên, cần bổ sung khi viết Prisma schema.

3. **pgvector extension:** `customers.embedding` và `invoices.embedding` cần PostgreSQL bật extension `pgvector` trước khi migrate — xem `.env.example` và README mục Technology Stack.

4. **Encrypted fields:** `cas_grants.access_token` phải mã hóa trước khi lưu (không lưu plaintext) — dùng `@Encrypted()` decorator tùy chọn hoặc mã hóa ở tầng service trước khi insert.

5. **Cascade behavior:** Khi xóa 1 `tenant` (hiếm khi xảy ra thật, nhưng cần định nghĩa rõ) — `users`, `cas_grants`, `customers`, `invoices`, `transactions`, `subscriptions` nên `CASCADE`, còn `audit_logs` nên giữ lại (set `tenant_id = NULL`) để vẫn truy vết được lịch sử.

---

## 🔗 Tài liệu liên quan

- Giải thích nghiệp vụ từng bảng trong bối cảnh thực tế — xem `USER_JOURNEY.md`
- Chi tiết phân quyền theo role cho từng API động vào các bảng này — xem `RBAC.md`
- API endpoints sử dụng các bảng này — xem `PayPilot_README.md` mục API Design
