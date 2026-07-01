import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Button } from '@/components/ui/button';
import { DesktopSidebar, MobileSidebar } from './Sidebar';

export function TenantLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-svh bg-[#F8FAFB]">
      <DesktopSidebar />
      <MobileSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b bg-white px-4 py-3 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Mở menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <p className="truncate font-semibold text-primary">PayPilot AI</p>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
