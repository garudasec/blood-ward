import React, { useState } from 'react';
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

export default function AdminDonorsPage() {
  const [donors, setDonors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [feedback, setFeedback] = useState('');
  const [targetDonorForDelete, setTargetDonorForDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleBlock = (donorId) => {
    setDonors((prev) =>
      prev.map((d) => {
        if (d.id === donorId) {
          const newStatus = d.accountStatus === 'Active' ? 'Blocked' : 'Active';
          setFeedback(`Donor ${d.fullName} account status changed to ${newStatus}. Logged in audit trail.`);
          return { ...d, accountStatus: newStatus };
        }
        return d;
      })
    );
    setTimeout(() => setFeedback(''), 4000);
  };

  const handleConfirmDelete = () => {
    if (!targetDonorForDelete) return;
    setIsDeleting(true);
    setTimeout(() => {
      setDonors((prev) => prev.filter((d) => d.id !== targetDonorForDelete.id));
      setIsDeleting(false);
      setFeedback(`Donor ${targetDonorForDelete.fullName} account deactivated and audit logged.`);
      setTargetDonorForDelete(null);
      setTimeout(() => setFeedback(''), 4000);
    }, 400);
  };

  const filteredDonors = donors.filter((donor) => {
    const matchesSearch =
      donor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donor.phone.includes(searchQuery) ||
      donor.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = bloodGroupFilter === 'ALL' || donor.bloodGroup === bloodGroupFilter;
    const matchesStatus = statusFilter === 'ALL' || donor.accountStatus === statusFilter;
    return matchesSearch && matchesGroup && matchesStatus;
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
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search name, email, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Blood Group:</span>
            <select
              value={bloodGroupFilter}
              onChange={(e) => setBloodGroupFilter(e.target.value)}
              className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Groups</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Account Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Blocked">Blocked Only</option>
            </select>
          </div>
        </div>

        {(searchQuery || bloodGroupFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500">
              Showing {filteredDonors.length} matching donors
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setBloodGroupFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-red-600 font-bold hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Donors Table / Card View */}
      {filteredDonors.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-slate-800 text-base">No donors match criteria</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search keywords or resetting filters.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Donor Info</th>
                  <th className="py-3.5 px-6">Blood Group</th>
                  <th className="py-3.5 px-6">Location</th>
                  <th className="py-3.5 px-6">Availability</th>
                  <th className="py-3.5 px-6">Account Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredDonors.map((donor) => (
                  <tr key={donor.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{donor.fullName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{donor.email}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{donor.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <BloodGroupBadge group={donor.bloodGroup} size="sm" />
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      {donor.city}
                    </td>
                    <td className="py-4 px-6">
                      {donor.isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
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
                            ? 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700'
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

          {/* Mobile Card List Fallback */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredDonors.map((donor) => (
              <div key={donor.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-900 text-sm">{donor.fullName}</h4>
                    <BloodGroupBadge group={donor.bloodGroup} size="sm" />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      donor.accountStatus === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {donor.accountStatus}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>{donor.email}</p>
                  <p>{donor.phone}</p>
                  <p>Location: <strong>{donor.city}</strong></p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleBlock(donor.id)}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 underline"
                  >
                    {donor.accountStatus === 'Active' ? 'Block Account' : 'Unblock Account'}
                  </button>

                  <button
                    onClick={() => setTargetDonorForDelete(donor)}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Deactivate Donor
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filteredDonors.length} of {donors.length} donor accounts</span>
            <div className="flex items-center gap-2">
              <button disabled className="px-3 py-1 rounded bg-slate-200 text-slate-400 font-semibold cursor-not-allowed">
                Prev
              </button>
              <button disabled className="px-3 py-1 rounded bg-slate-200 text-slate-400 font-semibold cursor-not-allowed">
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
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