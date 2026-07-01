import {
  BarChart3,
  Bot,
  FileText,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Giao dịch', icon: Receipt },
  { to: '/review', label: 'Human Review', icon: Users, disabled: true },
  { to: '/invoices', label: 'Hóa đơn', icon: FileText, disabled: true },
  { to: '/customers', label: 'Khách hàng', icon: Wallet, disabled: true },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, disabled: true },
  { to: '/copilot', label: 'AI Copilot', icon: Bot, disabled: true },
  { to: '/settings', label: 'Cài đặt', icon: Settings, disabled: true },
];

interface SidebarContentProps {
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
  showThemeToggle?: boolean;
}

export function SidebarContent({
  onNavigate,
  showClose,
  onClose,
  showThemeToggle = true,
}: SidebarContentProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Đã đăng xuất');
      navigate('/login');
      onNavigate?.();
    } catch {
      toast.error('Không thể đăng xuất, vui lòng thử lại');
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-2 border-b px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-primary">PayPilot AI</p>
          <p className="truncate text-xs text-muted-foreground">Đối soát thông minh</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {showThemeToggle ? <ThemeToggle /> : null}
          {showClose ? (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={onClose}
              aria-label="Đóng menu"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground opacity-50"
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-sidebar-foreground hover:bg-primary/5 hover:text-primary',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="mb-3 min-w-0">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleLogout}>
          <LogOut className="size-4" />
          Đăng xuất
        </Button>
      </div>
    </>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden h-svh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
      <SidebarContent />
    </aside>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        aria-label="Đóng menu"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,18rem)] flex-col border-r bg-sidebar text-sidebar-foreground shadow-xl lg:hidden">
        <SidebarContent onNavigate={onClose} showClose onClose={onClose} showThemeToggle={false} />
      </aside>
    </>
  );
}
