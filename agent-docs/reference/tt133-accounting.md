# TT133 — Giải thích cho Developer

> Tài liệu này giải thích Thông tư 133 theo góc nhìn kỹ thuật: đủ để hiểu tại sao code làm vậy, không cần học kế toán.

---

## TT133 là gì — 1 câu

**Thông tư 133/2016/TT-BTC** = bộ quy tắc do Bộ Tài chính VN ban hành, quy định cách SME ghi chép mọi giao dịch tài chính theo chuẩn kép (double-entry): mỗi giao dịch bắt buộc phải ghi đúng 2 tài khoản — 1 bên Nợ, 1 bên Có.

---

## Kế toán kép (double-entry) là gì

Mọi giao dịch tiền đều có 2 mặt. Ví dụ:

| Sự kiện | Bên Nợ (tăng/giảm) | Bên Có (tăng/giảm) |
|---|---|---|
| Khách chuyển tiền vào NH | `112` Tiền gửi NH **tăng** | `131` Phải thu KH **giảm** |
| Mua văn phòng phẩm bằng tiền NH | `642` Chi phí QL **tăng** | `112` Tiền gửi NH **giảm** |
| Trả lương nhân viên | `334` Phải trả NV **giảm** | `112` Tiền gửi NH **giảm** |
| Nhận doanh thu dịch vụ | `112` Tiền gửi NH **tăng** | `511` Doanh thu **tăng** |

Luật: **Tổng Nợ = Tổng Có** — nếu lệch là sai.

TT133 quy định: loại nghiệp vụ nào thì được dùng cặp TK nào. Không được tự ý ghép tùy tiện.

---

## Hệ thống tài khoản TT133 — các nhóm chính

TT133 có ~60–70 tài khoản, chia theo nhóm đầu số:

| Nhóm | Loại | Ví dụ |
|---|---|---|
| `1xx` | Tài sản ngắn hạn | `111` Tiền mặt, `112` Tiền gửi NH, `131` Phải thu KH |
| `2xx` | Tài sản dài hạn | `211` TSCĐ hữu hình, `242` Chi phí trả trước |
| `3xx` | Nợ phải trả | `331` Phải trả NCC, `334` Phải trả NV, `333` Thuế |
| `4xx` | Vốn chủ sở hữu | `411` Vốn đầu tư, `421` LNST chưa phân phối |
| `5xx` | Doanh thu | `511` Doanh thu bán hàng/dịch vụ |
| `6xx` | Chi phí | `632` Giá vốn, `641` Chi phí bán hàng, `642` Chi phí QL DN |
| `7xx` | Thu nhập khác | `711` Thu nhập khác |
| `8xx` | Chi phí khác / thuế | `811` Chi phí khác, `821` Chi phí thuế TNDN |
| `9xx` | Tài khoản xác định kết quả | `911` Xác định kết quả kinh doanh |

> **TT133 vs TT200:** TT200 dành cho DN lớn, có thêm nhiều TK trung gian hơn (~100+ TK). X-Cash AI chỉ hỗ trợ TT133 (SME).

---

## Luồng trong X-Cash AI

```
Giao dịch NH (webhook Cas)
        ↓
  AI đọc mô tả GD
  ("Chuyen tien thu phi dich vu thang 7")
        ↓
  OpenAI gpt-4o-mini + few-shot (pgvector)
  → trả về: { debitAccount: "112", creditAccount: "511", confidence: 0.92 }
        ↓
  confidence ≥ 85%?
  ├── Có → auto-classify, status = "classified"
  └── Không → Human Review queue, status = "review"
        ↓
  Kế toán xem lại (nếu cần), xác nhận hoặc sửa TK Nợ/Có
```

---

## File quan trọng trong code

| File | Vai trò |
|---|---|
| `apps/backend/src/modules/chart-of-accounts/tt133-seed.ts` | ~60 tài khoản TT133, seed vào DB khi tenant đăng ký |
| `apps/backend/src/modules/ai/classification.service.ts` | Gọi OpenAI, build prompt kèm danh mục TK + few-shot examples |
| `apps/backend/src/modules/ai/embedding.service.ts` | pgvector: tìm 5 GD phân loại đúng gần nhất của tenant để làm few-shot |
| `apps/backend/src/modules/classification/classification.service.ts` | Human Review: confirm / correct (sửa TK) / skip |
| `apps/backend/prisma/schema.prisma` | `chart_of_accounts` table + `transaction_classifications` table |

---

## Những gì dev KHÔNG cần lo

- Tại sao TK này ghi Nợ chứ không ghi Có → đó là nghiệp vụ kế toán, AI + kế toán xử lý
- Định nghĩa chính xác từng TK → xem `tt133-seed.ts` hoặc hỏi kế toán
- Số dư đầu kỳ / cuối kỳ / bảng cân đối → X-Cash AI không làm phần này (chỉ phân loại GD real-time)

---

## Câu hỏi thường gặp

**Q: AI sai thì sao?**
A: Confidence < 85% → vào Human Review. Kế toán sửa TK Nợ/Có → kết quả đúng được lưu vào DB → làm few-shot cho lần sau (AI tự học theo tenant).

**Q: Tenant có thể thêm TK tùy chỉnh không?**
A: Có — `POST /accounts` cho phép thêm TK ngoài seed mặc định. TK tự thêm vẫn dùng được trong phân loại.

**Q: TT133 có bị thay thế không?**
A: Hiện vẫn hiệu lực cho SME. DN lớn dùng TT200. X-Cash AI chỉ target SME nên chỉ cần TT133.
