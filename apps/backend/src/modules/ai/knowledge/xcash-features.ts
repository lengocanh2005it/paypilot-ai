import type { KnowledgeSection } from './casso';

export const XCASH_FEATURES_KNOWLEDGE: KnowledgeSection[] = [
  {
    id: 'xcash_overview',
    title: 'X-Cash AI là gì? Có những tính năng gì?',
    keywords: [
      'x-cash ai',
      'xcash',
      'x-cash là gì',
      'tính năng',
      'phần mềm kế toán',
      'ai copilot',
      'bạn là ai',
      'bạn làm được gì',
    ],
    content: `**X-Cash AI** là sản phẩm do **Casso** phát triển — nền tảng kế toán thông minh cho doanh nghiệp vừa và nhỏ (SME) Việt Nam. Mục đích: tự động định khoản giao dịch ngân hàng theo chuẩn **TT133**, giảm nhập liệu thủ công và tổng hợp báo cáo thu chi real-time.

X-Cash AI dùng hạ tầng ngân hàng mở của Casso (Cas Link + Cas Balance Hook) kết hợp AI định khoản.

Các tính năng chính:
- **Nhận giao dịch real-time**: Kết nối ngân hàng qua Cas Link, nhận GD tự động qua Cas Balance Hook
- **AI định khoản tự động**: Phân loại giao dịch thành bút toán kế toán (Nợ/Có) dùng gpt-4o-mini + pgvector
- **Human Review**: Giao dịch AI không chắc chắn (<85%) → kế toán xét duyệt tay
- **Import Excel**: Nhập giao dịch từ file Excel (sao kê ngân hàng tải về)
- **Báo cáo thu chi**: Tổng hợp doanh thu, chi phí, lãi/lỗ theo tháng
- **AI Copilot**: Trợ lý AI — vừa hỏi đáp tài chính/kế toán, vừa **tra cứu số liệu thật** (doanh thu, chi phí, GD…) và **đề xuất thao tác** (duyệt/sửa định khoản qua thẻ hành động trong chat). Chi tiết: xem mục AI Copilot.`,
  },
  {
    id: 'xcash_human_review',
    title: 'Human Review — Xét duyệt giao dịch',
    keywords: [
      'human review',
      'xét duyệt',
      'chờ duyệt',
      'review queue',
      'kế toán duyệt',
      'giao dịch chờ',
      'approve',
      'reject',
    ],
    content: `**Human Review** là quy trình kế toán xét duyệt các giao dịch mà AI phân loại với độ tin cậy dưới ngưỡng.

Luồng hoạt động:
1. AI phân loại GD → độ tin cậy **< 85%** → GD vào hàng đợi Human Review (status = review)
2. Kế toán (role: accountant hoặc admin) vào trang Giao dịch → lọc "Chờ duyệt"
3. Xem đề xuất AI, điều chỉnh nếu cần, nhấn **Duyệt** hoặc **Từ chối**
4. Sau khi duyệt → GD được ghi nhận vào sổ kế toán chính thức

**Duyệt qua AI Copilot** (thay cho hoặc bổ sung bước trên):
- Vào **Human Review** (Giao dịch chờ duyệt) → copy **Mã GD** ở cột tương ứng
- Trong **AI Copilot**, nhắn rõ: "Duyệt giao dịch [mã GD]" hoặc tìm GD trước rồi yêu cầu duyệt
- Copilot hiển thị **thẻ đề xuất xác nhận** — bạn kiểm tra và bấm nút xác nhận; hệ thống **chưa** tự ghi nhận cho đến khi bạn bấm
- Muốn **sửa định khoản** (Nợ/Có mới do bạn chỉ định): nêu rõ mã GD + mã TK Nợ + mã TK Có → Copilot hiện thẻ đề xuất sửa, bạn bấm xác nhận
- Chỉ **Admin** và **Accountant** được dùng thao tác duyệt/sửa qua Copilot

Phân quyền:
- **Admin, Accountant**: được duyệt/từ chối GD
- **Viewer**: chỉ xem, không được duyệt

Cấu hình ngưỡng:
- Mặc định: **85%** → tự động approve
- Có thể điều chỉnh trong cài đặt (AI_MATCHING_AUTO_THRESHOLD)`,
  },
  {
    id: 'xcash_import_excel',
    title: 'Import giao dịch từ Excel',
    keywords: [
      'import excel',
      'nhập excel',
      'sao kê',
      'upload file',
      'import giao dịch',
      'excel',
      'file xlsx',
    ],
    content: `X-Cash AI cho phép nhập giao dịch từ file Excel (sao kê ngân hàng tải về từ internet banking):

Cách thực hiện:
1. Vào trang **Giao dịch** → nhấn **Nhập từ Excel**
2. Tải file sao kê từ ngân hàng (định dạng .xlsx hoặc .xls)
3. Hệ thống parse file, hiển thị preview các GD sẽ import
4. Xác nhận → GD được import và AI tự động phân loại định khoản

Lưu ý:
- GD import Excel có **nguồn = "import"** (khác với GD từ Casso = "cas")
- Trong tab Giao dịch, có thể lọc theo nguồn để phân biệt
- Hệ thống check trùng lặp dựa theo ngày, số tiền, nội dung để tránh import 2 lần
- Khuôn dạng file hỗ trợ tùy theo cấu hình của từng ngân hàng; nếu file không nhận được → liên hệ hỗ trợ`,
  },
  {
    id: 'xcash_reports',
    title: 'Báo cáo thu chi — Xem doanh thu, chi phí, lãi/lỗ',
    keywords: [
      'báo cáo',
      'doanh thu',
      'chi phí',
      'lãi lỗ',
      'thu chi',
      'report',
      'tổng hợp',
      'thống kê',
      'tháng này',
      'tháng trước',
    ],
    content: `X-Cash AI cung cấp báo cáo thu chi theo tháng, tổng hợp từ tất cả GD đã được phân loại định khoản:

**Báo cáo tháng** bao gồm:
- **Tổng thu (doanh thu)**: Tổng giá trị GD tiền vào đã phân loại
- **Tổng chi (chi phí)**: Tổng giá trị GD tiền ra đã phân loại
- **Lãi/lỗ thuần**: Tổng thu - Tổng chi
- **Số GD trong kỳ**: Tổng số GD, trong đó có bao nhiêu chờ duyệt
- **Độ chính xác AI**: % GD AI tự động phân loại đúng (auto-approved)

**Top tài khoản phát sinh**: Danh sách TK kế toán có phát sinh nhiều nhất trong tháng

**So sánh tháng**: So sánh thu/chi/lãi-lỗ tháng này vs tháng trước

AI Copilot có thể lấy và phân tích báo cáo này khi bạn hỏi về tình hình tài chính.`,
  },
  {
    id: 'xcash_copilot',
    title: 'AI Copilot — Hỏi đáp, tra cứu dữ liệu & thao tác',
    keywords: [
      'ai copilot',
      'copilot',
      'trợ lý ai',
      'bạn làm được gì',
      'copilot làm gì',
      'thao tác',
      'action',
      'duyệt qua copilot',
      'sửa định khoản copilot',
      'thẻ hành động',
      'action card',
      'lịch sử copilot',
      'hỏi đáp ai',
    ],
    content: `**AI Copilot** không chỉ trả lời lý thuyết — đây là trợ lý tích hợp trong X-Cash AI, có thể làm 3 nhóm việc:

**1. Hỏi đáp & hướng dẫn**
- Giải thích **TT133**, mã tài khoản, khái niệm kế toán
- Hướng dẫn **Casso**, **Cas Link**, liên kết ngân hàng, import Excel, Human Review, gói dịch vụ

**2. Tra cứu dữ liệu thật của doanh nghiệp bạn** (real-time từ hệ thống)
- Tổng **doanh thu / chi phí / lãi-lỗ** tháng, so sánh tháng trước
- **Top tài khoản** phát sinh nhiều nhất
- Số GD **chờ xét duyệt** (Human Review)
- Trạng thái **liên kết ngân hàng**
- **Tìm giao dịch** theo từ khóa nội dung hoặc mã tài khoản
- Tra mã **tài khoản TT133** trong danh mục của doanh nghiệp

**3. Đề xuất thao tác (thẻ hành động trong chat)** — Copilot **không tự ghi** vào hệ thống; bạn phải xem thẻ và bấm nút xác nhận:
- **Đề xuất xác nhận (duyệt) giao dịch**: khi bạn yêu cầu rõ ràng duyệt một GD cụ thể (cần **mã GD** — copy từ cột Mã GD ở trang Human Review hoặc sau khi Copilot tìm giúp GD đó)
- **Đề xuất sửa định khoản**: khi bạn nêu rõ mã GD + mã TK **Nợ** mới + mã TK **Có** mới (do bạn chỉ định, Copilot không tự bịa định khoản)
- Chỉ **Admin** và **Accountant** dùng được hai thao tác trên; **Viewer** chỉ hỏi đáp và xem số liệu

**Lịch sử & quota chat**
- Xem lại cuộc chat cũ: **Cài đặt → Lịch sử Copilot** (hoặc sidebar Copilot)
- Mỗi gói có giới hạn **lượt gửi câu hỏi Copilot**/tháng (riêng với quota xử lý giao dịch ngân hàng) — xem trong **Cài đặt → Gói dịch vụ**

Ví dụ câu hỏi:
- "Doanh thu tháng này bao nhiêu?"
- "Có bao nhiêu giao dịch chờ duyệt?"
- "Duyệt giao dịch [dán mã GD]"
- "Sửa giao dịch [mã GD] thành Nợ 642 Có 112"`,
  },
  {
    id: 'xcash_rbac',
    title: 'Phân quyền trong X-Cash AI (RBAC)',
    citeInSources: false,
    keywords: [
      'phân quyền',
      'role',
      'quyền',
      'admin',
      'accountant',
      'viewer',
      'kế toán',
      'quản trị',
      'rbac',
      'người dùng',
    ],
    content: `X-Cash AI có 3 role chính cho người dùng trong doanh nghiệp:

**Admin**
- Toàn quyền: cấu hình, quản lý người dùng, liên kết ngân hàng
- Được duyệt/từ chối giao dịch, xem báo cáo, dùng AI Copilot
- Quản lý gói dịch vụ (billing)

**Accountant (Kế toán)**
- Xem và duyệt/từ chối giao dịch (Human Review)
- Xem báo cáo thu chi, dùng AI Copilot
- Không được cấu hình hệ thống hay quản lý user

**Viewer (Người xem)**
- Chỉ xem giao dịch và báo cáo
- Không được duyệt GD, không thay đổi cấu hình`,
  },
  {
    id: 'xcash_subscription',
    title: 'Gói dịch vụ & Quota',
    keywords: [
      'gói dịch vụ',
      'subscription',
      'quota',
      'hết quota',
      'billing',
      'thanh toán',
      'nâng cấp',
      'gói',
    ],
    content: `X-Cash AI hoạt động theo mô hình subscription (gói thuê bao theo tháng):

- Mỗi gói có giới hạn số **giao dịch được xử lý** trong tháng (quota GD)
- Mỗi gói còn có giới hạn **lượt chat AI Copilot**/tháng (quota Copilot) — khác với quota GD
- Hết quota → hệ thống tạm dừng nhận GD mới từ Casso cho đến khi gia hạn hoặc nâng cấp
- GD import Excel không bị tính vào quota từ Casso (tùy cấu hình gói)

Xem trạng thái gói:
- Vào **Cài đặt → Gói dịch vụ** để xem quota đã dùng, ngày gia hạn
- Admin nhận email thông báo khi quota gần hết

Thanh toán:
- Hỗ trợ thanh toán qua **payOS** (chuyển khoản ngân hàng, QR)
- Hóa đơn xuất tự động mỗi kỳ`,
  },
];
