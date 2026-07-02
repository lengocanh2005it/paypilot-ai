import { CheckCircle2, Landmark } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BankAccountDetailsDialog } from '@/components/dashboard/BankAccountDetailsDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { OnboardingGrant } from '@/types/onboarding';

interface BankStatusCardProps {
  bankingLinked: boolean;
  grants: OnboardingGrant[];
}

export function BankStatusCard({ bankingLinked, grants }: BankStatusCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <Card className="py-4">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={
                bankingLinked
                  ? 'flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'
                  : 'flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground'
              }
            >
              <Landmark className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Trạng thái ngân hàng</p>
              <p className="text-base font-semibold">
                {bankingLinked ? 'Đã liên kết' : 'Chưa liên kết'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:justify-end">
            {bankingLinked ? (
              <>
                <p className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="size-4 shrink-0" />
                  Sẵn sàng nhận giao dịch
                  {grants.length > 1 ? (
                    <span className="text-muted-foreground">· {grants.length} tài khoản</span>
                  ) : null}
                </p>
                {grants.length > 0 ? (
                  <Button variant="outline" size="sm" onClick={() => setDetailsOpen(true)}>
                    Xem tài khoản
                  </Button>
                ) : null}
              </>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link to="/onboarding">Tiếp tục onboarding</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {bankingLinked && grants.length > 0 ? (
        <BankAccountDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          grants={grants}
        />
      ) : null}
    </>
  );
}
