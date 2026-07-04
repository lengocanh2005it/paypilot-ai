import type { ReactNode } from 'react';
import { LogoMark } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-svh bg-background px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent" />
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-lg items-center">
        <Card className="w-full border-border/80 shadow-lg shadow-primary/5">
          <CardHeader className="sm:px-8">
            <div className="flex items-center gap-3">
              <LogoMark size={40} className="rounded-xl shadow-sm" />
              <div className="space-y-0.5">
                <CardTitle className="text-xl text-foreground">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="sm:px-8">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
