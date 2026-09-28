import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { PageHeader, LoadingSkeleton, AppButton, ConfirmDialog, EmptyState } from '../../components/app/UI';
import { getAdminRecipients, updateRecipientStatus, deleteRecipient } from '../../services/adminService';

export default function AdminRecipientsPage() {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, type: null, recipient: null });
  const [toast, setToast] = useState(null);

  const fetchRecipients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminRecipients({ search, status: selectedStatus });
      setRecipients(res.recipients || []);
    } catch {
      // service mock fallback
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleStatus = async (recipient) => {
    const nextStatus = recipient.status === 'blocked' ? 'active' : 'blocked';
    setActionLoading(true);
    try {
      await updateRecipientStatus(recipient._id, nextStatus);
      setRecipients(prev => prev.map(r => r._id === recipient._id ? { ...r, status: nextStatus } : r));
      showToast("Recipient " + recipient.name + " is now " + nextStatus + ".");
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setActionLoading(false);
      setConfirmState({ open: false, type: null, recipient: null });
    }
  };

  const handleDelete = async (recipient) => {
    setActionLoading(true);
    try {
      await deleteRecipient(recipient._id);
      setRecipients(prev => prev.filter(r => r._id !== recipient._id));
      showToast("Recipient account " + recipient.name + " removed successfully.");
    } catch (err) {
      showToast(err.message || 'Failed to remove account', 'error');
    } finally {
      setActionLoading(false);
      setConfirmState({ open: false, type: null, recipient: null });
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Recipient Management"
        subtitle="Monitor and manage registered recipient accounts and emergency requesters"
        action={
          <span className="text-xs font-semibold text-white/50 glass px-3 py-1.5 rounded-xl border border-white/08">
            Total Recipient Accounts: {recipients.length}
          </span>
        }
      />

      {toast && (
        <div className={"mb-6 p-4 rounded-xl border text-sm flex items-center justify-between " + (
          toast.type === 'error' ? 'bg-red-500/15 border-red-500/30 text-red-300' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
        )}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="text-white/40 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass p-4 rounded-2xl border border-white/08 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <input
            type="text"
            placeholder="Search recipients by name, email, phone or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/04 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500/50"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2.5 bg-white/04 border border-white/10 rounded-xl text-xs text-white/80 focus:outline-none focus:border-red-500/50 w-full md:w-auto"
        >
          <option value="" className="bg-[#111116]">All Statuses</option>
          <option value="active" className="bg-[#111116]">Active</option>
          <option value="blocked" className="bg-[#111116]">Blocked</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : recipients.length === 0 ? (
        <EmptyState
          title="No Recipients Found"
          description="No recipient records matched your search query."
          action={
            <AppButton size="sm" variant="secondary" onClick={() => { setSearch(''); setSelectedStatus(''); }}>
              Clear Search
            </AppButton>
          }
        />
      ) : (
        <div className="glass rounded-2xl border border-white/08 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/08 bg-white/02 text-[11px] font-bold text-white/40 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Recipient Contact</th>
                  <th className="py-3.5 px-4">Location / Hospital</th>
                  <th className="py-3.5 px-4">Total Requests</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Joined</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/06 text-xs text-white/80">
                {recipients.map(r => (
                  <tr key={r._id} className="hover:bg-white/03 transition-colors">
                    <td className="py-4 px-4">
                      <div className="text-white font-semibold text-sm">{r.name}</div>
                      <div className="text-white/40 font-mono text-xs">{r.email}</div>
                      {r.phone && <div className="text-white/30 text-[11px]">{r.phone}</div>}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-white/90 font-medium">{r.city}</div>
                      <div className="text-white/40 text-[11px]">{r.hospital || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-white/05 text-white/80 font-mono font-semibold text-xs border border-white/08">
                        {r.totalRequests ?? 0} Requests
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={"inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider " + (
                        r.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      )}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-white/40 font-mono text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => setConfirmState({ open: true, type: 'toggle', recipient: r })}
                        className={"px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors " + (
                          r.status === 'blocked'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                        )}
                      >
                        {r.status === 'blocked' ? 'Unblock' : 'Block'}
                      </button>
                      <button
                        onClick={() => setConfirmState({ open: true, type: 'delete', recipient: r })}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Remove
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
        open={confirmState.open}
        title={confirmState.type === 'delete' ? 'Remove Recipient Account' : ((confirmState.recipient?.status === 'blocked' ? 'Unblock' : 'Block') + ' Recipient')}
        message={
          confirmState.type === 'delete'
            ? ("Are you sure you want to permanently delete recipient account for " + confirmState.recipient?.name + "?")
            : ("Are you sure you want to " + (confirmState.recipient?.status === 'blocked' ? 'unblock' : 'block') + " " + confirmState.recipient?.name + "?")
        }
        confirmLabel={confirmState.type === 'delete' ? 'Delete Account' : confirmState.recipient?.status === 'blocked' ? 'Unblock' : 'Block'}
        confirmVariant={confirmState.type === 'delete' ? 'danger' : confirmState.recipient?.status === 'blocked' ? 'success' : 'danger'}
        loading={actionLoading}
        onConfirm={() => confirmState.type === 'delete' ? handleDelete(confirmState.recipient) : handleToggleStatus(confirmState.recipient)}
        onCancel={() => setConfirmState({ open: false, type: null, recipient: null })}
      />
    </AdminLayout>
  );
}
