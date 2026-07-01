---
name: new-module
description: Scaffold một NestJS module mới trong apps/backend/src/modules/ đúng chuẩn PayPilot AI (controller, service, DTO, RBAC guard, tenant scoping). Dùng khi cần thêm domain module mới (vd invoice, customer, billing, partner...) hoặc khi user gõ "/new-module <tên>".
---

# New Module — Scaffold NestJS module chuẩn PayPilot AI

## Trước khi chạy

Đọc 2 file này nếu chưa nắm rõ, đừng đoán:
- [`agent-docs/02-backend-conventions.md`](../../agent-docs/02-backend-conventions.md) — cấu trúc module, RBAC, tenant scoping bắt buộc
- [`agent-docs/reference/rbac.md`](../../agent-docs/reference/rbac.md) — tra đúng role nào được gọi endpoint nào cho module này

Xác định tên module đang tạo có nằm trong danh sách chuẩn ở `02-backend-conventions.md` không (`auth, onboarding, banking, transaction, invoice, customer, review, ai, analytics, notification, audit-log, settings, team, billing, partner`). Nếu là module hoàn toàn mới ngoài danh sách, hỏi lại user trước khi tạo — vì danh sách module đã được chốt theo kiến trúc trong `business-overview.md`.

## Việc cần làm

Cho module tên `<domain>` (kebab-case, vd `invoice`, `audit-log`):

1. Tạo thư mục `apps/backend/src/modules/<domain>/` với các file:
   - `<domain>.module.ts`
   - `<domain>.controller.ts`
   - `<domain>.service.ts`
   - `dto/create-<domain>.dto.ts` và `dto/update-<domain>.dto.ts` (chỉ nếu module có CRUD — bỏ qua với module thuần đọc như `analytics`, `audit-log`)
   - `<domain>.controller.spec.ts`

2. **`<domain>.controller.ts`** phải có:
   - `@UseGuards(JwtAuthGuard, RolesGuard)` ở cấp controller — **trừ khi** module là `partner`, khi đó dùng `@UseGuards(JwtAuthGuard, PartnerGuard)` thay vì `RolesGuard` (2 guard này không bao giờ dùng chung 1 controller).
   - Mỗi route method gắn `@Roles(...)` đúng theo ma trận phân quyền trong `reference/rbac.md`. Nếu route cho phép mọi role đã login (kể cả Viewer) thì **không** gắn `@Roles()` — đừng gắn `@Roles(Role.ADMIN, Role.ACCOUNTANT, Role.VIEWER)` thừa.
   - Import `Role` từ `@paypilot/shared-types`, không tự định nghĩa enum role riêng trong module.

3. **`<domain>.service.ts`** — nếu module thao tác data nghiệp vụ có `tenant_id` (tức không phải module `partner`):
   - Mọi method public phải nhận `tenantId: string` làm tham số đầu tiên (lấy từ `request.user.tenantId` ở controller, không bao giờ từ body/query client gửi).
   - Mọi Prisma query phải có `where: { tenantId, ... }`.
   - Nếu module là `partner`: **ngược lại** — service không bao giờ nhận `tenantId` chỉ tra 1 tenant, các method như `findAllTenants()` trả về toàn bộ tenant, nhưng tuyệt đối không query bảng nghiệp vụ chi tiết (`transactions.content`, `customers.name`...) — chỉ số liệu tổng hợp (usage, revenue).

4. **`<domain>.module.ts`** — đăng ký vào `AppModule` (`apps/backend/src/app.module.ts`) trong mảng `imports`.

5. Response trả về đúng format `ApiResponse<T>` (từ `@paypilot/shared-types`) qua interceptor toàn cục — controller chỉ return data thô, không tự bọc `{ success, data, ... }` bằng tay.

## Sau khi scaffold xong

- Chạy `pnpm --filter @paypilot/backend type-check` và `pnpm --filter @paypilot/backend lint` để bắt lỗi sớm.
- Nếu module có endpoint mới, cập nhật dòng tương ứng vào bảng phân quyền trong `agent-docs/reference/rbac.md` (checklist gốc yêu cầu điều này) — nhắc user xác nhận trước khi tự sửa file `reference/`.
- Nếu module cần entity/enum mới dùng chung cả FE, thêm vào `packages/shared-types/src/index.ts` trước khi dùng ở service.

## Ví dụ khung tối thiểu

```typescript
// apps/backend/src/modules/invoice/invoice.controller.ts
import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@paypilot/shared-types';
import { InvoiceService } from './invoice.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  findAll(@Req() req) {
    return this.invoiceService.findAll(req.user.tenantId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  create(@Req() req, @Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(req.user.tenantId, dto);
  }
}
```
