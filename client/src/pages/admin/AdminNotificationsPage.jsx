import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Mail,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Edit2,
  Trash2,
  Search,
  Power,
  Server,
} from 'lucide-react';
import { notificationAdminService } from '../../services/notificationAdminService';
import ProviderModal from '../../components/admin/ProviderModal';
import TestProviderModal from '../../components/admin/TestProviderModal';

export default function AdminNotificationsPage() {
  const [activeTab, setActiveTab] = useState('providers'); // 'providers' | 'monitoring'
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsPagination, setLogsPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters for Monitoring
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingProvider, setTestingProvider] = useState(null);

  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Providers and Aggregated Stats
  const fetchProvidersAndStats = useCallback(async () => {
    try {
      const [providersRes, statsRes] = await Promise.all([
        notificationAdminService.getProviders(),
        notificationAdminService.getNotificationStats(),
      ]);
      if (providersRes.success) setProviders(providersRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load providers or stats:', err);
      showNotification('error', 'Failed to load notification providers or metrics.');
    }
  }, []);

  // Fetch Delivery Logs
  const fetchLogs = useCallback(async (page = 1) => {
    try {
      const params = {
        page,
        limit: 15,
        channel: filterChannel || undefined,
        status: filterStatus || undefined,
        search: searchQuery.trim() || undefined,
      };
      const res = await notificationAdminService.getNotificationLogs(params);
      if (res.success) {
        setLogs(res.data);
        setLogsPagination({
          page: res.pagination?.page || 1,
          totalPages: res.pagination?.totalPages || 1,
          total: res.total || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load delivery logs:', err);
      showNotification('error', 'Failed to load delivery logs.');
    }
  }, [filterChannel, filterStatus, searchQuery]);

  // Initial load
  useEffect(() => {
    Promise.all([fetchProvidersAndStats(), fetchLogs(1)]);
  }, [fetchProvidersAndStats, fetchLogs]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchProvidersAndStats(), fetchLogs(currentPage)]);
    setIsRefreshing(false);
    showNotification('success', 'Notification status and logs refreshed.');
  };

  // Provider Actions
  const handleToggleProvider = async (id) => {
    try {
      const res = await notificationAdminService.toggleProvider(id);
      if (res.success) {
        showNotification('success', res.message || 'Provider status updated.');
        await fetchProvidersAndStats();
      }
    } catch (err) {
      showNotification('error', err.message || 'Failed to toggle provider.');
    }
  };

  const handleRecoverProvider = async (id) => {
    try {
      const res = await notificationAdminService.recoverProvider(id);
      if (res.success) {
        showNotification('success', res.message || 'Provider health recovered.');
        await fetchProvidersAndStats();
      }
    } catch (err) {
      showNotification('error', err.message || 'Failed to recover provider health.');
    }
  };

  const handleDeleteProvider = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete notification provider "${name}"?`)) {
      return;
    }
    try {
      const res = await notificationAdminService.deleteProvider(id);
      if (res.success) {
        showNotification('success', res.message || 'Provider removed.');
        await fetchProvidersAndStats();
      }
    } catch (err) {
      showNotification('error', err.message || 'Failed to delete provider.');
    }
  };

  const handleSaveProvider = async (providerData) => {
    if (editingProvider) {
      await notificationAdminService.updateProvider(editingProvider._id, providerData);
      showNotification('success', 'Provider updated successfully.');
    } else {
      await notificationAdminService.createProvider(providerData);
      showNotification('success', 'Provider created successfully.');
    }
    await fetchProvidersAndStats();
  };

  const handleExecuteTest = async (id, testData) => {
    const res = await notificationAdminService.testProvider(id, testData);
    await fetchProvidersAndStats();
    return res;
  };

  const emailProviders = providers.filter((p) => p.providerType === 'email');

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-sm flex items-center gap-3 animate-in slide-in-from-top-2 ${
            notification.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200'
              : 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          {notification.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-red-600" />
            Email Notification System & Delivery Monitoring
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure SMTP email transports, daily quotas, and monitor delivery telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181B20] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditingProvider(null);
              setProviderModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Provider
          </button>
        </div>
      </div>

      {/* Top Channel Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Email Quota Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#181B20] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Email Transport Pool
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats?.quotas?.email?.sentToday || 0}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              / {stats?.quotas?.email?.dailyLimit || 0} today
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  stats?.quotas?.email?.dailyLimit
                    ? Math.round(((stats?.quotas?.email?.sentToday || 0) / stats.quotas.email.dailyLimit) * 100)
                    : 0
                )}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span>{stats?.quotas?.email?.healthyCount || 0} Healthy</span>
            <span>{stats?.quotas?.email?.providersCount || 0} Configured</span>
          </div>
        </div>

        {/* Delivery Success Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#181B20] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Email Dispatches
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats?.overview?.delivered || 0}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Delivered
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Success Rate: {stats?.overview?.successRate !== undefined ? `${stats.overview.successRate}%` : '100%'}
            </span>
          </div>
        </div>

        {/* Failures & Failover incidents */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#181B20] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Failures
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats?.overview?.failed || 0}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Dispatches Failed
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="text-slate-400">
              Total Logged Events: {stats?.overview?.totalLogs || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('providers')}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition ${
            activeTab === 'providers'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Server className="w-4 h-4" />
          Provider Pool ({providers.length})
        </button>
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition ${
            activeTab === 'monitoring'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          Delivery Telemetry & Logs
        </button>
      </div>

      {/* TAB 1: PROVIDER MANAGEMENT */}
      {activeTab === 'providers' && (
        <div className="space-y-8">
          {/* Email Providers Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Email Transports (Gmail / SMTP)
                </h2>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Sorted by Tier Priority (1 = Primary, 2+ = Backup Failover)
              </span>
            </div>

            {emailProviders.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#181B20] border border-slate-200 dark:border-slate-800">
                <Mail className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No Email providers configured</p>
                <p className="text-xs text-slate-400 mt-1">Configure Gmail SMTP or custom relay accounts for email verification.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emailProviders.map((provider) => (
                  <ProviderCard
                    key={provider._id}
                    provider={provider}
                    onToggle={handleToggleProvider}
                    onRecover={handleRecoverProvider}
                    onTest={(p) => {
                      setTestingProvider(p);
                      setTestModalOpen(true);
                    }}
                    onEdit={(p) => {
                      setEditingProvider(p);
                      setProviderModalOpen(true);
                    }}
                    onDelete={handleDeleteProvider}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MONITORING & LOGS */}
      {activeTab === 'monitoring' && (
        <div className="space-y-4">
          {/* Log Filters Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#181B20] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select
                value={filterChannel}
                onChange={(e) => {
                  setFilterChannel(e.target.value);
                  fetchLogs(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121418] text-slate-700 dark:text-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Channels</option>
                <option value="email">Email Only</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  fetchLogs(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121418] text-slate-700 dark:text-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="accepted">Accepted / Queued</option>
                <option value="failed">Failed</option>
                <option value="fallback_triggered">Fallback Triggered</option>
              </select>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search recipient or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121418] text-slate-700 dark:text-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white dark:bg-[#181B20] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#121418] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Provider / Driver</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Purpose</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                        No delivery logs matching the current criteria.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                            <Mail className="w-3.5 h-3.5" />
                            {log.channel}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white">{log.providerName || 'N/A'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{log.driver}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                          {log.recipientMasked}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-[11px]">
                            {log.purpose}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                              log.status === 'delivered'
                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                : log.status === 'accepted' || log.status === 'sent'
                                ? 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                                : log.status === 'fallback_triggered'
                                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                                : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                            }`}
                          >
                            {log.status === 'delivered' && <CheckCircle2 className="w-3 h-3" />}
                            {log.status === 'failed' && <XCircle className="w-3 h-3" />}
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500 max-w-xs truncate">
                          {log.errorDetails ? (
                            <span className="text-red-600 dark:text-red-400" title={log.errorDetails}>
                              {log.errorDetails}
                            </span>
                          ) : log.metadata?.messageId ? (
                            <span className="font-mono text-[10px]">ID: {log.metadata.messageId}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {logsPagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Page {logsPagination.page} of {logsPagination.totalPages} ({logsPagination.total} total logs)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={logsPagination.page <= 1}
                    onClick={() => {
                      setCurrentPage((p) => p - 1);
                      fetchLogs(logsPagination.page - 1);
                    }}
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={logsPagination.page >= logsPagination.totalPages}
                    onClick={() => {
                      setCurrentPage((p) => p + 1);
                      fetchLogs(logsPagination.page + 1);
                    }}
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Provider Create/Edit Modal */}
      <ProviderModal
        isOpen={providerModalOpen}
        onClose={() => setProviderModalOpen(false)}
        editingProvider={editingProvider}
        onSave={handleSaveProvider}
      />

      {/* Test Provider Modal */}
      <TestProviderModal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        provider={testingProvider}
        onExecuteTest={handleExecuteTest}
      />
    </div>
  );
}

// Subcomponent: Provider Card
function ProviderCard({ provider, onToggle, onRecover, onTest, onEdit, onDelete }) {
  const quotaPercent = provider.dailyLimit
    ? Math.min(100, Math.round((provider.sentToday / provider.dailyLimit) * 100))
    : 0;

  return (
    <div
      className={`p-5 rounded-2xl border transition-all duration-200 ${
        provider.isEnabled
          ? 'bg-white dark:bg-[#181B20] border-slate-200 dark:border-slate-800 shadow-sm'
          : 'bg-slate-50 dark:bg-[#121418] border-slate-200/60 dark:border-slate-800/60 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{provider.name}</h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  provider.priority === 1
                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {provider.priority === 1 ? 'Primary (Tier 1)' : `Backup (Tier ${provider.priority})`}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Driver: <span className="font-mono">{provider.driver}</span>
            </div>
          </div>
        </div>

        {/* Enabled toggle button */}
        <button
          onClick={() => onToggle(provider._id)}
          title={provider.isEnabled ? 'Disable Provider' : 'Enable Provider'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
            provider.isEnabled
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {provider.isEnabled ? 'Active' : 'Disabled'}
        </button>
      </div>

      {/* Safe Config Summary */}
      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-[#121418] border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
        <div>
          <span className="text-slate-400">Host: </span>
          <span className="font-mono text-slate-800 dark:text-slate-200">
            {provider.configSummary?.smtpHost || 'smtp.gmail.com'}:{provider.configSummary?.smtpPort || 587}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Account: </span>
          <span className="font-mono text-slate-800 dark:text-slate-200">
            {provider.configSummary?.smtpUserMasked || 'Configured'}
          </span>
        </div>
      </div>

      {/* Daily Quota Indicator */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Daily Quota Usage</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {provider.sentToday} / {provider.dailyLimit} ({quotaPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              quotaPercent >= 90 ? 'bg-red-600' : 'bg-blue-500'
            }`}
            style={{ width: `${quotaPercent}%` }}
          />
        </div>
      </div>

      {/* Health status & error alert */}
      <div className="mt-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {provider.isHealthy ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Healthy
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
              <XCircle className="w-3.5 h-3.5" />
              Unhealthy ({provider.consecutiveFailures} failures)
            </span>
          )}
        </div>
        {provider.lastUsedAt && (
          <span className="text-[11px] text-slate-400">
            Last used {new Date(provider.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Failure reason banner if unhealthy */}
      {!provider.isHealthy && provider.lastFailureReason && (
        <div className="mt-2.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-[11px] text-red-700 dark:text-red-300 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
          <span className="truncate">{provider.lastFailureReason}</span>
        </div>
      )}

      {/* Actions footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!provider.isHealthy && (
            <button
              onClick={() => onRecover(provider._id)}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
            >
              Recover
            </button>
          )}
          <button
            onClick={() => onTest(provider)}
            className="px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
          >
            Test
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(provider)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Edit Provider"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(provider._id, provider.name)}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition"
            title="Delete Provider"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
