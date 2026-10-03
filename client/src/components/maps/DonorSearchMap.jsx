import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ShieldCheck, MapPin, Eye } from "lucide-react";
import BloodGroupBadge from "../common/BloodGroupBadge";

// Custom Recipient Location Icon
const recipientIcon = L.divIcon({
  className: "recipient-marker-icon",
  html: `<div class="w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white ring-4 ring-blue-500/30 animate-pulse">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Custom Donor Marker Icon Function
const createDonorIcon = (bloodGroup, isAvailable) => {
  const bgClass = isAvailable ? "bg-red-600 text-white" : "bg-slate-700 text-slate-300";
  return L.divIcon({
    className: "donor-marker-icon",
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
  center = [28.6139, 77.2090],
}) {
  const mapCenter = Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1]) ? center : [28.6139, 77.2090];
  const radiusMeters = (radiusKm >= 9999 ? 25 : radiusKm) * 1000;

  return (
    <div className="relative w-full h-[550px] rounded-3xl overflow-hidden border border-theme shadow-md">
      {/* Privacy Notice Banner Overlay */}
      <div className="absolute top-3 left-3 right-3 z-[400] bg-theme-header-top/90 backdrop-blur-md text-theme-primary px-4 py-2 rounded-2xl text-xs flex items-center justify-between shadow-lg border border-theme">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-semibold text-theme-secondary">
            Donor markers display approximate city areas only. Exact addresses remain protected.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-theme-subtle text-theme-muted border border-theme">
          OpenStreetMap
        </span>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Recipient Center Marker */}
        <Marker position={mapCenter} icon={recipientIcon}>
          <Popup className="rounded-xl">
            <div className="p-1 font-sans text-xs">
              <p className="font-bold text-slate-900 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Search Center Location
              </p>
              <p className="text-[11px] text-slate-500">Radius: {radiusKm >= 9999 ? "All Locations" : `${radiusKm} km`}</p>
            </div>
          </Popup>
        </Marker>

        {/* Search Radius Circle */}
        {radiusKm < 9999 && (
          <Circle
            center={mapCenter}
            radius={radiusMeters}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: "4, 6",
            }}
          />
        )}

        {/* Donor Markers */}
        {donors.map((donor) => {
          const lat = donor.latitude ? parseFloat(donor.latitude) : mapCenter[0] + (Math.random() - 0.5) * 0.05;
          const lng = donor.longitude ? parseFloat(donor.longitude) : mapCenter[1] + (Math.random() - 0.5) * 0.05;

          return (
            <Marker
              key={donor.id}
              position={[lat, lng]}
              icon={createDonorIcon(donor.bloodGroup, donor.isAvailable)}
            >
              <Popup className="rounded-2xl">
                <div className="p-2 space-y-2 font-sans text-xs min-w-[180px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-slate-900">{donor.fullName}</span>
                    <BloodGroupBadge group={donor.bloodGroup} size="sm" />
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {donor.city}, {donor.state}
                    </p>
                    <p className="font-semibold text-slate-700">
                      Status: {donor.isAvailable ? "🟢 Available" : "🔴 Not Available"}
                    </p>
                  </div>
                  <button
                    onClick={() => onSelectDonor && onSelectDonor(donor)}
                    className="w-full mt-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Details
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
