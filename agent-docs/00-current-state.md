# Current State — Đọc file này ĐẦU TIÊN

> Mục đích: cho biết **chính xác** cái gì đã tồn tại trong repo ngay lúc này, để agent không cần `find`/`grep`/`ls` lại từ đầu mỗi session mới. File này phải được cập nhật mỗi khi có thay đổi cấu trúc đáng kể (thêm module, thêm page, đổi dependency lớn, thêm service hạ tầng). Nếu file này và thực tế code lệch nhau, **tin thực tế code**, và sửa lại file này ngay sau đó.

Cập nhật lần cuối: sau khi khởi tạo monorepo + chuyển sang Biome + thêm `pnpm verify` (chưa có module nghiệp vụ nào, chưa có Prisma schema, chưa có Docker).

## Repo đang ở giai đoạn nào

**Trạng thái: Bootstrap xong, chưa code nghiệp vụ.** Đã có: monorepo skeleton (NestJS trắng + React trắng), tooling (Turborepo, Biome, pnpm workspaces), toàn bộ tài liệu nghiệp vụ + agent skills. **Chưa có:** Prisma schema, Docker Compose, bất kỳ module domain nào (auth, banking, invoice...), ShadCN/UI chưa cài, không có route/page thật ngoài trang chào mặc định.

Đối chiếu với `reference/sprint-plan.md`: đang ở **trước Sprint 1 tuần 1**, phần "Khởi tạo NestJS project" và "Khởi tạo React project" đã xong, các gạch đầu dòng còn lại của Sprint 1 tuần 1 (DB, Auth module, Cas SDK setup, RBAC foundation, Docker Compose, CI/CD) **chưa làm**.

## Cây file thực tế toàn repo (không tính `node_modules`, `.git`, `.turbo`)

```
paypilot-ai/
├── .claude/
│   └── skills/
│       ├── add-endpoint/SKILL.md
│       ├── db-migrate/SKILL.md
│       ├── new-module/SKILL.md
│       ├── new-page/SKILL.md
│       ├── sync-agent-docs/SKILL.md
│       └── verify/SKILL.md
├── .env.example                          # đầy đủ biến môi trường, CHƯA có .env thật
├── .gitignore
├── CLAUDE.md                              # entry point agent
├── agent-docs/
│   ├── 00-current-state.md                # file này
│   ├── 01-monorepo-structure.md
│   ├── 02-backend-conventions.md
│   ├── 03-frontend-conventions.md
│   ├── 04-environment-setup.md
│   ├── README.md
│   └── reference/                          # 6 file nghiệp vụ gốc, xem agent-docs/README.md
├── apps/
│   ├── backend/                            # NestJS — CHỈ CÓ SCAFFOLD MẶC ĐỊNH, chưa có module nào
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   ├── tsconfig.json / tsconfig.build.json
│   │   ├── src/
│   │   │   ├── main.ts                     # bootstrap mặc định, CHƯA setup Swagger/ValidationPipe/CORS/global filter
│   │   │   ├── app.module.ts                # CHỈ import AppController/AppService mặc định, chưa có module domain nào
│   │   │   ├── app.controller.ts             # route GET / mặc định "Hello World!"
│   │   │   └── app.service.ts
│   │   └── test/
│   │       ├── app.e2e-spec.ts
│   │       └── jest-e2e.json
│   │   # KHÔNG CÓ: prisma/, src/modules/, src/common/, docker, .env thật
│   │
│   └── frontend/                            # React 19 + Vite 8 — CHỈ CÓ TRANG CHÀO TỐI GIẢN
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
│       ├── public/
│       │   ├── favicon.svg
│       │   └── icons.svg
│       └── src/
│           ├── main.tsx
│           ├── App.tsx                       # placeholder "PayPilot AI" — KHÔNG PHẢI UI THẬT, cần thay khi bắt đầu Sprint
│           └── index.css
│       # KHÔNG CÓ: src/pages/, src/components/, src/hooks/, src/lib/, react-router, tanstack-query,
│       #           tailwind, shadcn/ui — TẤT CẢ CHƯA CÀI, xem mục "Chưa cài đặt" bên dưới
│
├── packages/
│   └── shared-types/                        # @paypilot/shared-types — CÓ SẴN enum dùng chung
│       ├── package.json
│       ├── tsconfig.json
│       └── src/index.ts                      # Role, TransactionStatus, InvoiceStatus, MatchType,
│                                              # CasGrantStatus, SubscriptionPlan, SubscriptionStatus,
│                                              # PaymentOrderStatus, ApiResponse<T> — xem nguyên văn bên dưới
│
├── biome.json                                 # lint + format config, xem chi tiết bên dưới
├── package.json                                # root, scripts điều phối turbo
├── pnpm-lock.yaml
├── pnpm-workspace.yaml                         # packages: apps/*, packages/*
└── turbo.json                                   # tasks: build, dev, lint, format, test, test:cov, type-check
```

## Nguyên văn `packages/shared-types/src/index.ts` hiện tại

Không cần đọc file để biết có gì — đây là toàn bộ nội dung hiện tại (nếu thêm enum mới, cập nhật cả block này):

```typescript
export enum Role {
  CAS_PARTNER = 'cas_partner',
  ADMIN = 'admin',
  ACCOUNTANT = 'accountant',
  VIEWER = 'viewer',
}

export enum TransactionStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  REVIEW = 'review',
  SKIPPED = 'skipped',
}

export enum InvoiceStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERPAID = 'overpaid',
}

export enum MatchType {
  AUTO = 'auto',
  MANUAL = 'manual',
}

export enum CasGrantStatus {
  ACTIVE = 'active',
  INVALIDATED = 'invalidated',
}

export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum PaymentOrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  meta?: { timestamp: string; request_id: string; page?: number; limit?: number; total?: number };
  error: { code: string; message: string } | null;
}
```

## Scripts thật của từng package (copy nguyên văn từ `package.json`, không cần mở file để tra)

**Root `package.json`:**
```
dev, build, lint, format, test, type-check   → turbo run <tên>
verify                                        → turbo run lint type-check test build
dev:backend / dev:frontend                    → turbo run dev --filter=@paypilot/<app>
```
devDependencies: `@biomejs/biome ^2.5.2`, `turbo ^2.5.0`. `packageManager: pnpm@10.33.0`.

**`apps/backend/package.json`** (`@paypilot/backend`):
```
build        → nest build
dev          → nest start --watch          (alias của start:dev, thêm để khớp convention turbo "dev")
start:dev    → nest start --watch
start:debug  → nest start --debug --watch
start:prod   → node dist/main
format       → biome format --write .
lint         → biome check --write .
type-check   → tsc --noEmit
test         → jest
test:watch   → jest --watch
test:cov     → jest --coverage
test:e2e     → jest --config ./test/jest-e2e.json
```
dependencies: `@nestjs/common ^11.0.1`, `@nestjs/core ^11.0.1`, `@nestjs/platform-express ^11.0.1`, `reflect-metadata ^0.2.2`, `rxjs ^7.8.1`.
devDependencies: `@nestjs/cli`, `@nestjs/schematics`, `@nestjs/testing`, `jest ^30`, `ts-jest`, `typescript ^5.7.3`, không còn `eslint`/`prettier` (đã gỡ, xem `agent-docs/01-monorepo-structure.md` mục Biome).
**Chưa có trong dependencies:** `@nestjs/config`, `@nestjs/swagger`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `class-validator`, `class-transformer`, `@prisma/client`, `prisma`, `ioredis`/`@nestjs/bullmq`/`bullmq`, `openai`, `langchain` — **phải tự cài khi bắt đầu module tương ứng**, đừng giả định đã có sẵn.

**`apps/frontend/package.json`** (`@paypilot/frontend`):
```
dev          → vite
build        → tsc -b && vite build
format       → biome format --write .
lint         → biome check --write .
type-check   → tsc -b --noEmit
preview      → vite preview
```
dependencies: `react ^19.2.7`, `react-dom ^19.2.7` — **chỉ có 2 package này**, chưa có gì khác.
devDependencies: `@types/node`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react ^6.0.3`, `typescript ~6.0.2`, `vite ^8.1.1`.
**Chưa cài:** `react-router` / `react-router-dom`, `@tanstack/react-query`, `tailwindcss`, `shadcn`/`class-variance-authority`/`clsx`/`tailwind-merge`, `recharts`, `sonner`, `lucide-react`, `axios`. Alias `@/` **chưa cấu hình** trong `vite.config.ts`/`tsconfig.json`.

**`packages/shared-types/package.json`**: chỉ có `format`, `lint`, `type-check`; devDependencies chỉ `typescript ^5.7.3`.

## `biome.json` — cấu hình hiện tại (nguyên văn)

```jsonc
{
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignoreUnknown": false, "includes": ["**", "!**/dist/**", "!**/coverage/**", "!**/.turbo/**", "!**/public/**"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": true, "style": { "noNonNullAssertion": "off" } } },
  "javascript": {
    "formatter": { "quoteStyle": "single", "trailingCommas": "all", "semicolons": "always" },
    "parser": { "unsafeParameterDecoratorsEnabled": true }   // bắt buộc cho NestJS decorator ở constructor param
  },
  "assist": { "enabled": true, "actions": { "source": { "organizeImports": "on" } } },
  "overrides": [
    { "includes": ["apps/frontend/**"], "linter": { "rules": { "correctness": { "useExhaustiveDependencies": "warn" } } } },
    { "includes": ["apps/backend/**"], "linter": { "rules": { "style": { "useImportType": "off" } } } }  // xem lý do ở 02-backend-conventions.md
  ]
}
```

## `turbo.json` — pipeline hiện tại (nguyên văn)

```jsonc
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "format": { "cache": false },
    "test": { "dependsOn": ["^build"] },
    "test:cov": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "type-check": { "dependsOn": ["^build"] }
  }
}
```

## Danh sách việc CHƯA làm (để không tưởng nhầm là đã có)

- [ ] `apps/backend/prisma/schema.prisma` — chưa tồn tại, chưa có bảng nào (kể cả `tenants`, `users`) — dùng skill `db-migrate` khi bắt đầu
- [ ] Không có `docker-compose.yml` ở bất kỳ đâu trong repo — PostgreSQL/pgvector/Redis chưa chạy container nào cả
- [ ] Không có `.env` thật (chỉ có `.env.example`)
- [ ] `apps/backend/src/modules/` — thư mục **chưa tồn tại**, chưa có bất kỳ module nào (`auth`, `onboarding`, `banking`, `transaction`, `invoice`, `customer`, `review`, `ai`, `analytics`, `notification`, `audit-log`, `settings`, `team`, `billing`, `partner` — dùng skill `new-module` để tạo từng cái)
- [ ] `apps/backend/src/common/` — chưa tồn tại (chưa có guard, decorator, filter, interceptor nào)
- [ ] Không có Swagger, không có global `ValidationPipe`, không có CORS config trong `main.ts` — vẫn là bootstrap mặc định của `nest new`
- [ ] `apps/frontend/src/pages/`, `components/`, `hooks/`, `lib/`, `routes/` — **chưa tồn tại thư mục nào**, dùng skill `new-page` khi bắt đầu
- [ ] React Router chưa cài, `App.tsx` hiện tại chỉ là placeholder text tĩnh, không có route nào
- [ ] ShadCN/UI chưa init — chạy `pnpm dlx shadcn@latest init` trong `apps/frontend` khi cần (xem `agent-docs/03-frontend-conventions.md`)
- [ ] Không có GitHub Actions (`.github/workflows/`) — CI/CD chưa setup
- [ ] Không có tài khoản Cas/OpenAI/PayOS thật nào được cấu hình — mọi giá trị trong `.env.example` là placeholder

## Việc ĐÃ làm xong, không cần làm lại

- [x] Monorepo Turborepo + pnpm workspaces hoạt động (`pnpm install`, `pnpm dev`, `pnpm build` đều chạy được)
- [x] `@paypilot/backend`, `@paypilot/frontend`, `@paypilot/shared-types` đã link đúng qua `workspace:*` (thực ra hiện tại backend/frontend **chưa** khai `@paypilot/shared-types` trong dependencies của chúng — cần tự thêm khi lần đầu import, xem `agent-docs/01-monorepo-structure.md` mục "Cách package nội bộ import lẫn nhau")
- [x] Biome lint + format thay thế hoàn toàn ESLint/Prettier/oxlint, đã verify sạch (`pnpm verify` pass 9/9 task)
- [x] `pnpm verify` chạy full lint → type-check → test → build không lỗi trên trạng thái hiện tại
- [x] Toàn bộ tài liệu nghiệp vụ gốc đã có trong `agent-docs/reference/` — không cần hỏi lại user về nghiệp vụ cơ bản, chỉ hỏi khi tài liệu thật sự không có câu trả lời
- [x] 6 skill agent đã có (`new-module`, `new-page`, `db-migrate`, `add-endpoint`, `verify`, `sync-agent-docs`)

## Quy tắc giữ file này luôn đúng

Sau khi hoàn thành 1 việc làm thay đổi cấu trúc thật sự (thêm module/page/dependency lớn/service hạ tầng), cập nhật:
1. Cây file ở trên (thêm dòng mới, xóa `# CHƯA CÓ` nếu đã có)
2. Mục "CHƯA làm" → chuyển dòng tương ứng sang "ĐÃ làm xong"
3. Nếu thêm script/dependency mới đáng kể vào `package.json`, cập nhật block "Scripts thật" tương ứng

Không cần cập nhật cho thay đổi nhỏ (sửa 1 dòng trong 1 file đã liệt kê, sửa nội dung text UI...) — chỉ cập nhật khi cấu trúc thay đổi.
