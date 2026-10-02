import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Filter,
  MapPin,
  RefreshCw,
  Inbox,
  ArrowUpDown,
  CheckCircle2,
  ShieldCheck,
  Droplet,
  Map as MapIcon,
  LayoutGrid,
} from 'lucide-react';
import BloodGroupBadge from '../../components/common/BloodGroupBadge';
import Button from '../../components/common/Button';
import RecipientDonorCard from '../../components/recipient/RecipientDonorCard';
import RecipientDonorDetailModal from '../../components/recipient/RecipientDonorDetailModal';
import DonorSearchMap from '../../components/maps/DonorSearchMap';
import { MOCK_SEARCHABLE_DONORS } from '../../constants/mockData';
import { BLOOD_GROUPS } from '../../constants/theme';

export default function RecipientDonorSearchPage() {
  const { user } = useAuth();
  const [donors, setDonors] = useState(MOCK_SEARCHABLE_DONORS);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [distanceRadius, setDistanceRadius] = useState(20);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [sortBy, setSortBy] = useState('NEAREST');
  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' | 'MAP'
  const [selectedDonorForModal, setSelectedDonorForModal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = () => {
    setSelectedBloodGroup('ALL');
    setSearchQuery('');
    setDistanceRadius(20);
    setAvailableOnly(true);
    setSortBy('NEAREST');
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setDonors(MOCK_SEARCHABLE_DONORS);
      setIsLoading(false);
    }, 400);
  };

  // Filter & Sort Donors
  const filteredDonors = donors
    .filter((donor) => {
      const matchesGroup =
        selectedBloodGroup === 'ALL' || donor.bloodGroup === selectedBloodGroup;
      const matchesSearch =
        donor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        donor.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRadius = donor.distanceKm <= distanceRadius;
      const matchesAvailability = availableOnly ? donor.isAvailable : true;
      return matchesGroup && matchesSearch && matchesRadius && matchesAvailability;
    })
    .sort((a, b) => {
      if (sortBy === 'NEAREST') return a.distanceKm - b.distanceKm;
      if (sortBy === 'FARTHEST') return b.distanceKm - a.distanceKm;
      return 0;
    });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-600 text-white">
              <Droplet className="w-5 h-5 fill-current" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Find Available Blood Donors
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Search nearby verified donors by blood group, location, and distance radius
          </p>
        </div>

        {/* View Mode Switcher (Grid vs Map) & Refresh */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setViewMode('GRID')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'GRID'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid View
            </button>
            <button
              onClick={() => setViewMode('MAP')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'MAP'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Interactive Map
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            title="Refresh search"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Search & Filter Control Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        {/* 1. Blood Group Chips */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
            Filter by Blood Group Required:
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedBloodGroup('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedBloodGroup === 'ALL'
                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Groups
            </button>
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={bg}
                onClick={() => setSelectedBloodGroup(bg)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedBloodGroup === bg
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search city or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 text-xs">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Radius:</span>
            <select
              value={distanceRadius}
              onChange={(e) => setDistanceRadius(Number(e.target.value))}
              className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer w-full"
            >
              <option value={2}>Within 2 km</option>
              <option value={5}>Within 5 km</option>
              <option value={7}>Within 7 km</option>
              <option value={10}>Within 10 km</option>
              <option value={20}>Within 20 km</option>
              <option value={9999}>Any distance</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer w-full"
            >
              <option value="NEAREST">Nearest first</option>
              <option value="FARTHEST">Farthest first</option>
              <option value="RECENT">Recently active</option>
            </select>
          </div>

          <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <span className="font-semibold text-slate-700">Available Only</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        {/* Results Counter & Reset */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Found <strong className="text-slate-900">{filteredDonors.length}</strong> matching donors
          </span>
          <button onClick={handleReset} className="text-red-600 font-bold hover:underline">
            Reset All Filters
          </button>
        </div>
      </div>

      {/* Main Content: GRID VIEW vs MAP VIEW */}
      {viewMode === 'MAP' ? (
        <div className="space-y-4">
          <DonorSearchMap
            donors={filteredDonors}
            radiusKm={distanceRadius}
            onSelectDonor={(d) => setSelectedDonorForModal(d)}
          />
        </div>
      ) : filteredDonors.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-slate-800 text-base">No donors match your search criteria</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try expanding your distance radius or selecting a different blood group.
          </p>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDonors.map((donor) => (
            <RecipientDonorCard
              key={donor.id}
              donor={donor}
              onViewDetails={(d) => setSelectedDonorForModal(d)}
            />
          ))}
        </div>
      )}

      {/* Donor Detail Modal */}
      <RecipientDonorDetailModal
        donor={selectedDonorForModal}
        isOpen={!!selectedDonorForModal}
        onClose={() => setSelectedDonorForModal(null)}
      />
    </div>
  );
}