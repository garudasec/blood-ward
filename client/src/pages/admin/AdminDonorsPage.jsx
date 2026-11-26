import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Inbox,
  X,
  Phone,
  Mail,
  Eye,
  HeartHandshake,
  AlertCircle,
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
  const [selectedDonorDetail, setSelectedDonorDetail] = useState(null);
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
            state: u.state || 'N/A',
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

  const handleInspectDonor = async (donorId) => {
    try {
      const res = await adminService.getUserById(donorId);
      if (res && res.user) {
        setSelectedDonorDetail(res.user);
      }
    } catch (err) {
      alert(err.message || 'Failed to fetch donor details.');
    }
  };

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
      if (selectedDonorDetail && selectedDonorDetail.id === donorId) {
        setSelectedDonorDetail((prev) => ({ ...prev, isBlocked: !target.isBlocked }));
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
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Manage Donor Accounts
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View, audit, block/unblock, or deactivate blood donor registrations
          </p>
        </div>

        <button
          onClick={fetchDonors}
          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer shadow-xs"
          title="Refresh donors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center justify-between shadow-2xs">
          <span className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            {feedback}
          </span>
          <button onClick={() => setFeedback('')} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, email, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 pl-9 pr-3 py-2 outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:focus:border-zinc-200 dark:focus:ring-zinc-200"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Blood Group:</span>
            <select
              value={bloodGroupFilter}
              onChange={(e) => setBloodGroupFilter(e.target.value)}
              className="font-medium text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer w-full text-xs"
            >
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="ALL">All Blood Groups</option>
              {BLOOD_GROUPS.map((g) => (
                <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Account Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-medium text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer w-full text-xs"
            >
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="ALL">All Statuses</option>
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="Active">Active Only</option>
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="Blocked">Blocked Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Donors Table */}
      {filteredDonors.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-900 dark:text-white text-base">No donors match criteria</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search keywords or resetting filters.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-5">Donor Info</th>
                  <th className="py-3 px-5">Blood Group</th>
                  <th className="py-3 px-5">Location</th>
                  <th className="py-3 px-5">Availability</th>
                  <th className="py-3 px-5">Account Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-600 dark:text-slate-300">
                {filteredDonors.map((donor) => (
                  <tr key={donor.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900 dark:text-white">{donor.fullName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{donor.email}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{donor.phone?.startsWith('+91') ? donor.phone : `+91 ${donor.phone}`}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <BloodGroupBadge group={donor.bloodGroup} size="sm" />
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-800 dark:text-slate-200">
                      {donor.city}
                    </td>
                    <td className="py-3.5 px-5">
                      {donor.isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                          Unavailable
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          donor.accountStatus === 'Active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {donor.accountStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleInspectDonor(donor.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center cursor-pointer"
                        title="Inspect Donor Profile & Health"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleBlock(donor.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                          donor.accountStatus === 'Active'
                            ? 'bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 border-slate-200 dark:border-slate-700'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {donor.accountStatus === 'Active' ? 'Block' : 'Unblock'}
                      </button>

                      <button
                        onClick={() => setTargetDonorForDelete(donor)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors inline-flex items-center cursor-pointer"
                        title="Deactivate Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DONOR INSPECTION MODAL */}
      {selectedDonorDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden space-y-0">
            {/* Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Donor Clinical & Account Inspection
                </h3>
              </div>
              <button
                onClick={() => setSelectedDonorDetail(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedDonorDetail.fullName}
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    {selectedDonorDetail.email} • {selectedDonorDetail.phone}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <BloodGroupBadge group={selectedDonorDetail.bloodGroup} size="sm" />
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedDonorDetail.availability === 'available'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {selectedDonorDetail.availability === 'available' ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>

              {/* Geographic Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedDonorDetail.city || 'N/A'}{selectedDonorDetail.state ? `, ${selectedDonorDetail.state}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Birth</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedDonorDetail.dateOfBirth || 'Not specified'}
                  </span>
                </div>
              </div>

              {/* Self-Reported Health Questionnaire */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                    Self-Reported Health Questionnaire
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {selectedDonorDetail.healthQuestionnaire?.updatedAt
                      ? `Updated ${new Date(selectedDonorDetail.healthQuestionnaire.updatedAt).toLocaleDateString()}`
                      : 'Initial Screening'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Current Weight</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedDonorDetail.healthQuestionnaire?.currentWeight
                        ? `${selectedDonorDetail.healthQuestionnaire.currentWeight} kg`
                        : 'Not reported'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px]">Previous Donation</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedDonorDetail.healthQuestionnaire?.previousDonation ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px]">Recent Illness / Fever</span>
                    <span className={`font-bold ${selectedDonorDetail.healthQuestionnaire?.recentIllnessOrFever ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                      {selectedDonorDetail.healthQuestionnaire?.recentIllnessOrFever ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px]">Recent Surgery</span>
                    <span className={`font-bold ${selectedDonorDetail.healthQuestionnaire?.recentSurgery ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                      {selectedDonorDetail.healthQuestionnaire?.recentSurgery ? 'Yes' : 'No'}
                    </span>
                  </div>

                  {selectedDonorDetail.healthQuestionnaire?.lastDonationDate && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[10px]">Last Donation Date</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {selectedDonorDetail.healthQuestionnaire.lastDonationDate}
                      </span>
                    </div>
                  )}

                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[10px]">Medical Conditions</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedDonorDetail.healthQuestionnaire?.medicalConditions || 'None reported'}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[10px]">Current Medications</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedDonorDetail.healthQuestionnaire?.medications || 'None reported'}
                    </span>
                  </div>

                  {selectedDonorDetail.healthQuestionnaire?.additionalNotes && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[10px]">Additional Notes</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 italic">
                        "{selectedDonorDetail.healthQuestionnaire.additionalNotes}"
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Medical safety disclaimer */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Clinical notice:</strong> Health data is self-reported for preliminary screening only. Operational availability is separate from medical clearance, which must be certified by blood bank personnel at donation.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedDonorDetail(null)}>
                Close
              </Button>

              <button
                onClick={() => handleToggleBlock(selectedDonorDetail.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer border transition-colors ${
                  selectedDonorDetail.isBlocked
                    ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                }`}
              >
                {selectedDonorDetail.isBlocked ? 'Unblock Donor Account' : 'Block Donor Account'}
              </button>
            </div>
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
