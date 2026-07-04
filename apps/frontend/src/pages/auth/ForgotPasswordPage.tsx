import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage, useAuth } from '@/hooks/useAuth';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await forgotPassword({ email });
      toast.success(result.message);
      navigate(`/reset-password?email=${encodeURIComponent(email)}`, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể gửi mã OTP'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Quên mật khẩu"
      description="Nhập email đăng ký để nhận mã OTP đặt lại mật khẩu"
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Đang gửi...' : 'Gửi mã OTP'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Nhớ mật khẩu?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
