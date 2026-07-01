# Frontend Conventions — `apps/frontend` (React + Vite)

## Stack

React 19 + Vite + TypeScript + Tailwind CSS + ShadCN/UI + TanStack Query + React Router + Recharts + Sonner (toast) + Lucide React (icon). Chi tiết component mẫu cho từng màn hình đã có sẵn (JSX gần như copy-paste được) tại [`reference/ui-design.md`](./reference/ui-design.md) — **đọc file đó trước khi tự viết component mới**, đa số màn hình đã có spec + code mẫu.

## Cấu trúc thư mục mục tiêu

```
apps/frontend/src/
├── main.tsx
├── App.tsx                        # Router setup
├── pages/
│   ├── auth/                      # Register, Login
│   ├── onboarding/                 # 4 bước onboarding
│   ├── dashboard/
│   ├── transactions/
│   ├── review/                     # Human Review Queue
│   ├── invoices/
│   ├── customers/
│   ├── analytics/
│   ├── copilot/                    # AI Copilot chat
│   ├── settings/                   # tabs: Banking/Billing/Notification/Team/KB/Threshold
│   └── partner/                    # Partner Dashboard — layout RIÊNG, xem bên dưới
├── components/
│   ├── ui/                         # ShadCN generated components — KHÔNG tự sửa tay logic bên trong, dùng CLI để add
│   ├── layout/                     # Sidebar, Header, TenantLayout, PartnerLayout
│   └── shared/                     # ConfidenceBadge, StatusBadge, EmptyState, TableSkeleton...
├── hooks/
│   ├── useAuth.ts
│   ├── usePermission.ts             # xem reference/rbac.md mục Frontend — Ẩn/hiện UI theo role
│   └── use<Domain>.ts               # TanStack Query hook theo domain, vd useTransactions.ts
├── lib/
│   ├── api.ts                       # Axios instance — base URL, interceptor refresh token
│   ├── formatVND.ts
│   └── utils.ts                     # cn() cho ShadCN, v.v.
└── routes/
    ├── ProtectedRoute.tsx            # check auth + role
    └── PartnerRoute.tsx               # riêng cho /partner, redirect role khác về /dashboard
```

## Hai layout tách biệt hoàn toàn — không dùng chung

| | Tenant Layout | Partner Layout |
|---|---|---|
| Role | Admin / Accountant / Viewer | Cas Partner |
| Route | `/dashboard`, `/transactions`, `/invoices`... (8 màn hình) | `/partner` |
| Sidebar | Có, 8 mục | Không, chỉ top nav |

Chi tiết đầy đủ 2 layout tại [`reference/ui-design.md`](./reference/ui-design.md#-global-layout-tenant--mục-18) mục Global Layout và mục 9 Partner Dashboard. **Không import component/API nghiệp vụ (`/transactions`, `/invoices`, `/customers`) vào bất kỳ đâu trong `pages/partner/`** — đây là dấu hiệu thiết kế sai đã được cảnh báo rõ trong tài liệu gốc.

## RBAC trên frontend — không tin FE ẩn nút là đủ

Backend luôn validate lại role ở mọi endpoint (xem `agent-docs/02-backend-conventions.md`). FE chỉ ẩn/disable UI để trải nghiệm tốt hơn, dùng hook `usePermission()`:

```tsx
const { can } = usePermission();
{can('invoice:create') && <Button onClick={openCreateDialog}>+ Tạo hóa đơn</Button>}
```

Bảng permission đầy đủ để implement `usePermission` lấy từ [`reference/rbac.md`](./reference/rbac.md#5-frontend--ẩnhiện-ui-theo-role).

## Data fetching — TanStack Query pattern chuẩn

```tsx
// Query — polling 10s cho data cần real-time (transactions, dashboard)
const { data, isLoading, error } = useQuery({
  queryKey: ['transactions', filters],
  queryFn: () => api.get('/transactions', { params: filters }),
  refetchInterval: 10_000,
});

// Mutation — luôn invalidate query liên quan + toast
const { mutate: confirm, isPending } = useMutation({
  mutationFn: (id: string) => api.post(`/review/${id}/confirm`),
  onSuccess: () => {
    toast.success('Đã xác nhận ghép hóa đơn');
    queryClient.invalidateQueries({ queryKey: ['review'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  },
  onError: () => toast.error('Có lỗi xảy ra, vui lòng thử lại'),
});
```

## Component dùng chung bắt buộc tái sử dụng (không viết lại)

Định nghĩa mẫu đầy đủ tại `reference/ui-design.md` mục "Shared Components": `formatVND`, `StatusBadge`, `ConfidenceBadge`, `TableSkeleton`, `EmptyState`. Mọi màn hình hiển thị tiền/trạng thái/confidence phải dùng lại các component này, không tự format riêng lẻ từng nơi.

## Convention màu theo confidence/status (đồng bộ toàn app)

```
Confidence ≥ 95%   → Badge variant="success" (xanh)
Confidence 50–95%  → Badge variant="warning" (vàng)
Confidence < 50%    → Badge variant="destructive" (đỏ)

Status Matched  → xanh   | Status Review → vàng
Status Pending  → xám    | Status Skipped → outline
```

## Types dùng chung với backend

Import enum/type từ `@paypilot/shared-types` thay vì tự định nghĩa lại (vd: `Role`, `TransactionStatus`, `InvoiceStatus`, `SubscriptionPlan`). Nếu BE trả thêm field mới, cập nhật type ở `packages/shared-types/src/index.ts` trước, rồi dùng lại ở FE — không duplicate định nghĩa.

## States bắt buộc cho mọi màn hình danh sách/bảng

Loading (Skeleton) / Empty (icon + message tiếng Việt rõ ràng) / Error (toast + nút retry) — xem pattern mẫu trong `reference/ui-design.md` cuối mỗi mục màn hình.

## Setup ShadCN/UI (chưa cài trong scaffold ban đầu)

Khi bắt đầu code UI thật, cần chạy (từ `apps/frontend`):

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card badge table input select dialog sheet separator skeleton switch slider tabs progress alert-dialog collapsible
```

Cấu hình alias `@/` trỏ vào `apps/frontend/src` trong `vite.config.ts` và `tsconfig.json` — cần thiết vì mọi code mẫu trong `reference/ui-design.md` dùng import dạng `@/components/ui/...`.
