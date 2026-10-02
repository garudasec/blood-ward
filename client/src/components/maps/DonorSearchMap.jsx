import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ShieldCheck, MapPin, Eye } from 'lucide-react';
import BloodGroupBadge from '../common/BloodGroupBadge';

// Custom Recipient Location Icon
const recipientIcon = L.divIcon({
  className: 'recipient-marker-icon',
  html: `<div class="w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white ring-4 ring-blue-500/30 animate-pulse">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Custom Donor Marker Icon Function
const createDonorIcon = (bloodGroup, isAvailable) => {
  const bgClass = isAvailable ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300';
  return L.divIcon({
    className: 'donor-marker-icon',
    html: `<div class="px-2 py-1 ${bgClass} rounded-lg border-2 border-white shadow-md font-bold text-xs flex items-center gap-1 shadow-red-500/20 transform hover:scale-110 transition-transform">
            <span>🩸</span><span>${bloodGroup}</span>
          </div>`,
    iconSize: [42, 26],
    iconAnchor: [21, 13],
  });
};

export default function DonorSearchMap({
  donors = [],
  radiusKm = 10,
  onSelectDonor,
  center = [{ lat: 40.7128, lng: -74.0060 }.lat, { lat: 40.7128, lng: -74.0060 }.lng],
}) {
  const radiusMeters = (radiusKm >= 9999 ? 25 : radiusKm) * 1000;

  return (
    <div className="relative w-full h-[550px] rounded-3xl overflow-hidden border border-slate-200 shadow-md">
      {/* Privacy Notice Banner Overlay */}
      <div className="absolute top-3 left-3 right-3 z-[400] bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-2xl text-xs flex items-center justify-between shadow-lg border border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-slate-200">
            Donor markers display approximate city areas only. Exact addresses remain protected.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400">
          OpenStreetMap
        </span>
      </div>

      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Search Radius Circle Overlay */}
        <Circle
          center={center}
          radius={radiusMeters}
          pathOptions={{
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.08,
            weight: 1.5,
            dashArray: '6, 6',
          }}
        />

        {/* Recipient Center Marker */}
        <Marker position={center} icon={recipientIcon}>
          <Popup>
            <div className="p-1 space-y-1 text-xs">
              <span className="font-bold text-slate-900 block">Your Search Location</span>
              <span className="text-slate-500 block">{{ lat: 40.7128, lng: -74.0060 }.address}</span>
            </div>
          </Popup>
        </Marker>

        {/* Donor Markers */}
        {donors.map((donor) => {
          if (!donor.lat || !donor.lng) return null;
          return (
            <Marker
              key={donor.id}
              position={[donor.lat, donor.lng]}
              icon={createDonorIcon(donor.bloodGroup, donor.isAvailable)}
            >
              <Popup className="donor-popup">
                <div className="p-2 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                    <span className="font-bold text-slate-900">{donor.name}</span>
                    <BloodGroupBadge group={donor.bloodGroup} size="sm" />
                  </div>
                  <div className="space-y-0.5 text-slate-600">
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {donor.city}
                    </p>
                    <p className="font-semibold text-emerald-700">
                      ~ {donor.distanceKm} km away
                    </p>
                  </div>
                  <button
                    onClick={() => onSelectDonor && onSelectDonor(donor)}
                    className="w-full py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                  >
                    <Eye className="w-3 h-3" /> View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}