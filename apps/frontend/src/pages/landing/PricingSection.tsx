import { SubscriptionPlan } from '@xcash/shared-types';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatVND } from '@/lib/format-vnd';
import { cn } from '@/lib/utils';
import {
  formatCopilotQuota,
  formatPlanQuota,
  LANDING_PLANS,
  planDisplayName,
} from './landing-data';

export function PricingSection() {
  return (
    <section id="bang-gia" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Gói dịch vụ linh hoạt</h2>
          <p className="mt-4 text-muted-foreground">
            Bắt đầu miễn phí, nâng cấp khi doanh nghiệp phát triển. Thanh toán qua PayOS.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {LANDING_PLANS.map((plan) => (
            <Card
              key={plan.plan}
              className={cn(
                'relative flex flex-col',
                plan.highlight
                  ? 'border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/20'
                  : 'border-border/70',
              )}
            >
              {plan.highlight ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-md">
                    Phổ biến nhất
                  </Badge>
                </div>
              ) : null}
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{planDisplayName(plan.plan)}</CardTitle>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-1">
                  <span className="text-[1.75rem] font-bold tabular-nums leading-none tracking-tight">
                    {plan.pricePerMonth === 0 ? 'Miễn phí' : formatVND(plan.pricePerMonth)}
                  </span>
                  {plan.pricePerMonth > 0 ? (
                    <span className="text-sm text-muted-foreground">/tháng</span>
                  ) : null}
                </div>
                <CardDescription className="mt-1 space-y-0.5">
                  <span className="block">
                    {formatPlanQuota(plan.transactionQuota)}
                    {plan.overageHint ? ` · ${plan.overageHint}` : ''}
                  </span>
                  <span className="block">{formatCopilotQuota(plan.copilotQuota, plan.plan)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="mb-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={plan.highlight ? 'default' : 'outline'} className="w-full" asChild>
                  <Link to="/register">
                    {plan.plan === SubscriptionPlan.FREE ? 'Đăng ký miễn phí' : 'Chọn gói này'}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
