export interface KnowledgeSection {
  id: string;
  title: string;
  keywords: string[];
  content: string;
  /** When false, Copilot may still read this section but UI won't cite it as a public source. */
  citeInSources?: boolean;
}

export const CASSO_KNOWLEDGE: KnowledgeSection[] = [
  {
    id: 'casso_overview',
    title: 'Casso là gì?',
    keywords: ['casso', 'casso là gì', 'casso là công ty', 'bankhub', 'open banking', 'fintech'],
    content: `**Casso** (casso.vn) là công ty fintech Việt Nam chuyên cung cấp hạ tầng ngân hàng mở (open banking) cho doanh nghiệp.

**X-Cash AI** là **sản phẩm do Casso phát triển** — không phải công ty độc lập hay đối tác tích hợp bên ngoài. Mục đích: giúp SME Việt Nam **tự động định khoản giao dịch ngân hàng** theo chuẩn **TT133**, giảm thời gian nhập liệu thủ công và tổng hợp báo cáo thu chi real-time.

X-Cash AI được xây dựng trên nền tảng hạ tầng Casso:
- Nhận giao dịch real-time qua **Cas Balance Hook**
- Mỗi doanh nghiệp liên kết tài khoản ngân hàng qua **Cas Link** (Cài đặt → Ngân hàng)

Casso còn cung cấp các sản phẩm hạ tầng khác (ngoài phạm vi X-Cash AI):
- **payOS**: Cổng thanh toán online, tạo link/QR thanh toán
- **Casso Flow**: Tự động hóa quy trình tài chính
- **Cas ID**: Định danh ngân hàng, xác minh chủ tài khoản`,
  },
  {
    id: 'casso_products',
    title: 'Các sản phẩm của Casso',
    keywords: [
      'sản phẩm casso',
      'cas link',
      'cas balance hook',
      'payos',
      'casso flow',
      'cas id',
      'tính năng casso',
      'dịch vụ casso',
    ],
    content: `Casso (casso.vn) có các sản phẩm sau:

**Cas Link** — Liên kết tài khoản ngân hàng
- Hỗ trợ hầu hết ngân hàng lớn tại Việt Nam (Vietcombank, BIDV, Techcombank, MB, VPBank, ACB, ...)
- Cho phép đọc số dư, lịch sử giao dịch qua API
- Xác thực qua luồng OAuth (không lưu mật khẩu ngân hàng)

**Cas Balance Hook** — Webhook giao dịch real-time
- Đẩy dữ liệu giao dịch ngay khi phát sinh (thường trong vài giây)
- X-Cash AI dùng sản phẩm này để nhận GD tự động

**payOS** — Cổng thanh toán
- Tạo link thanh toán, QR code
- Hỗ trợ chuyển khoản ngân hàng, ví điện tử
- Thông dụng cho thương mại điện tử, đặt hàng online

**Casso Flow** — Tự động hóa tài chính
- Tạo rule: khi có GD thỏa điều kiện → thực hiện hành động (gửi email, gọi webhook, ...)
- Phù hợp cho reconciliation tự động, xử lý đơn hàng

**Cas ID** — Định danh ngân hàng
- Xác minh thông tin chủ tài khoản ngân hàng theo số TK
- Dùng cho KYC, xác thực trước khi chuyển tiền`,
  },
  {
    id: 'casso_how_to_link',
    title: 'Cách liên kết ngân hàng qua Cas Link',
    keywords: [
      'liên kết ngân hàng',
      'cas link',
      'kết nối ngân hàng',
      'cài đặt ngân hàng',
      'how to link',
      'add bank',
    ],
    content: `Để liên kết ngân hàng với X-Cash AI (qua Cas Link):

1. **Admin** vào **Cài đặt → Ngân hàng** (đường dẫn: /settings)
2. Nhấn **Liên kết ngân hàng** → hoàn tất luồng **Cas Link** (xác thực với ngân hàng qua Casso, không cần nhập mật khẩu NH)
3. Sau khi thành công, hệ thống lưu thông tin liên kết (cas_grants) và bắt đầu nhận giao dịch tự động qua **Cas Balance Hook**

Lưu ý:
- Chỉ role **Admin** mới có quyền liên kết/hủy liên kết ngân hàng
- Có thể liên kết nhiều tài khoản ngân hàng từ các NH khác nhau
- Nếu chưa qua bước onboarding, vào /onboarding để bắt đầu`,
  },
  {
    id: 'casso_missing_transactions',
    title: 'Không thấy giao dịch từ ngân hàng',
    keywords: [
      'mất giao dịch',
      'không thấy giao dịch',
      'giao dịch không vào',
      'missing transactions',
      'gd không hiển thị',
      'thiếu giao dịch',
    ],
    content: `Nếu không thấy giao dịch từ ngân hàng, kiểm tra lần lượt:

1. **Đã liên kết NH chưa?** — Vào Cài đặt → Ngân hàng xem trạng thái. Nếu chưa liên kết → thực hiện Cas Link
2. **GD có trên sao kê NH nhưng chưa vào X-Cash?** — Có thể Casso chưa push về; thử kiểm tra lại liên kết hoặc chờ vài phút. Casso thường push trong 5-30 giây sau khi GD phát sinh
3. **GD từ Import Excel** không đi qua Casso — đây là nguồn riêng. Vào tab Giao dịch, lọc theo nguồn **Ngân hàng** (source=cas) để phân biệt với GD import
4. **Subscription bị tạm dừng hoặc hết quota** — kiểm tra trạng thái gói dịch vụ trong Cài đặt
5. **Liên kết bị mất hoặc expired** — đôi khi ngân hàng thu hồi quyền truy cập, cần re-authorize qua Cas Link`,
  },
  {
    id: 'casso_webhook',
    title: 'Webhook Casso & Cas Balance Hook hoạt động thế nào',
    keywords: [
      'webhook',
      'cas balance hook',
      'webhook casso',
      'webhook là gì',
      'real-time',
      'gd real time',
    ],
    content: `X-Cash AI nhận giao dịch ngân hàng qua **Cas Balance Hook** (webhook real-time):

- X-Cash AI dùng **một URL webhook chung** cho toàn hệ thống: \`POST /api/v1/webhook/cas\`
- Casso gửi payload giao dịch về URL này với trường **grantId** để X-Cash định tuyến đến đúng doanh nghiệp (tenant)
- Không cần cấu hình webhook riêng cho từng doanh nghiệp — liên kết NH là đủ
- Hệ thống có cơ chế idempotency (Redis, theo transaction.id) để tránh xử lý trùng khi Casso retry

Luồng xử lý sau khi nhận GD:
1. Webhook nhận GD → validate chữ ký → route đến đúng tenant
2. AI phân loại định khoản (gpt-4o-mini + pgvector few-shot)
3. Nếu độ tin cậy ≥ 85% → tự động approve
4. Nếu < 85% → đưa vào hàng đợi Human Review cho kế toán xét duyệt`,
  },
  {
    id: 'casso_contact',
    title: 'Thông tin liên hệ CASSO',
    keywords: [
      'liên hệ casso',
      'contact casso',
      'hotline casso',
      'số điện thoại casso',
      'email casso',
      'giờ làm việc casso',
      'working hours casso',
      'hợp tác casso',
      'hỗ trợ casso',
      'tổng đài casso',
    ],
    content: `**Công ty TNHH CASSO**
- **Tổng đài hỗ trợ**: **1900 8144**
- **Điện thoại**: **0974 792 484**
- **Email**: **support@casso.vn**
- **Website**: **https://casso.vn**
- **Giờ làm việc**: **8h00 – 17h30, Thứ Hai – Thứ Sáu**
- **Địa chỉ**: I.102D, Nhà A, Khu Công Nghệ Phần Mềm, ĐHQG TP.HCM, Phường Linh Xuân, TP Thủ Đức, TP HCM
- **MST**: 0316794479

**Lưu ý**: CASSO chỉ hỗ trợ trong giờ hành chính (**8h-17h30, T2-T6**). Ngoài khung giờ này, phản hồi từ tổng đài có thể chậm hơn.`,
  },
];
