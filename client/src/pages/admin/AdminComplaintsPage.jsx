import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Eye,
  AlertTriangle,
  Building2,
  Clock,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import Button from '../../components/common/Button';
import AdminComplaintDetailModal from '../../components/admin/AdminComplaintDetailModal';
import { complaintService } from '../../services/complaintService';

const STATUS_PILLS = {
  Submitted: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900',
  'Under Review': 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900',
  Investigation: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900',
  Resolved: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900',
  Rejected: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900',
};

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await complaintService.getAdminComplaints(params);
      if (res && res.complaints) {
        setComplaints(res.complaints);
      }
    } catch (err) {
      console.error('Failed to fetch admin complaints:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchComplaints();
  };

  const stats = {
    total: complaints.length,
    active: complaints.filter((c) => ['Submitted', 'Under Review', 'Investigation'].includes(c.status)).length,
    resolved: complaints.filter((c) => c.status === 'Resolved').length,
    rejected: complaints.filter((c) => c.status === 'Rejected').length,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#A61B2B]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Hospital Misconduct & Patient Complaints
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Administrative investigation dashboard for hospital blood request disputes, diversion allegations, and clinical grievances.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchComplaints}
          isLoading={isLoading}
          className="self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh Registry
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Grievances</span>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-600">Active Investigations</span>
          <div className="text-2xl font-bold text-yellow-600">{stats.active}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">Resolved Cases</span>
          <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Dismissed</span>
          <div className="text-2xl font-bold text-zinc-500">{stats.rejected}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by Complaint ID, description keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-1 focus:ring-zinc-950"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Investigation">Investigation</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading complaint dossiers...
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Inbox className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              No Complaints Found
            </div>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              There are currently no hospital misconduct complaints matching the selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Complaint ID</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Hospital Entity</th>
                  <th className="py-3 px-4">Patient Subject</th>
                  <th className="py-3 px-4">Complainant</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Filed Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {complaints.map((c) => (
                  <tr key={c._id || c.id} className="hover:bg-zinc-50/75 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#A61B2B]">
                      {c.complaintId}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {c.category}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300">
                      <div className="font-semibold">{c.hospital?.name || c.bloodRequest?.hospitalName || 'Hospital'}</div>
                      <div className="text-[10px] text-zinc-400">{c.hospital?.city || c.bloodRequest?.city || ''}</div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300">
                      <div>{c.patient?.name || c.bloodRequest?.recipientName || 'Recipient'}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {c.patient ? `Reg: ${c.patient.hospitalRegistrationNumber || 'N/A'}` : 'Direct Request'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {c.complainant?.fullName || 'Anonymous'}
                      </div>
                      <div className="text-[10px] text-zinc-400 capitalize">
                        {c.complainantType === 'family_member'
                          ? 'Family Member'
                          : c.complainantType === 'donor'
                          ? 'Donor'
                          : c.complainantType === 'recipient'
                          ? 'Recipient'
                          : c.complainantType === 'public'
                          ? 'Public'
                          : 'Patient'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_PILLS[c.status] || STATUS_PILLS.Submitted}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedComplaint(c)}
                        className="text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Inspect Dossier
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedComplaint && (
        <AdminComplaintDetailModal
          isOpen={Boolean(selectedComplaint)}
          onClose={() => setSelectedComplaint(null)}
          complaint={selectedComplaint}
          onStatusUpdated={(updated) => {
            setComplaints((prev) =>
              prev.map((c) => ((c._id || c.id) === (updated._id || updated.id) ? updated : c))
            );
            setSelectedComplaint(updated);
          }}
        />
      )}
    </div>
  );
}
