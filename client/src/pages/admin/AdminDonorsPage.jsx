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
  UserCheck,
  X,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import BloodGroupBadge from '../../components/common/BloodGroupBadge';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { BLOOD_GROUPS } from '../../constants/theme';
import { adminService } from '../../services/adminService';

export default function AdminDonorsPage() {
  const [donors, setDonors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [feedback, setFeedback] = useState('');
  const [targetDonorForDelete, setTargetDonorForDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDonors = async () => {
    setIsLoading(true);
    try {
      const params = { role: 'donor' };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await adminService.getUsers(params);
      if (res && res.users) {
        setDonors(
          res.users.map((u) => ({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            bloodGroup: u.bloodGroup || 'N/A',
            city: u.city || 'N/A',
            isAvailable: u.availability === 'available',
            accountStatus: u.isBlocked ? 'Blocked' : 'Active',
            isBlocked: u.isBlocked,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch donors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, [searchQuery]);

  const handleToggleBlock = async (donorId) => {
    const target = donors.find((d) => d.id === donorId);
    if (!target) return;
    try {
      if (target.isBlocked) {
        await adminService.unblockUser(donorId);
        setFeedback(`Donor ${target.fullName} unblocked successfully.`);
      } else {
        await adminService.blockUser(donorId);
        setFeedback(`Donor ${target.fullName} blocked successfully.`);
      }
      fetchDonors();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      alert(err.message || 'Action failed.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!targetDonorForDelete) return;
    setIsDeleting(true);
    try {
      await adminService.deactivateUser(targetDonorForDelete.id);
      setFeedback(`Donor ${targetDonorForDelete.fullName} account deactivated.`);
      setTargetDonorForDelete(null);
      fetchDonors();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      alert(err.message || 'Deactivation failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDonors = donors.filter((donor) => {
    const matchesGroup = bloodGroupFilter === 'ALL' || donor.bloodGroup === bloodGroupFilter;
    const matchesStatus = statusFilter === 'ALL' || donor.accountStatus === statusFilter;
    return matchesGroup && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-600 text-white">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Manage Donor Accounts
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            View, audit, block/unblock, or deactivate blood donor registrations
          </p>
        </div>

        <button
          onClick={fetchDonors}
          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Refresh donors"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-theme-muted absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search name, email, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-theme bg-theme-surface text-theme-primary pl-9 pr-3 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-theme-surface px-3 py-2 rounded-xl border border-theme text-xs">
            <Filter className="w-3.5 h-3.5 text-theme-muted" />
            <span className="text-theme-muted">Blood Group:</span>
            <select
              value={bloodGroupFilter}
              onChange={(e) => setBloodGroupFilter(e.target.value)}
              className="font-bold text-theme-primary bg-transparent outline-none cursor-pointer w-full"
            >
              <option className="bg-theme-card text-theme-primary" value="ALL">All Blood Groups</option>
              {BLOOD_GROUPS.map((g) => (
                <option className="bg-theme-card text-theme-primary" key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-theme-surface px-3 py-2 rounded-xl border border-theme text-xs">
            <Filter className="w-3.5 h-3.5 text-theme-muted" />
            <span className="text-theme-muted">Account Status:</span>
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

      {/* Donors Table */}
      {filteredDonors.length === 0 ? (
        <div className="bg-theme-card p-12 rounded-3xl border border-theme text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-theme-primary text-base">No donors match criteria</h3>
          <p className="text-xs text-theme-secondary max-w-md mx-auto">
            Try adjusting your search keywords or resetting filters.
          </p>
        </div>
      ) : (
        <div className="bg-theme-card rounded-3xl border border-theme shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-theme-table-header border-b border-theme text-[11px] font-bold uppercase tracking-wider text-theme-secondary">
                  <th className="py-3.5 px-6">Donor Info</th>
                  <th className="py-3.5 px-6">Blood Group</th>
                  <th className="py-3.5 px-6">Location</th>
                  <th className="py-3.5 px-6">Availability</th>
                  <th className="py-3.5 px-6">Account Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme text-xs text-theme-secondary">
                {filteredDonors.map((donor) => (
                  <tr key={donor.id} className="hover:bg-theme-surface/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-theme-primary">{donor.fullName}</div>
                      <div className="text-[11px] text-theme-muted flex items-center gap-2 pt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-theme-muted" />{donor.email}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-theme-muted" />{donor.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <BloodGroupBadge group={donor.bloodGroup} size="sm" />
                    </td>
                    <td className="py-4 px-6 font-semibold text-theme-primary">
                      {donor.city}
                    </td>
                    <td className="py-4 px-6">
                      {donor.isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-theme-subtle px-2.5 py-0.5 rounded-full border border-theme text-theme-muted">
                          Not Available
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          donor.accountStatus === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {donor.accountStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleToggleBlock(donor.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          donor.accountStatus === 'Active'
                            ? 'bg-theme-subtle hover:bg-rose-500/20 text-theme-secondary hover:text-rose-600'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                        }`}
                      >
                        {donor.accountStatus === 'Active' ? 'Block' : 'Unblock'}
                      </button>

                      <button
                        onClick={() => setTargetDonorForDelete(donor)}
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
        isOpen={!!targetDonorForDelete}
        title="Deactivate Donor Account"
        message={`Are you sure you want to deactivate the donor account for "${targetDonorForDelete?.fullName}" (${targetDonorForDelete?.email})?`}
        confirmText="Deactivate Account"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setTargetDonorForDelete(null)}
      />
    </div>
  );
}
