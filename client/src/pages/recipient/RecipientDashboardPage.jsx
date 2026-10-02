import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, PlusCircle, FileText } from 'lucide-react';
import Button from '../../components/common/Button';
import { useNavigate } from 'react-router-dom';

export default function RecipientDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Welcome, {user?.fullName || 'Recipient'}!
          </h1>
          <p className="text-xs text-slate-500">
            Recipient Portal • {user?.city || 'City set'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={() => navigate('/recipient/donors')}>
            <Search className="w-4 h-4 mr-1" /> Find Donors
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/recipient/requests/create')}>
            <PlusCircle className="w-4 h-4 mr-1" /> Request Blood
          </Button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
        <Search className="w-10 h-10 text-blue-500 mx-auto" />
        <h3 className="font-bold text-slate-900 text-lg">Recipient Features Arriving in Phase 7 & 8</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          GPS donor search, distance radius filters, Leaflet map views, creating blood requests, and request tracking will be implemented in Phase 7 & 8.
        </p>
      </div>
    </div>
  );
}