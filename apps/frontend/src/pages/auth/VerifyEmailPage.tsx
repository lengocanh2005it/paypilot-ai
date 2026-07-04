import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage, useAuth } from '@/hooks/useAuth';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyEmail, resendVerification } = useAuth();

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (autoSentRef.current) {
      return;
    }
    const shouldAutoSend = searchParams.get('autosend') === '1';
    const initialEmail = searchParams.get('email') ?? '';
    if (!shouldAutoSend || !initialEmail.trim()) {
      return;
    }
    autoSentRef.current = true;

    void (async () => {
      setIsResending(true);
      try {
        await resendVerification({ email: initialEmail });
        toast.success('Đã gửi mã OTP đến email của bạn');
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } catch (_error) {
        toast.message('Mã OTP đã được gửi trước đó', {
          description: 'Vui lòng kiểm tra hộp thư hoặc chờ để gửi lại.',
        });
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } finally {
        setIsResending(false);
      }
    })();
  }, [searchParams, resendVerification]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await verifyEmail({ email, otp });
      toast.success('Xác thực email thành công');
      navigate('/onboarding', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Mã OTP không hợp lệ'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || cooldown > 0) {
      return;
    }

    setIsResending(true);
    try {
      await resendVerification({ email });
      toast.success('Đã gửi lại mã OTP');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể gửi lại mã OTP'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title="Xác thực email"
      description="Nhập mã OTP 6 chữ số đã gửi đến hộp thư của bạn"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@abc.edu.vn"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="otp">Mã OTP</Label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            minLength={6}
            maxLength={6}
            pattern="\d{6}"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || otp.length !== 6}>
          {isSubmitting ? 'Đang xác thực...' : 'Xác thực email'}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isResending || cooldown > 0 || !email.trim()}
          onClick={handleResend}
        >
          {cooldown > 0
            ? `Gửi lại mã sau ${cooldown}s`
            : isResending
              ? 'Đang gửi...'
              : 'Gửi lại mã OTP'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Đã xác thực?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
