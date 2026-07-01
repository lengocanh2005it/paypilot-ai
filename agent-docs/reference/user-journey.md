# 🧭 PayPilot AI — User Journey (Hành trình người dùng thực tế)

> Tài liệu này mô tả toàn bộ hành trình của một doanh nghiệp từ lúc đăng ký PayPilot AI cho đến khi sử dụng hàng ngày — giúp hình dung rõ vai trò của từng bên (PayPilot, Cas, doanh nghiệp) trong hệ thống.

---

## 🗺️ Tổng quan 4 giai đoạn

```
Giai đoạn 1        Giai đoạn 2         Giai đoạn 3          Giai đoạn 4
Đăng ký        →   Onboarding     →   Sử dụng hàng ngày →  Nâng cấp gói
& Đăng nhập         (1 lần)            (AI xử lý tự động,    (khi hết quota
(PayPilot tự        (liên kết NH        kế toán review)       Free, qua
quản lý)            qua Cas Link)                             PayOS billing)
```

---

## Giai đoạn 1 — Đăng ký & Đăng nhập PayPilot

Đây là phần **PayPilot tự quản lý hoàn toàn**, không phụ thuộc Cas.

```
Anh A — chủ trung tâm Anh ngữ ABC, nghe nói đến PayPilot
        │
        ▼
Vào web PayPilot → bấm "Đăng ký"
        │
        ▼
Điền form: Tên doanh nghiệp, Email, Mật khẩu
        │
        ▼
POST /api/v1/auth/register
→ Backend tạo:
  - 1 tenant mới (trung tâm Anh ngữ ABC)
  - 1 user đầu tiên (anh A) với role = admin
        │
        ▼
Đăng nhập ngay (hoặc verify email tùy thiết kế)
        │
        ▼
POST /api/v1/auth/login → nhận JWT Access Token + Refresh Token
        │
        ▼
Vào thẳng màn hình Onboarding
```

Những lần sau, anh A chỉ cần gõ email + mật khẩu để vào — giống hệt bất kỳ web SaaS bình thường nào (Notion, Shopee Seller Center...). Không có khái niệm "đăng nhập bằng Cas ID" ở bước này.

---

## Giai đoạn 2 — Onboarding: liên kết ngân hàng thật

Đây là chỗ **Cas SDK** vào cuộc — chỉ xảy ra 1 lần (hoặc khi muốn liên kết thêm tài khoản ngân hàng khác).

```
Anh A ở màn hình Onboarding, bấm "Liên kết tài khoản ngân hàng"
        │
        ▼
PayPilot Backend gọi POST /grant/token
(dùng x-client-id / x-secret-key của PayPilot, lấy từ Cas Console)
        │
        ▼
Mở Cas Link (popup/iframe do Cas cung cấp)
        │
        ▼
Anh A đăng nhập Internet Banking NGAY TRONG ĐÓ
(môi trường sandbox dùng tài khoản demo:
 username: bankusrdemo1 / password: soproud / OTP: 123456)
        │
        ▼
Cas Link trả về publicToken qua redirectUri
        │
        ▼
PayPilot Backend gọi POST /grant/exchange
→ đổi publicToken lấy accessToken
        │
        ▼
Gọi GET /identity → lấy tên ngân hàng, số tài khoản
→ lưu vào bảng cas_grants
        │
        ▼
Hiển thị: "✅ Đã liên kết Vietcombank - STK 1234567890"
```

Sau bước này, anh A **không cần làm gì thêm** ở phía Cas nữa. Webhook nhận giao dịch là **1 URL chung cho toàn bộ App PayPilot** (đã được team PayPilot cấu hình sẵn từ trước trên Cas Developer Console, không phải riêng cho từng doanh nghiệp) — hệ thống tự nhận diện đúng doanh nghiệp nhờ `grantId` được lưu lại lúc anh A liên kết ngân hàng ở bước trên.

---

## Giai đoạn 3 — Sử dụng hàng ngày

Đây là phần trả lời "khách hàng của Cas dùng PayPilot AI như thế nào trong thực tế".

### Doanh nghiệp thu tiền học viên bằng cách nào?

Trước khi vào ví dụ cụ thể, cần hiểu anh A không dùng cổng thanh toán nào cả — chỉ dùng **QR ngân hàng công khai** (chuẩn VietQR) chứa số tài khoản đã liên kết ở Giai đoạn 2:

```
Anh A vào Invoice → bấm "Xem QR thanh toán"
        │
        ▼
PayPilot sinh QR VietQR (chứa STK Vietcombank đã liên kết)
        │
        ▼
Anh A in QR dán tại quầy, hoặc gửi ảnh QR qua Zalo cho học viên
        │
        ▼
Học viên quét QR bằng app ngân hàng bất kỳ → tự gõ nội dung → chuyển khoản
```

### Trường hợp 1 — Giao dịch rõ ràng (AI tự xử lý)

```
Học viên Nguyễn Văn B chuyển khoản học phí
nội dung: "TT hoc phi thang 1 Nguyen Van B"
        │
        ▼
Cas phát hiện biến động số dư → tự động POST webhook
về URL chung của App (kèm grantId trong payload)
        │
        ▼
PayPilot tra grantId → xác định đúng tenant ABC
        │
        ▼
PayPilot nhận, chạy AI Matching Pipeline
        │
        ▼
Confidence 96% → tự động ghép với
Hóa đơn #1025 (học phí tháng 1 - Nguyễn Văn B)
        │
        ▼
Anh A / kế toán mở Dashboard
→ thấy giao dịch mới đã tự "Matched" ✅
→ không cần làm gì cả
```

### Trường hợp 2 — Giao dịch không rõ ràng (cần người xác nhận)

```
Confidence chỉ đạt 60% (vd: nội dung chuyển khoản mơ hồ)
        │
        ▼
Giao dịch vào "Hàng chờ xét duyệt" (Human Review Queue)
        │
        ▼
Kế toán mở queue, xem AI gợi ý hóa đơn + lý do (AI Explanation)
        │
        ▼
Bấm "Xác nhận" (nếu đúng) hoặc "Chọn hóa đơn khác" (nếu sai)
        │
        ▼
Xong trong vài giây — thay vì 5 phút dò sao kê thủ công
```

### So sánh trước và sau khi dùng PayPilot

| | Trước (thủ công) | Sau (dùng PayPilot) |
|---|---|---|
| Đối soát 1 giao dịch rõ ràng | ~2-3 phút dò sao kê | Tức thời, tự động |
| Giao dịch nội dung mơ hồ | Tra cứu, gọi điện hỏi khách | Xem gợi ý AI, xác nhận trong vài giây |
| Theo dõi công nợ | Mở Excel thủ công | Dashboard cập nhật real-time |
| Cuối tháng tổng hợp báo cáo | Vài giờ làm tay | Xuất Excel 1 click |

---

## Giai đoạn 4 — Nâng cấp gói (khi hết quota Free)

Sau vài tháng dùng thử, trung tâm Anh ngữ ABC phát triển, vượt quá 50 giao dịch/tháng của gói Free. Đây là lúc anh A trả phí cho PayPilot — **khác hoàn toàn** với việc học viên trả tiền cho anh A ở Giai đoạn 3.

```
Anh A nhận thông báo: "Đã hết quota tháng này (50/50 giao dịch)"
        │
        ▼
Vào Settings → Billing → thấy bảng so sánh 4 gói
        │
        ▼
Bấm "Nâng cấp lên Pro — 799.000đ/tháng (2.000 giao dịch)"
        │
        ▼
PayPilot tạo Payment Link qua PayOS
(đây là PayOS account CỦA PAYPILOT, không phải của anh A)
        │
        ▼
Hiện QR thanh toán ngay trong Dialog
        │
        ▼
Anh A quét QR bằng app ngân hàng cá nhân/công ty, chuyển 799.000đ
        │
        ▼
PayOS gửi webhook callback về PayPilot
        │
        ▼
PayPilot tự động kích hoạt gói Pro, reset quota
        │
        ▼
Anh A thấy thông báo "Nâng cấp thành công!" — tiếp tục dùng bình thường
```

> **Phân biệt quan trọng:** Giai đoạn 3 dùng QR ngân hàng công khai (không qua cổng thanh toán nào) để học viên trả tiền cho doanh nghiệp. Giai đoạn 4 dùng PayOS (cổng thanh toán thật) để doanh nghiệp trả tiền cho PayPilot. Hai luồng tiền hoàn toàn tách biệt, không liên quan đến nhau.

---

## 👥 Vai trò từng bên trong hệ sinh thái

| Ai | Vai trò | Tần suất tương tác |
|---|---|---|
| **Chủ doanh nghiệp (Admin)** | Đăng ký, liên kết ngân hàng, mời thêm kế toán, xem báo cáo tổng quan, nâng cấp gói khi cần | 1 lần lúc đầu, sau đó thỉnh thoảng xem báo cáo + nâng cấp gói |
| **Kế toán (Accountant)** | Đăng nhập hàng ngày, xử lý Human Review, tạo/quản lý hóa đơn, theo dõi công nợ | Hàng ngày |
| **Cas** | Hạ tầng nền — đọc biến động số dư ngân hàng, tự động bắn webhook về PayPilot | Chạy ngầm, không ai thấy |
| **PayPilot AI** | Lớp ứng dụng trung gian — nhận giao dịch từ Cas, dùng AI ghép với hóa đơn, hiển thị cho kế toán xử lý | Real-time |
| **PayOS** | Cổng thanh toán cho riêng việc thu phí dịch vụ (PayPilot là bên bán, doanh nghiệp là bên mua gói) — không liên quan đến giao dịch nghiệp vụ của doanh nghiệp | Khi doanh nghiệp nâng cấp/gia hạn gói |
| **Cas Partner** (nhân sự Cas/CASSO) | Theo dõi tổng quan các doanh nghiệp đang dùng PayPilot, xem doanh thu PayPilot thu được, khóa/mở tài khoản doanh nghiệp vi phạm, hỗ trợ kỹ thuật | Khi cần hỗ trợ hoặc theo dõi vận hành |

---

## 💡 Điểm mấu chốt cần nhớ

> Với khách hàng cuối (chủ doanh nghiệp, kế toán), **Cas gần như "vô hình"** sau bước Onboarding. Họ chỉ cảm nhận mình đang dùng PayPilot — không thấy được lớp hạ tầng Cas phía sau, tương tự cách người dùng Shopee không nhìn thấy VNPay/Payoo đứng sau xử lý thanh toán.

Điều này cũng lý giải tại sao kiến trúc tách bạch 2 cơ chế (đăng nhập PayPilot ≠ liên kết ngân hàng qua Cas) là đúng đắn — người dùng không cần hiểu hay quan tâm đến Cas, họ chỉ cần trải nghiệm mượt mà trên PayPilot.

> **Hai dòng tiền hoàn toàn tách biệt, đừng nhầm lẫn:**
> - **Dòng tiền nghiệp vụ** (Giai đoạn 3): học viên/khách hàng cuối → doanh nghiệp, qua QR ngân hàng công khai, AI Matching xử lý.
> - **Dòng tiền dịch vụ** (Giai đoạn 4): doanh nghiệp → PayPilot, qua PayOS, để trả phí sử dụng phần mềm.
>
> PayPilot không bao giờ "chạm" vào dòng tiền nghiệp vụ — chỉ đọc dữ liệu giao dịch qua Cas để đối soát, không giữ tiền hộ ai. PayPilot chỉ thực sự nhận tiền ở dòng tiền dịch vụ.

---

## 🔗 Tài liệu liên quan

- Chi tiết kỹ thuật Cas Grant/Link flow — xem `PayPilot_README.md` mục [Authentication & Liên kết ngân hàng](./PayPilot_README.md#authentication--liên-kết-ngân-hàng--2-cơ-chế-tách-biệt)
- Chi tiết phân quyền Admin/Accountant/Viewer/Cas Partner — xem `RBAC.md`
- Chi tiết bảng giá, cách tính phí, flow PayOS billing — xem `RBAC.md` mục [Pricing Model](./RBAC.md#-pricing-model--paypilot-tính-phí-doanh-nghiệp-như-thế-nào)
- Chi tiết giao diện từng màn hình — xem `UI_DESIGN.md`
- Kế hoạch triển khai theo sprint — xem `SPRINT_PLAN.md`
- Toàn bộ schema database, ERD — xem `DATABASE_SCHEMA.md`
