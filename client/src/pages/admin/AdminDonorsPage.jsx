import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { PageHeader, LoadingSkeleton, AppButton, ConfirmDialog, EmptyState } from '../../components/app/UI';
import { BloodGroupBadge, AvailabilityBadge } from '../../components/app/Badges';
import { getAdminDonors, updateDonorStatus, deleteDonor } from '../../services/adminService';
import { BLOOD_GROUPS } from '../../constants';

export default function AdminDonorsPage() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, type: null, donor: null });
  const [toast, setToast] = useState(null);

  const fetchDonors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminDonors({ search, bloodGroup: selectedGroup, status: selectedStatus });
      setDonors(res.donors || []);
    } catch {
      // service handles mock fallbacks
    } finally {
      setLoading(false);
    }
  }, [search, selectedGroup, selectedStatus]);

  useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleStatus = async (donor) => {
    const nextStatus = donor.status === 'blocked' ? 'active' : 'blocked';
    setActionLoading(true);
    try {
      await updateDonorStatus(donor._id, nextStatus);
      setDonors(prev => prev.map(d => d._id === donor._id ? { ...d, status: nextStatus } : d));
      showToast("Donor " + donor.name + " is now " + nextStatus + ".");
    } catch (err) {
      showToast(err.message || 'Failed to update donor status', 'error');
    } finally {
      setActionLoading(false);
      setConfirmState({ open: false, type: null, donor: null });
    }
  };

  const handleDeleteDonor = async (donor) => {
    setActionLoading(true);
    try {
      await deleteDonor(donor._id);
      setDonors(prev => prev.filter(d => d._id !== donor._id));
      showToast("Donor account for " + donor.name + " deleted successfully.");
    } catch (err) {
      showToast(err.message || 'Failed to delete donor account', 'error');
    } finally {
      setActionLoading(false);
      setConfirmState({ open: false, type: null, donor: null });
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Donor Management"
        subtitle="Review, search, and manage registered blood donor accounts"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white/50 glass px-3 py-1.5 rounded-xl border border-white/08">
              Total Donors: {donors.length}
            </span>
          </div>
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
            placeholder="Search donors by name, email, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/04 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2.5 bg-white/04 border border-white/10 rounded-xl text-xs text-white/80 focus:outline-none focus:border-red-500/50"
          >
            <option value="" className="bg-[#111116]">All Blood Groups</option>
            {BLOOD_GROUPS.map(g => (
              <option key={g} value={g} className="bg-[#111116]">{g}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2.5 bg-white/04 border border-white/10 rounded-xl text-xs text-white/80 focus:outline-none focus:border-red-500/50"
          >
            <option value="" className="bg-[#111116]">All Statuses</option>
            <option value="active" className="bg-[#111116]">Active</option>
            <option value="blocked" className="bg-[#111116]">Blocked</option>
            <option value="suspended" className="bg-[#111116]">Suspended</option>
          </select>
        </div>
      </div>

      {/* Donors Table */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : donors.length === 0 ? (
        <EmptyState
          title="No Donors Found"
          description="No donor accounts match your current search or filter criteria."
          action={
            <AppButton size="sm" variant="secondary" onClick={() => { setSearch(''); setSelectedGroup(''); setSelectedStatus(''); }}>
              Reset Filters
            </AppButton>
          }
        />
      ) : (
        <div className="glass rounded-2xl border border-white/08 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/08 bg-white/02 text-[11px] font-bold text-white/40 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Donor Name & Email</th>
                  <th className="py-3.5 px-4">Blood Group</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Availability</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/06 text-xs text-white/80">
                {donors.map(donor => (
                  <tr key={donor._id} className="hover:bg-white/03 transition-colors">
                    <td className="py-4 px-4 font-medium">
                      <div className="text-white font-semibold text-sm">{donor.name}</div>
                      <div className="text-white/40 text-xs font-mono">{donor.email}</div>
                    </td>
                    <td className="py-4 px-4">
                      <BloodGroupBadge group={donor.bloodGroup} size="sm" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-white/80">{donor.city}</div>
                      <div className="text-white/40 text-[11px]">{donor.area || 'General Area'}</div>
                    </td>
                    <td className="py-4 px-4">
                      <AvailabilityBadge available={donor.available} />
                    </td>
                    <td className="py-4 px-4">
                      <span className={"inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider " + (
                        donor.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        donor.status === 'blocked' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      )}>
                        {donor.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-white/40 font-mono text-[11px]">
                      {new Date(donor.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => setConfirmState({ open: true, type: 'toggle', donor })}
                        className={"px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors " + (
                          donor.status === 'blocked' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                        )}
                      >
                        {donor.status === 'blocked' ? 'Unblock' : 'Block'}
                      </button>
                      <button
                        onClick={() => setConfirmState({ open: true, type: 'delete', donor })}
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

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.type === 'delete' ? 'Delete Donor Account' : ((confirmState.donor?.status === 'blocked' ? 'Unblock' : 'Block') + ' Donor Account')}
        message={
          confirmState.type === 'delete' 
            ? ("Are you sure you want to permanently remove " + confirmState.donor?.name + "? This action cannot be undone.")
            : ("Are you sure you want to " + (confirmState.donor?.status === 'blocked' ? 'unblock' : 'block') + " " + confirmState.donor?.name + "?")
        }
        confirmLabel={confirmState.type === 'delete' ? 'Delete Account' : confirmState.donor?.status === 'blocked' ? 'Unblock Account' : 'Block Account'}
        confirmVariant={confirmState.type === 'delete' ? 'danger' : confirmState.donor?.status === 'blocked' ? 'success' : 'danger'}
        loading={actionLoading}
        onConfirm={() => confirmState.type === 'delete' ? handleDeleteDonor(confirmState.donor) : handleToggleStatus(confirmState.donor)}
        onCancel={() => setConfirmState({ open: false, type: null, donor: null })}
      />
    </AdminLayout>
  );
}
