import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
        <Logo markSize={32} />
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} X-Cash AI — Định khoản tự động theo TT133
        </p>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-foreground">
            Đăng nhập
          </Link>
          <Link to="/register" className="font-medium text-primary hover:underline">
            Đăng ký
          </Link>
        </div>
      </div>
    </footer>
  );
}
