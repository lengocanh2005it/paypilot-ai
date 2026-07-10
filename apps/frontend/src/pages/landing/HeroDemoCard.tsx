import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DEMO_TRANSACTIONS } from './landing-data';

export function HeroDemoCard() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const demo = DEMO_TRANSACTIONS[index];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % DEMO_TRANSACTIONS.length);
        setVisible(true);
      }, 280);
    }, 3200);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0">
      <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-primary/20 blur-3xl" />
      <Card
        className={cn(
          'relative overflow-hidden border-primary/20 bg-card/90 shadow-2xl shadow-primary/10 backdrop-blur-sm transition-all duration-300',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
        )}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Giao dịch mới
            </Badge>
            <span className="text-xs text-muted-foreground">vừa xong</span>
          </div>
          <CardTitle className="text-base font-medium leading-snug">{demo.content}</CardTitle>
          <CardDescription className="font-mono text-base font-semibold text-foreground">
            {demo.amount}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              AI gợi ý định khoản TT133
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-2xl font-bold tracking-tight">
                  {demo.debit}
                  <span className="mx-1 text-muted-foreground">/</span>
                  {demo.credit}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{demo.label}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums text-primary">{demo.confidence}%</p>
                <p className="text-xs text-muted-foreground">độ tin cậy</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-dashed border-primary/30 bg-background px-3 py-2 text-center text-xs text-muted-foreground">
              Vuốt phải → Xác nhận
            </div>
            <div className="flex-1 rounded-lg border bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
              Sửa nếu cần
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="absolute -right-4 -bottom-4 hidden rounded-2xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur sm:block">
        <p className="text-xs text-muted-foreground">Tiết kiệm mỗi ngày</p>
        <p className="text-lg font-bold text-primary">~45 phút</p>
      </div>
    </div>
  );
}
