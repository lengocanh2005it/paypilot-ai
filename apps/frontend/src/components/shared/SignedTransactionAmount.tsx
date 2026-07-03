import {
  formatSignedTransactionAmount,
  signedTransactionAmountClassName,
} from '@/lib/dashboard-transactions';
import { cn } from '@/lib/utils';

interface SignedTransactionAmountProps {
  amount: number;
  className?: string;
}

export function SignedTransactionAmount({ amount, className }: SignedTransactionAmountProps) {
  return (
    <span className={cn(signedTransactionAmountClassName(amount), className)}>
      {formatSignedTransactionAmount(amount)}
    </span>
  );
}
