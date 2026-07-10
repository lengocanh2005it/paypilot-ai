import { Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HeroDemoCard } from './HeroDemoCard';

function scrollToSection(href: string) {
  const id = href.replace('#', '');
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[min(100%,900px)] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-20 right-0 h-64 w-64 rounded-full bg-chart-2/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(to right, oklch(0.635 0.168 155 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.635 0.168 155 / 0.08) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div className="text-center lg:text-left">
          <Badge
            variant="secondary"
            className="mb-5 border-primary/20 bg-primary/10 px-3 py-1 text-primary"
          >
            Định khoản tự động cho SME Việt Nam
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Giao dịch ngân hàng →{' '}
            <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              định khoản TT133
            </span>{' '}
            trong vài giây
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground text-pretty lg:mx-0">
            X-Cash AI tự động nhận giao dịch ngân hàng và dùng AI gợi ý tài khoản Nợ/Có theo chuẩn
            kế toán — kế toán chỉ cần xác nhận hoặc sửa. Giảm tới 80% thời gian nhập liệu thủ công.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button
              size="lg"
              className="h-12 w-full px-8 shadow-lg shadow-primary/25 sm:w-auto"
              asChild
            >
              <Link to="/register">
                Bắt đầu miễn phí
                <ChevronRight className="ml-1 size-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full sm:w-auto"
              onClick={() => scrollToSection('#cach-hoat-dong')}
            >
              Xem cách hoạt động
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground lg:justify-start">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-primary" />
              Định khoản chính xác
            </div>
            <div className="flex items-center gap-2">
              <Check className="size-4 text-primary" />
              Đúng chuẩn TT133
            </div>
            <div className="flex items-center gap-2">
              <Check className="size-4 text-primary" />
              Tự động hoàn toàn
            </div>
          </div>
        </div>

        <HeroDemoCard />
      </div>
    </section>
  );
}
