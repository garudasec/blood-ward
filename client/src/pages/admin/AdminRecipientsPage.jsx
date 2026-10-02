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
  X,
  Phone,
  Mail,
  MapPin,
  FileText,
} from 'lucide-react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function AdminRecipientsPage() {
  const [recipients, setRecipients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [feedback, setFeedback] = useState('');
  const [targetForDelete, setTargetForDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleBlock = (id) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const newStatus = r.accountStatus === 'Active' ? 'Blocked' : 'Active';
          setFeedback(`Recipient ${r.fullName} account status changed to ${newStatus}. Logged in audit trail.`);
          return { ...r, accountStatus: newStatus };
        }
        return r;
      })
    );
    setTimeout(() => setFeedback(''), 4000);
  };

  const handleConfirmDelete = () => {
    if (!targetForDelete) return;
    setIsDeleting(true);
    setTimeout(() => {
      setRecipients((prev) => prev.filter((r) => r.id !== targetForDelete.id));
      setIsDeleting(false);
      setFeedback(`Recipient ${targetForDelete.fullName} account deactivated and audit logged.`);
      setTargetForDelete(null);
      setTimeout(() => setFeedback(''), 4000);
    }, 400);
  };

  const filtered = recipients.filter((r) => {
    const matchesSearch =
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery) ||
      r.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.accountStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Manage Recipient Accounts
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            View, audit, block/unblock, or deactivate recipient registrations
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search name, email, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
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

        {(searchQuery || statusFilter !== 'ALL') && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500">
              Showing {filtered.length} matching recipients
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="text-blue-600 font-bold hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Table / Card View */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-slate-800 text-base">No recipients match criteria</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Recipient Info</th>
                  <th className="py-3.5 px-6">Location</th>
                  <th className="py-3.5 px-6">Requests Issued</th>
                  <th className="py-3.5 px-6">Account Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filtered.map((recipient) => (
                  <tr key={recipient.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{recipient.fullName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{recipient.email}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{recipient.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      {recipient.city}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {recipient.totalRequestsIssued} Request(s)
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          recipient.accountStatus === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {recipient.accountStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleToggleBlock(recipient.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          recipient.accountStatus === 'Active'
                            ? 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                        }`}
                      >
                        {recipient.accountStatus === 'Active' ? 'Block' : 'Unblock'}
                      </button>

                      <button
                        onClick={() => setTargetForDelete(recipient)}
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
            {filtered.map((recipient) => (
              <div key={recipient.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-sm">{recipient.fullName}</h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      recipient.accountStatus === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {recipient.accountStatus}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>{recipient.email}</p>
                  <p>{recipient.phone}</p>
                  <p>Location: <strong>{recipient.city}</strong></p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleBlock(recipient.id)}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 underline"
                  >
                    {recipient.accountStatus === 'Active' ? 'Block Account' : 'Unblock Account'}
                  </button>

                  <button
                    onClick={() => setTargetForDelete(recipient)}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Deactivate Recipient
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filtered.length} of {recipients.length} recipient accounts</span>
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

      {/* Deactivation Confirmation Modal */}
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