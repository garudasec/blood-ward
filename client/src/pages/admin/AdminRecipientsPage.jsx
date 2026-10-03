import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  Ban,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Inbox,
  X,
  Phone,
  Mail,
  MapPin,
  FileText,
} from 'lucide-react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { adminService } from '../../services/adminService';

export default function AdminRecipientsPage() {
  const [recipients, setRecipients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [feedback, setFeedback] = useState('');
  const [targetForDelete, setTargetForDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecipients = async () => {
    setIsLoading(true);
    try {
      const params = { role: 'recipient' };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await adminService.getUsers(params);
      if (res && res.users) {
        setRecipients(
          res.users.map((u) => ({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            city: u.city || 'N/A',
            state: u.state || 'N/A',
            accountStatus: u.isBlocked ? 'Blocked' : 'Active',
            isBlocked: u.isBlocked,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch recipients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipients();
  }, [searchQuery]);

  const handleToggleBlock = async (id) => {
    const target = recipients.find((r) => r.id === id);
    if (!target) return;
    try {
      if (target.isBlocked) {
        await adminService.unblockUser(id);
        setFeedback(`Recipient ${target.fullName} unblocked successfully.`);
      } else {
        await adminService.blockUser(id);
        setFeedback(`Recipient ${target.fullName} blocked successfully.`);
      }
      fetchRecipients();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      alert(err.message || 'Action failed.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!targetForDelete) return;
    setIsDeleting(true);
    try {
      await adminService.deactivateUser(targetForDelete.id);
      setFeedback(`Recipient ${targetForDelete.fullName} account deactivated.`);
      setTargetForDelete(null);
      fetchRecipients();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      alert(err.message || 'Deactivation failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = recipients.filter((r) => {
    return statusFilter === 'ALL' || r.accountStatus === statusFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-theme-primary tracking-tight">
              Manage Recipient Accounts
            </h1>
          </div>
          <p className="text-xs text-theme-secondary">
            View registered blood recipients and perform administrative governance
          </p>
        </div>

        <button
          onClick={fetchRecipients}
          className="p-2.5 rounded-xl bg-theme-subtle hover:bg-theme-surface text-theme-secondary hover:text-theme-primary transition-colors"
          title="Refresh recipients"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            {feedback}
          </span>
          <button onClick={() => setFeedback('')} className="text-amber-700 hover:text-amber-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-theme-card p-4 sm:p-6 rounded-3xl border border-theme shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-theme-muted absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search name, email, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-theme bg-theme-surface text-theme-primary pl-9 pr-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-theme-surface px-3 py-2 rounded-xl border border-theme text-xs">
            <Filter className="w-3.5 h-3.5 text-theme-muted" />
            <span className="text-slate-500">Account Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-bold text-theme-primary bg-transparent outline-none cursor-pointer w-full"
            >
              <option className="bg-theme-card text-theme-primary" value="ALL">All Statuses</option>
              <option className="bg-theme-card text-theme-primary" value="Active">Active Only</option>
              <option className="bg-theme-card text-theme-primary" value="Blocked">Blocked Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-theme-card p-12 rounded-3xl border border-theme text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-theme-primary text-base">No recipients match criteria</h3>
          <p className="text-xs text-theme-secondary max-w-md mx-auto">
            Try adjusting your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="bg-theme-card rounded-3xl border border-theme shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-theme-table-header border-b border-theme text-[11px] font-bold uppercase tracking-wider text-theme-secondary">
                  <th className="py-3.5 px-6">Recipient Info</th>
                  <th className="py-3.5 px-6">Location</th>
                  <th className="py-3.5 px-6">Account Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme text-xs text-theme-secondary">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-theme-surface/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-theme-primary">{r.fullName}</div>
                      <div className="text-[11px] text-theme-muted flex items-center gap-2 pt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-theme-muted" />{r.email}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-theme-muted" />{r.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-theme-primary">
                      {r.city}{r.state ? `, ${r.state}` : ''}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          r.accountStatus === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.accountStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleToggleBlock(r.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          r.accountStatus === 'Active'
                            ? 'bg-theme-subtle hover:bg-rose-500/20 text-theme-secondary hover:text-rose-600'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                        }`}
                      >
                        {r.accountStatus === 'Active' ? 'Block' : 'Unblock'}
                      </button>

                      <button
                        onClick={() => setTargetForDelete(r)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center"
                        title="Deactivate Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!targetForDelete}
        title="Deactivate Recipient Account"
        message={`Are you sure you want to deactivate the recipient account for "${targetForDelete?.fullName}" (${targetForDelete?.email})?`}
        confirmText="Deactivate Account"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setTargetForDelete(null)}
      />
    </div>
  );
}
