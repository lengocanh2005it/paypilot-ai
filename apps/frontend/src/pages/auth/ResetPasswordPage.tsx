import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage, useAuth } from '@/hooks/useAuth';

const RESEND_COOLDOWN_SECONDS = 60;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword, resendPasswordReset } = useAuth();

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPassword({ email, otp, password, confirmPassword });
      toast.success(result.message);
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể đặt lại mật khẩu'));
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
      await resendPasswordReset({ email });
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
      title="Đặt lại mật khẩu"
      description="Nhập mã OTP và mật khẩu mới cho tài khoản của bạn"
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

        <div className="space-y-2">
          <Label htmlFor="password">Mật khẩu mới</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Tối thiểu 8 ký tự"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Nhập lại mật khẩu mới</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || otp.length !== 6 || password.length < 8}
        >
          {isSubmitting ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
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
          <Link to="/login" className="font-medium text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
