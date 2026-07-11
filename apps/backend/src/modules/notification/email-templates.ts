import type {
  EmailChangePasswordOtpJobData,
  EmailInviteJobData,
  EmailJobData,
  EmailMonthlyReportJobData,
  EmailOtpJobData,
  EmailResetOtpJobData,
} from './email.constants';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

function changeArrow(n: number): string {
  return n > 0 ? '↑' : n < 0 ? '↓' : '→';
}

function changeColor(n: number): string {
  return n > 0 ? '#16a34a' : n < 0 ? '#dc2626' : '#6b7280';
}

function changeText(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return 'Không đổi';
  return `${n > 0 ? '+' : ''}${n}%`;
}

const FOOTER = `
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
    <p style="font-size:12px;color:#9ca3af;margin:0">Email tự động từ X-Cash AI. Vui lòng không trả lời email này.</p>`;

const OTP_STYLES = `
    <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:0 0 16px">`;

export function buildGenericHtml(data: EmailJobData): string {
  const actionBlock = data.actionUrl
    ? `<p style="margin:24px 0">
          <a href="${data.actionUrl}"
             style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
            Xem chi tiết
          </a>
        </p>
        <p style="font-size:12px;color:#6b7280">Hoặc mở: <a href="${data.actionUrl}">${data.actionUrl}</a></p>`
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
  <body style="font-family:system-ui,sans-serif;color:#111827;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
    <p style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">X-Cash AI</p>
    <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(data.title)}</h1>
    <p style="margin:0 0 8px">${escapeHtml(data.body)}</p>
    ${actionBlock}
    ${FOOTER}
  </body>
</html>`;
}

export function buildGenericText(data: EmailJobData): string {
  const lines = [data.title, '', data.body];
  if (data.actionUrl) {
    lines.push('', `Xem chi tiết: ${data.actionUrl}`);
  }
  return lines.join('\n');
}

export function buildVerificationOtpHtml(data: EmailOtpJobData): string {
  return `<!DOCTYPE html>
<html lang="vi">
  <body style="font-family:system-ui,sans-serif;color:#111827;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
    <p style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">X-Cash AI</p>
    <h1 style="font-size:20px;margin:0 0 12px">Xác thực email đăng ký</h1>
    <p style="margin:0 0 8px">Xin chào ${escapeHtml(data.ownerName)},</p>
    <p style="margin:0 0 16px">Nhập mã OTP sau để hoàn tất đăng ký tài khoản X-Cash AI:</p>
    ${OTP_STYLES}${data.otp}</p>
    <p style="font-size:13px;color:#6b7280;margin:0">Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.</p>
    ${FOOTER}
  </body>
</html>`;
}

export function buildVerificationOtpText(data: EmailOtpJobData): string {
  return `Xác thực email đăng ký X-Cash AI\n\nMã OTP: ${data.otp}\n\nMã có hiệu lực trong 10 phút.`;
}

export function buildPasswordResetOtpHtml(data: EmailResetOtpJobData): string {
  return `<!DOCTYPE html>
<html lang="vi">
  <body style="font-family:system-ui,sans-serif;color:#111827;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
    <p style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">X-Cash AI</p>
    <h1 style="font-size:20px;margin:0 0 12px">Đặt lại mật khẩu</h1>
    <p style="margin:0 0 8px">Xin chào ${escapeHtml(data.userName)},</p>
    <p style="margin:0 0 16px">Nhập mã OTP sau để đặt lại mật khẩu tài khoản X-Cash AI của bạn:</p>
    ${OTP_STYLES}${data.otp}</p>
    <p style="font-size:13px;color:#6b7280;margin:0">Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
    ${FOOTER}
  </body>
</html>`;
}

export function buildPasswordResetOtpText(data: EmailResetOtpJobData): string {
  return `Đặt lại mật khẩu X-Cash AI\n\nMã OTP: ${data.otp}\n\nMã có hiệu lực trong 10 phút.`;
}

export function buildChangePasswordOtpHtml(data: EmailChangePasswordOtpJobData): string {
  return `<!DOCTYPE html>
<html lang="vi">
  <body style="font-family:system-ui,sans-serif;color:#111827;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
    <p style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">X-Cash AI</p>
    <h1 style="font-size:20px;margin:0 0 12px">Xác thực đổi mật khẩu</h1>
    <p style="margin:0 0 8px">Xin chào ${escapeHtml(data.userName)},</p>
    <p style="margin:0 0 16px">Nhập mã OTP sau để hoàn tất đổi mật khẩu tài khoản X-Cash AI của bạn:</p>
    ${OTP_STYLES}${data.otp}</p>
    <p style="font-size:13px;color:#6b7280;margin:0">Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai. Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này.</p>
    ${FOOTER}
  </body>
</html>`;
}

export function buildChangePasswordOtpText(data: EmailChangePasswordOtpJobData): string {
  return `Xác thực đổi mật khẩu X-Cash AI\n\nMã OTP: ${data.otp}\n\nMã có hiệu lực trong 10 phút.`;
}

export function buildTeamInviteHtml(data: EmailInviteJobData): string {
  return `<!DOCTYPE html>
<html lang="vi">
  <body style="font-family:system-ui,sans-serif;color:#111827;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
    <p style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">X-Cash AI</p>
    <h1 style="font-size:20px;margin:0 0 12px">Bạn được mời tham gia doanh nghiệp</h1>
    <p style="margin:0 0 8px">Xin chào ${escapeHtml(data.inviteeName)},</p>
    <p style="margin:0 0 16px">${escapeHtml(data.inviterName)} đã mời bạn tham gia <strong>${escapeHtml(data.businessName)}</strong> trên X-Cash AI với vai trò <strong>${escapeHtml(data.roleLabel)}</strong>.</p>
    <p style="margin:0 0 24px">Nhấn nút bên dưới để đặt mật khẩu và kích hoạt tài khoản:</p>
    <p style="margin:0 0 24px">
      <a href="${data.activationUrl}"
         style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
        Kích hoạt tài khoản
      </a>
    </p>
    <p style="font-size:12px;color:#6b7280;margin:0 0 8px">Hoặc mở link: <a href="${data.activationUrl}">${data.activationUrl}</a></p>
    <p style="font-size:13px;color:#6b7280;margin:0">Link có hiệu lực trong 7 ngày. Không chia sẻ link này với bất kỳ ai.</p>
    ${FOOTER}
  </body>
</html>`;
}

export function buildTeamInviteText(data: EmailInviteJobData): string {
  return `Lời mời tham gia ${data.businessName} trên X-Cash AI\n\n${data.inviterName} đã mời bạn với vai trò ${data.roleLabel}.\n\nKích hoạt tài khoản: ${data.activationUrl}\n\nLink có hiệu lực trong 7 ngày.`;
}

export function buildMonthlyReportHtml(
  data: EmailMonthlyReportJobData,
  dashboardUrl: string,
): string {
  const monthLabel = `Tháng ${data.month}/${data.year}`;

  const comparisonBlock = data.comparison
    ? `<tr>
            <td style="padding:8px 12px;font-size:13px;color:#6b7280">So sánh tháng trước</td>
            <td style="padding:8px 12px;font-size:13px;color:${changeColor(data.comparison.revenueChange)};text-align:right">
              ${changeArrow(data.comparison.revenueChange)} ${changeText(data.comparison.revenueChange)}
            </td>
            <td style="padding:8px 12px;font-size:13px;color:${changeColor(data.comparison.expenseChange)};text-align:right">
              ${changeArrow(data.comparison.expenseChange)} ${changeText(data.comparison.expenseChange)}
            </td>
            <td style="padding:8px 12px;font-size:13px;color:${changeColor(data.comparison.netChange)};text-align:right">
              ${changeArrow(data.comparison.netChange)} ${changeText(data.comparison.netChange)}
            </td>
          </tr>`
    : '';

  const topExpenseRows = (data.topExpense ?? [])
    .slice(0, 5)
    .map(
      (item, i) =>
        `<tr>
            <td style="padding:6px 12px;font-size:13px;border-bottom:1px solid #f3f4f6">${i + 1}. ${escapeHtml(item.accountName)}</td>
            <td style="padding:6px 12px;font-size:13px;text-align:right;border-bottom:1px solid #f3f4f6">${formatCurrency(item.total)}</td>
          </tr>`,
    )
    .join('');

  const topRevenueRows = (data.topRevenue ?? [])
    .slice(0, 5)
    .map(
      (item, i) =>
        `<tr>
            <td style="padding:6px 12px;font-size:13px;border-bottom:1px solid #f3f4f6">${i + 1}. ${escapeHtml(item.accountName)}</td>
            <td style="padding:6px 12px;font-size:13px;text-align:right;border-bottom:1px solid #f3f4f6">${formatCurrency(item.total)}</td>
          </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="vi">
  <body style="font-family:system-ui,sans-serif;color:#111827;line-height:1.5;max-width:600px;margin:0 auto;padding:24px">
    <p style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">X-Cash AI</p>
    <h1 style="font-size:20px;margin:0 0 4px">Báo cáo ${monthLabel}</h1>
    <p style="font-size:14px;color:#6b7280;margin:0 0 24px">${escapeHtml(data.businessName)}</p>

    <!-- Summary cards -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr>
        <td style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;width:33%">
          <p style="font-size:12px;color:#16a34a;margin:0 0 4px;text-transform:uppercase">Thu nhập</p>
          <p style="font-size:18px;font-weight:700;color:#16a34a;margin:0">${formatCurrency(data.summary.totalRevenue)}</p>
        </td>
        <td style="width:1%"></td>
        <td style="background:#fef2f2;border-radius:8px;padding:16px;text-align:center;width:33%">
          <p style="font-size:12px;color:#dc2626;margin:0 0 4px;text-transform:uppercase">Chi phí</p>
          <p style="font-size:18px;font-weight:700;color:#dc2626;margin:0">${formatCurrency(data.summary.totalExpense)}</p>
        </td>
        <td style="width:1%"></td>
        <td style="background:${data.summary.net >= 0 ? '#eff6ff' : '#fef2f2'};border-radius:8px;padding:16px;text-align:center;width:33%">
          <p style="font-size:12px;color:${data.summary.net >= 0 ? '#2563eb' : '#dc2626'};margin:0 0 4px;text-transform:uppercase">Lãi/Lỗ</p>
          <p style="font-size:18px;font-weight:700;color:${data.summary.net >= 0 ? '#2563eb' : '#dc2626'};margin:0">${formatCurrency(data.summary.net)}</p>
        </td>
      </tr>
    </table>

    <!-- Comparison table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:8px 12px;font-size:12px;text-align:left;color:#6b7280;text-transform:uppercase">Chỉ tiêu</th>
          <th style="padding:8px 12px;font-size:12px;text-align:right;color:#6b7280;text-transform:uppercase">Thu nhập</th>
          <th style="padding:8px 12px;font-size:12px;text-align:right;color:#6b7280;text-transform:uppercase">Chi phí</th>
          <th style="padding:8px 12px;font-size:12px;text-align:right;color:#6b7280;text-transform:uppercase">Lãi/Lỗ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 12px;font-size:13px;font-weight:600">Tháng này</td>
          <td style="padding:8px 12px;font-size:13px;text-align:right">${formatCurrency(data.summary.totalRevenue)}</td>
          <td style="padding:8px 12px;font-size:13px;text-align:right">${formatCurrency(data.summary.totalExpense)}</td>
          <td style="padding:8px 12px;font-size:13px;text-align:right;font-weight:600">${formatCurrency(data.summary.net)}</td>
        </tr>
        ${comparisonBlock}
      </tbody>
    </table>

    <!-- Stats -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#6b7280">Tổng giao dịch</td>
        <td style="padding:8px 12px;font-size:13px;text-align:right;font-weight:600">${data.summary.totalCount.toLocaleString('vi-VN')}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#6b7280">Đã AI định khoản</td>
        <td style="padding:8px 12px;font-size:13px;text-align:right;font-weight:600">${data.summary.classifiedCount.toLocaleString('vi-VN')}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#6b7280">Chờ review</td>
        <td style="padding:8px 12px;font-size:13px;text-align:right;font-weight:600;color:#f59e0b">${data.summary.reviewCount.toLocaleString('vi-VN')}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#6b7280">Độ chính xác AI</td>
        <td style="padding:8px 12px;font-size:13px;text-align:right;font-weight:600;color:#2563eb">${data.summary.aiAccuracy}%</td>
      </tr>
    </table>

    ${
      topExpenseRows
        ? `<h2 style="font-size:16px;margin:0 0 8px">Top chi phí</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tbody>${topExpenseRows}</tbody>
    </table>`
        : ''
    }

    ${
      topRevenueRows
        ? `<h2 style="font-size:16px;margin:0 0 8px">Top thu nhập</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tbody>${topRevenueRows}</tbody>
    </table>`
        : ''
    }

    <!-- CTA -->
    <p style="margin:24px 0">
      <a href="${dashboardUrl}"
         style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
        Xem báo cáo chi tiết
      </a>
    </p>

    ${FOOTER}
  </body>
</html>`;
}

export function buildMonthlyReportText(
  data: EmailMonthlyReportJobData,
  dashboardUrl: string,
): string {
  const monthLabel = `Tháng ${data.month}/${data.year}`;
  return `Báo cáo ${monthLabel} — ${data.businessName}

Thu nhập: ${formatCurrency(data.summary.totalRevenue)}
Chi phí: ${formatCurrency(data.summary.totalExpense)}
Lãi/Lỗ: ${formatCurrency(data.summary.net)}

Tổng GD: ${data.summary.totalCount}
Đã AI: ${data.summary.classifiedCount}
Chờ review: ${data.summary.reviewCount}
Độ chính xác AI: ${data.summary.aiAccuracy}%

Xem báo cáo chi tiết: ${dashboardUrl}`;
}
