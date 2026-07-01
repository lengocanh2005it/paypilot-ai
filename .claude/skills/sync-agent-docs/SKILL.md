---
name: sync-agent-docs
description: Đồng bộ lại agent-docs/ và .claude/skills/ sau khi code xong, nếu thay đổi vừa làm ảnh hưởng đến nội dung đã mô tả ở đó. BẮT BUỘC chạy sau bước verify, trước khi báo task hoàn thành. Dùng khi user gõ "/sync-agent-docs" hoặc cuối mọi task code có ảnh hưởng cấu trúc/quy ước.
---

# Sync Agent Docs — Đừng để tài liệu nói dối

## Vì sao skill này tồn tại

`agent-docs/` được thiết kế để session sau đọc là hiểu ngay, không cần dò lại codebase. Điều đó chỉ đúng nếu tài liệu **luôn khớp với code thật**. Mỗi lần code xong mà không đồng bộ lại docs, tài liệu bắt đầu nói dối — và lần sau agent đọc docs sẽ đưa ra quyết định sai dựa trên thông tin cũ, tệ hơn cả việc không có docs.

## Khi nào bắt buộc chạy skill này

Chạy **sau `pnpm verify` (skill `verify`) đã pass**, trước khi báo task hoàn thành, nếu vừa làm ít nhất 1 trong các việc sau:

- Thêm/xóa/đổi tên module NestJS (`apps/backend/src/modules/*`)
- Thêm/xóa/đổi tên page React (`apps/frontend/src/pages/*`)
- Thêm/sửa/xóa endpoint API (path, method, role được phép)
- Sửa Prisma schema (thêm bảng, thêm cột, đổi quan hệ)
- Thêm dependency mới đáng kể vào bất kỳ `package.json` nào (không tính bump patch version)
- Thêm/sửa enum hoặc type trong `packages/shared-types/src/index.ts`
- Thêm service hạ tầng mới (Docker Compose, CI workflow, biến môi trường mới trong `.env.example`)
- Đổi convention đã ghi trong `agent-docs/02-backend-conventions.md` hoặc `03-frontend-conventions.md` (vd đổi cấu trúc thư mục chuẩn, đổi guard pattern)
- Phát hiện tài liệu `agent-docs/` có chỗ sai/lỗi thời trong lúc code (không đợi đến cuối task, note lại ngay)

Nếu task chỉ sửa logic nội bộ 1 file, fix bug nhỏ, đổi text UI, refactor không đổi cấu trúc/API — **không cần** chạy skill này, tránh cập nhật docs vô ích.

## Việc cần làm — theo đúng thứ tự

1. **`agent-docs/00-current-state.md`** — cập nhật trước tiên, đây là file quan trọng nhất:
   - Thêm/xóa dòng trong cây file nếu có file/thư mục mới xuất hiện hoặc biến mất
   - Chuyển mục tương ứng từ "Danh sách việc CHƯA làm" sang "Việc ĐÃ làm xong"
   - Nếu đổi script/dependency trong `package.json`, cập nhật lại đúng block "Scripts thật của từng package"
   - Nếu đổi `biome.json`/`turbo.json`, cập nhật lại 2 block nguyên văn tương ứng
   - Nếu thêm enum/type vào `shared-types`, cập nhật lại block "Nguyên văn `shared-types/src/index.ts`"

2. **File convention liên quan** (`01-monorepo-structure.md` / `02-backend-conventions.md` / `03-frontend-conventions.md` / `04-environment-setup.md`) — chỉ sửa nếu thay đổi vừa làm **lệch với quy ước đã mô tả** ở đó (vd thêm module ngoài danh sách chuẩn, đổi pattern RBAC). Nếu code chỉ tuân theo đúng convention có sẵn, không cần sửa các file này.

3. **`agent-docs/reference/rbac.md`**, mục ma trận phân quyền — nếu vừa thêm endpoint mới, thêm 1 dòng tương ứng vào bảng (đây là checklist gốc yêu cầu, xem skill `add-endpoint` bước 6). **Xác nhận với user trước khi sửa bất kỳ file nào trong `reference/`** — đây là tài liệu đồ án đã duyệt, khác với các file điều hướng agent-docs còn lại có thể tự sửa thoải mái.

4. **Skill liên quan** (`.claude/skills/*/SKILL.md`) — nếu quy trình mô tả trong 1 skill không còn đúng nữa (vd lệnh đã đổi, gotcha mới phát sinh, danh sách module chuẩn đã đổi), sửa lại skill đó luôn. Ví dụ thực tế đã xảy ra: phát hiện Biome tự đổi `import type` làm vỡ NestJS DI → phải note ngay vào cả `02-backend-conventions.md` lẫn skill `verify`, không chỉ sửa code rồi bỏ qua.

5. Nếu đổi biến môi trường (`env-example`), cập nhật `.env.example` ở root **và** bảng biến môi trường trong `04-environment-setup.md` cùng lúc — 2 chỗ này phải luôn khớp nhau.

## Sau khi sync xong

Review nhanh lại: nếu 1 agent hoàn toàn mới, chưa từng thấy conversation này, đọc `00-current-state.md` ngay bây giờ — nó có đủ thông tin để tiếp tục công việc mà không cần hỏi lại những gì vừa làm không? Nếu câu trả lời là không, còn thiếu gì đó, bổ sung tiếp trước khi coi task là xong.

## Không tự ý làm

- Không sửa nội dung nghiệp vụ trong `reference/` (business-overview, database-schema, ui-design, user-journey, sprint-plan) mà không hỏi user trước — kể cả khi thấy "có vẻ" lỗi thời, vì đây là tài liệu đồ án đã duyệt, có thể đúng ý đồ ban đầu mà agent chưa hiểu hết ngữ cảnh.
- Không viết thêm file `agent-docs/` mới ngoài cấu trúc hiện có nếu không thật sự cần — ưu tiên cập nhật file đã có trước khi nghĩ đến tạo file mới.
