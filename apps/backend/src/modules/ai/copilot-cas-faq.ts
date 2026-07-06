const FAQ: Record<string, string> = {
  overview: `X-Cash AI nhận giao dịch ngân hàng real-time qua **Cas Balance Hook** (webhook từ Casso). Mỗi doanh nghiệp liên kết tài khoản NH qua **Cas Link** (Cài đặt → Ngân hàng). Casso là đối tác banking cung cấp dữ liệu giao dịch; X-Cash AI là lớp AI định khoản tự động theo chuẩn TT133 và tạo báo cáo kế toán.`,

  how_to_link: `Để liên kết ngân hàng với X-Cash AI:
1. Admin vào **Cài đặt → Ngân hàng** (đường dẫn: /settings).
2. Nhấn **Liên kết ngân hàng** → hoàn tất luồng **Cas Link** (xác thực với ngân hàng qua Casso).
3. Sau khi thành công, hệ thống lưu thông tin liên kết (cas_grants) và bắt đầu nhận giao dịch tự động.
Nếu chưa qua bước onboarding, vào /onboarding để bắt đầu.`,

  missing_transactions: `Nếu không thấy giao dịch từ ngân hàng, kiểm tra lần lượt:
1. **Đã liên kết NH chưa?** — Vào Cài đặt → Ngân hàng xem trạng thái.
2. **GD có trên sao kê NH nhưng chưa vào X-Cash?** — Có thể Casso chưa push; thử kiểm tra lại liên kết hoặc chờ vài phút.
3. **GD từ Import Excel** không đi qua Casso — đây là nguồn riêng, kiểm tra tab Giao dịch, lọc theo nguồn **Ngân hàng** (source=cas) để phân biệt.
4. **Subscription bị tạm dừng hoặc hết quota** — kiểm tra trạng thái gói dịch vụ trong Cài đặt.`,

  webhook_explained: `X-Cash AI dùng **một URL webhook chung** cho toàn hệ thống: POST /api/v1/webhook/cas. Casso gửi payload giao dịch về URL này với trường grantId để X-Cash định tuyến đến đúng tenant. Không cần cấu hình webhook riêng cho từng tenant. Hệ thống có cơ chế idempotency (Redis, theo transaction.id) để tránh xử lý trùng khi Casso retry.`,
};

export function getCasIntegrationFaq(topic: string): { topic: string; content: string } {
  const content = FAQ[topic];
  if (!content) {
    return {
      topic,
      content: `Không tìm thấy thông tin cho chủ đề "${topic}". Các chủ đề hợp lệ: overview, how_to_link, missing_transactions, webhook_explained.`,
    };
  }
  return { topic, content };
}
