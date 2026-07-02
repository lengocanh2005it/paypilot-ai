import {
  BarChart3,
  Bot,
  FileText,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Receipt,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
  collapsed?: boolean;
  showCollapseToggle?: boolean;
  onToggleCollapsed?: () => void;
}

export function SidebarContent({
  onNavigate,
  showClose,
  onClose,
  collapsed = false,
  showCollapseToggle = false,
  onToggleCollapsed,
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
      <div
        className={cn(
          'border-b px-4 py-4 sm:px-5',
          collapsed
            ? 'flex flex-col items-center gap-2 px-2'
            : 'flex items-start justify-between gap-2',
        )}
      >
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-primary">PayPilot AI</p>
            <p className="truncate text-xs text-muted-foreground">Đối soát thông minh</p>
          </div>
        ) : (
          <p className="text-sm font-semibold text-primary" title="PayPilot AI">
            PP
          </p>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {showCollapseToggle ? (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
              title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            >
              {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          ) : null}
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
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm text-muted-foreground opacity-50',
                  collapsed ? 'justify-center' : 'gap-3',
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm transition-colors',
                  collapsed ? 'justify-center' : 'gap-3',
                  isActive
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-sidebar-foreground hover:bg-primary/5 hover:text-primary',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </NavLink>
          );
        })}
      </nav>

      <div className={cn('border-t p-4', collapsed && 'px-2')}>
        {!collapsed ? (
          <div className="mb-3 min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size={collapsed ? 'icon-sm' : 'sm'}
          className={cn(!collapsed && 'w-full')}
          onClick={handleLogout}
          aria-label="Đăng xuất"
          title={collapsed ? 'Đăng xuất' : undefined}
        >
          <LogOut className="size-4" />
          {!collapsed ? 'Đăng xuất' : null}
        </Button>
      </div>
    </>
  );
}

interface DesktopSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function DesktopSidebar({ collapsed, onToggleCollapsed }: DesktopSidebarProps) {
  return (
    <aside
      className={cn(
        'hidden h-svh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <SidebarContent
        collapsed={collapsed}
        showCollapseToggle
        onToggleCollapsed={onToggleCollapsed}
      />
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
        <SidebarContent onNavigate={onClose} showClose onClose={onClose} />
      </aside>
    </>
  );
}
