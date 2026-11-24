import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Building2,
  Calendar,
  Eye,
  Check,
  AlertCircle,
  Activity,
} from "lucide-react";
import BloodGroupBadge from "../common/BloodGroupBadge";

// Donor Base Location Marker Icon (Enterprise Healthcare)
const donorBaseIcon = L.divIcon({
  className: "donor-base-marker",
  html: `<div class="w-8 h-8 bg-[#1E293B] rounded-full border-2 border-white shadow-md flex items-center justify-center text-white ring-2 ring-[#315B83]/50">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

// Hospital Request Marker Icon (Healthcare Semantic Palette)
const createRequestIcon = (bloodGroup, urgency, isSelected = false) => {
  const isEmergency = urgency === "Emergency" || urgency === "TODAY";
  const bgClass = isSelected
    ? "bg-[#1E293B] text-white border-2 border-white ring-2 ring-[#A61B2B] font-extrabold"
    : isEmergency
    ? "bg-[#A61B2B] text-white border border-[#FECACA] font-bold shadow-xs"
    : "bg-[#F0F7FF] text-[#315B83] border border-[#BFDBFE] font-bold shadow-2xs";

  return L.divIcon({
    className: "request-marker-pin",
    html: `<div class="px-2 py-0.5 ${bgClass} rounded shadow-xs text-xs font-mono flex items-center gap-1">
            <span>${bloodGroup}</span>
            ${isEmergency ? '<span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>' : ''}
          </div>`,
    iconSize: [46, 26],
    iconAnchor: [23, 13],
    popupAnchor: [0, -16],
  });
};

// Map Recenter & Invalidate Helper
function MapViewUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, zoom || map.getZoom());
      map.invalidateSize();
    }
  }, [center, zoom, map]);
  return null;
}

export default function DonorDispatchMap({
  requests = [],
  donorLocation = [28.6139, 77.2090],
  donorProfile = null,
  onSelectRequest,
  onAcceptRequest,
  isDonorAvailable = true,
}) {
  const [activeRequest, setActiveRequest] = useState(null);
  const [tileError, setTileError] = useState(false);

  const mapCenter =
    Array.isArray(donorLocation) &&
    donorLocation.length === 2 &&
    !isNaN(donorLocation[0]) &&
    !isNaN(donorLocation[1])
      ? donorLocation
      : [28.6139, 77.2090];

  return (
    <div className="relative w-full h-[580px] rounded-2xl overflow-hidden border border-[#E2E8F0] dark:border-[#343B47] shadow-xs bg-[#F8FAFC] dark:bg-[#181B21] flex flex-col">
      {/* Top Map Operational Status Banner */}
      <div className="absolute top-3 left-3 right-3 z-[400] bg-white/95 dark:bg-[#181B21]/95 backdrop-blur-xs text-[#1E293B] dark:text-[#F1F5F9] px-3.5 py-2 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs border border-[#E2E8F0] dark:border-[#343B47] font-mono">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#A61B2B] dark:text-rose-400 shrink-0" />
          <span className="font-bold text-[#1E293B] dark:text-white text-[11px] sm:text-xs">
            LIVE DISPATCH RADAR // {requests.length} MATCHING REQUISITIONS
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
          {tileError ? (
            <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              TILE NETWORK DEGRADED
            </span>
          ) : (
            <span className="flex items-center gap-1 font-semibold text-[#28734A] dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-[#28734A] dark:bg-emerald-400 animate-pulse" />
              SOCKET.IO REAL-TIME
            </span>
          )}
          <span className="hidden sm:inline font-medium text-[#475569] dark:text-[#CBD5E1]">
            BASE: {donorProfile?.city || "Profile Location"}
          </span>
        </div>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={11}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        <MapViewUpdater center={mapCenter} zoom={11} />

        {/* Standard OpenStreetMap Tile Layer (Publicly Accessible, Standard Attribution) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains={['a', 'b', 'c']}
          maxZoom={19}
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
        />

        {/* Donor Base Pin */}
        <Marker position={mapCenter} icon={donorBaseIcon}>
          <Popup className="clinical-map-popup">
            <div className="p-1 font-sans text-xs space-y-1">
              <p className="font-bold text-[#1E293B] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#315B83]" /> My Base Location
              </p>
              <p className="text-[11px] text-[#475569] font-mono">
                {donorProfile?.fullName || "Verified Donor"} · {donorProfile?.bloodGroup || "Donor"}
              </p>
              <p className="text-[10px] text-[#64748B] font-mono">
                Status: {isDonorAvailable ? "● Available to Donate" : "◯ Unavailable"}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Selected Request Radius Ring */}
        {activeRequest && activeRequest.lat && activeRequest.lng && (
          <Circle
            center={[activeRequest.lat, activeRequest.lng]}
            radius={(activeRequest.radiusKm || 20) * 1000}
            pathOptions={{
              color: "#315B83",
              fillColor: "#315B83",
              fillOpacity: 0.06,
              weight: 1.5,
              dashArray: "4, 6",
            }}
          />
        )}

        {/* Actionable Blood Request Markers */}
        {requests.map((req) => {
          const lat = req.lat
            ? parseFloat(req.lat)
            : req.location?.coordinates?.[1]
            ? parseFloat(req.location.coordinates[1])
            : null;
          const lng = req.lng
            ? parseFloat(req.lng)
            : req.location?.coordinates?.[0]
            ? parseFloat(req.location.coordinates[0])
            : null;

          if (!lat || !lng) return null;

          const isSelected = activeRequest?.id === req.id;
          const requestWithCoords = { ...req, lat, lng };

          return (
            <Marker
              key={req.id}
              position={[lat, lng]}
              icon={createRequestIcon(req.bloodGroup, req.urgency, isSelected)}
              eventHandlers={{
                click: () => setActiveRequest(requestWithCoords),
              }}
            >
              <Popup className="clinical-map-popup">
                <div className="p-2 space-y-2.5 font-sans text-xs min-w-[240px]">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-950">
                      <Building2 className="w-3.5 h-3.5 text-zinc-800" />
                      <span>{req.hospitalName || "Hospital Facility"}</span>
                    </div>
                    <BloodGroupBadge group={req.bloodGroup} size="sm" />
                  </div>

                  {/* Telemetry Details */}
                  <div className="space-y-1 text-[11px] text-zinc-600">
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-500" />
                      {req.city}{req.state ? `, ${req.state}` : ""}
                    </p>
                    <p className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      Required: <span className="font-semibold text-zinc-900">{req.requiredDate || "Immediate"}</span>
                    </p>
                    <p className="font-mono text-zinc-800">
                      Units: <strong className="text-zinc-950">{req.unitsNeeded || 1} Unit(s)</strong>
                    </p>
                    <p className="font-mono text-zinc-800">
                      Distance: ~{req.distanceKm ? req.distanceKm.toFixed(1) : "—"} KM (Approx. Straight-Line)
                    </p>
                    <p className="font-mono text-[10px] text-zinc-500">
                      Request Radius Cap: {req.radiusKm || 20} KM
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-zinc-200 space-y-1.5">
                    {isDonorAvailable ? (
                      <button
                        type="button"
                        onClick={() => onAcceptRequest && onAcceptRequest(req.id)}
                        className="w-full py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept Request
                      </button>
                    ) : (
                      <div className="p-1.5 rounded bg-zinc-100 text-zinc-700 text-[10px] flex items-center gap-1 font-mono">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        Toggle Available to accept
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectRequest && onSelectRequest(req)}
                      className="w-full py-1 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 rounded font-medium text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Inspect Details
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
