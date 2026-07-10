import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function CtaSection() {
  return (
    <section className="pb-20 sm:pb-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-chart-3 px-6 py-14 text-center text-primary-foreground sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Sẵn sàng bỏ Excel nhập tay?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
              Tạo tài khoản miễn phí, liên kết Cas Link và để AI định khoản giúp bạn ngay hôm nay.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                className="h-12 w-full bg-background text-foreground hover:bg-background/90 sm:w-auto"
                asChild
              >
                <Link to="/register">Đăng ký miễn phí</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
                asChild
              >
                <Link to="/login">Đã có tài khoản</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
