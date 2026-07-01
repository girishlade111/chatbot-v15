'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Ban, CheckCircle, Search, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  credits: number;
  totalTokens: number;
  banned: boolean;
  createdAt: string;
}

interface UserTableProps {
  users: User[];
  onAction: (userId: string, action: string, value?: string | number) => Promise<void>;
}

type SortKey = 'email' | 'name' | 'role' | 'credits' | 'totalTokens' | 'createdAt';

export function UserTable({ users, onAction }: UserTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [confirmAction, setConfirmAction] = useState<{ user: User; action: string } | null>(null);
  const [actionValue, setActionValue] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      let cmp: number;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  async function handleConfirm() {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      await onAction(confirmAction.user.id, confirmAction.action, actionValue || undefined);
      toast.success(`User ${confirmAction.action} successful`);
      setConfirmAction(null);
      setActionValue('');
    } catch {
      toast.error('Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  function openConfirm(user: User, action: string) {
    setConfirmAction({ user, action });
    setActionValue('');
  }

  const SortHeader = ({ sortKey: sk, label }: { sortKey: SortKey; label: string }) => (
    <button
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => toggleSort(sk)}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
        <Search className="h-8 w-8" />
        <p className="text-sm">No users found</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            className="pl-9 max-w-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left"><SortHeader sortKey="email" label="Email" /></th>
              <th className="px-4 py-3 text-left"><SortHeader sortKey="name" label="Name" /></th>
              <th className="px-4 py-3 text-left"><SortHeader sortKey="role" label="Role" /></th>
              <th className="px-4 py-3 text-right"><SortHeader sortKey="credits" label="Credits" /></th>
              <th className="px-4 py-3 text-right"><SortHeader sortKey="totalTokens" label="Tokens" /></th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-left"><SortHeader sortKey="createdAt" label="Created" /></th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((user, i) => (
              <motion.tr
                key={user.id}
                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
              >
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {user.role.toLowerCase()}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{user.credits.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums">{user.totalTokens.toLocaleString()}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${user.banned ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    <span className="text-xs">{user.banned ? 'Banned' : 'Active'}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {format(new Date(user.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {user.banned ? (
                      <Button variant="ghost" size="sm" onClick={() => openConfirm(user, 'unban')}>
                        <CheckCircle className="h-4 w-4 mr-1 text-emerald-500" />
                        Unban
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => openConfirm(user, 'ban')}>
                        <Ban className="h-4 w-4 mr-1 text-red-500" />
                        Ban
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openConfirm(user, 'setCredits')}>
                      Credits
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openConfirm(user, 'setRole')}>
                      Role
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Showing {sorted.length} of {users.length} users
      </p>

      <Dialog open={!!confirmAction} onClose={() => { if (!actionLoading) setConfirmAction(null); }}>
        {confirmAction && (
          <>
            <DialogTitle>
              {confirmAction.action === 'ban' && 'Ban User'}
              {confirmAction.action === 'unban' && 'Unban User'}
              {confirmAction.action === 'setCredits' && 'Set Credits'}
              {confirmAction.action === 'setRole' && 'Change Role'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction.action === 'ban' && `Are you sure you want to ban ${confirmAction.user.email}?`}
              {confirmAction.action === 'unban' && `Unban ${confirmAction.user.email}?`}
              {confirmAction.action === 'setCredits' && `Set credit amount for ${confirmAction.user.email}`}
              {confirmAction.action === 'setRole' && `Change role for ${confirmAction.user.email}`}
            </DialogDescription>

            {(confirmAction.action === 'setCredits' || confirmAction.action === 'setRole') && (
              <div className="mb-4">
                {confirmAction.action === 'setCredits' ? (
                  <Input
                    type="number"
                    placeholder="Enter credit amount"
                    value={actionValue}
                    onChange={e => setActionValue(e.target.value)}
                  />
                ) : (
                  <Select
                    value={actionValue}
                    onChange={e => setActionValue(e.target.value)}
                    options={[
                      { value: 'USER', label: 'User' },
                      { value: 'ADMIN', label: 'Admin' },
                    ]}
                  />
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant={confirmAction.action === 'ban' ? 'destructive' : 'default'}
                onClick={handleConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
