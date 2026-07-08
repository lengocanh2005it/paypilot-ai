import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { deleteApiData, getApiData, postApiData } from '@/lib/api';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  invitedBy: { name: string } | null;
}

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  accountant: 'Kế toán',
  viewer: 'Chỉ xem',
};

export function TeamTab() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'accountant' });

  const { data: members, isLoading } = useQuery({
    queryKey: ['team', 'members'],
    queryFn: () => getApiData<Member[]>('/team/members'),
  });

  const { mutate: invite, isPending: inviting } = useMutation({
    mutationFn: () => postApiData<{ message: string }>('/team/members', form),
    onSuccess: (response) => {
      toast.success(response.message);
      qc.invalidateQueries({ queryKey: ['team', 'members'] });
      setInviteOpen(false);
      setForm({ name: '', email: '', role: 'accountant' });
    },
    onError: () => toast.error('Không thể gửi lời mời'),
  });

  const { mutate: resendInvite, isPending: isResending } = useMutation({
    mutationFn: (id: string) =>
      postApiData<{ message: string }>(`/team/members/${id}/resend-invite`),
    onSuccess: (response) => {
      toast.success(response.message);
    },
    onError: () => toast.error('Không thể gửi lại email mời'),
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: (id: string) => deleteApiData(`/team/members/${id}`),
    onSuccess: () => {
      toast.success('Đã xóa thành viên');
      setMemberToRemove(null);
      qc.invalidateQueries({ queryKey: ['team', 'members'] });
    },
    onError: () => toast.error('Không thể xóa thành viên'),
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Quản lý thành viên</CardTitle>
            <CardDescription>Danh sách user trong doanh nghiệp của bạn</CardDescription>
          </div>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="size-4 mr-2" />
            Thêm thành viên
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => `skel-${i}`).map((k) => (
                <Skeleton key={k} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {members?.map((m) => {
                const isPending = !m.emailVerifiedAt && m.invitedBy;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isPending && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          Chờ kích hoạt
                        </Badge>
                      )}
                      <Badge variant={m.role === 'admin' ? 'default' : 'secondary'}>
                        {roleLabel[m.role] ?? m.role}
                      </Badge>
                      {isPending && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Gửi lại email mời"
                          disabled={isResending}
                          onClick={() => resendInvite(m.id)}
                        >
                          <Mail className="size-4" />
                        </Button>
                      )}
                      {m.id !== user?.id && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setMemberToRemove(m)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mời thành viên mới</DialogTitle>
            <DialogDescription>
              Hệ thống sẽ gửi email chứa link kích hoạt. Thành viên tự đặt mật khẩu — Admin không
              biết mật khẩu của họ.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Họ tên</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="keto@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vai trò</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accountant">Kế toán</SelectItem>
                  <SelectItem value="viewer">Chỉ xem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => invite()} disabled={inviting || !form.name || !form.email}>
              {inviting ? 'Đang gửi...' : 'Gửi lời mời'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Xóa thành viên?"
        description={
          memberToRemove
            ? `Bạn sắp xóa "${memberToRemove.name}" (${memberToRemove.email}) khỏi doanh nghiệp. Hành động này không thể hoàn tác.`
            : ''
        }
        confirmLabel="Xóa thành viên"
        variant="destructive"
        loading={removing}
        onConfirm={() => {
          if (memberToRemove) remove(memberToRemove.id);
        }}
      />
    </>
  );
}
