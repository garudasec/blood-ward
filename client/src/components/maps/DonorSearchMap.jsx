import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ShieldCheck, MapPin, Eye, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import BloodGroupBadge from "../common/BloodGroupBadge";

// Recipient Search Center Marker Icon (Enterprise Healthcare)
const recipientIcon = L.divIcon({
  className: "recipient-center-marker",
  html: `<div class="w-8 h-8 bg-[#1E293B] rounded-full border-2 border-white shadow-md flex items-center justify-center text-white ring-2 ring-[#315B83]/50">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

// Donor Marker Icon (Healthcare Semantic Palette)
const createDonorIcon = (bloodGroup, isAvailable, isSelected = false) => {
  const bgClass = isSelected
    ? "bg-[#1E293B] text-white border-2 border-white ring-2 ring-[#315B83] font-extrabold"
    : isAvailable
    ? "bg-[#F0FDF4] text-[#28734A] border border-[#BBF7D0] font-bold shadow-2xs"
    : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] font-medium";

  return L.divIcon({
    className: "donor-marker-pin",
    html: `<div class="px-2 py-0.5 ${bgClass} rounded shadow-xs text-xs font-mono flex items-center gap-1">
            <span>${bloodGroup}</span>
          </div>`,
    iconSize: [42, 24],
    iconAnchor: [21, 12],
    popupAnchor: [0, -14],
  });
};

/**
 * Coarsen donor coordinates with a deterministic offset
 * Protects donor home privacy while preventing identical city centroids from stacking.
 */
export const getPrivacyCoarsenedCoords = (baseLat, baseLng, donorId) => {
  if (!baseLat || !baseLng) return null;
  if (!donorId) return [baseLat, baseLng];

  let hash = 0;
  const str = String(donorId);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
  const radius = 0.003 + (Math.abs(hash >> 3) % 4) * 0.002; // ~300m to 900m
  return [baseLat + Math.sin(angle) * radius, baseLng + Math.cos(angle) * radius];
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

export default function DonorSearchMap({
  donors = [],
  radiusKm = 20,
  onSelectDonor,
  center = [28.6139, 77.2090],
  selectedDonorId = null,
  onRadiusChange,
}) {
  const [tileError, setTileError] = useState(false);

  const mapCenter =
    Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])
      ? center
      : [28.6139, 77.2090];

  const radiusMeters = (radiusKm >= 9999 ? 50 : radiusKm) * 1000;
  const radiusPresets = [5, 10, 20, 30, 50];

  return (
    <div className="relative w-full h-[580px] rounded-2xl overflow-hidden border border-[#E2E8F0] dark:border-[#343B47] shadow-xs bg-[#F8FAFC] dark:bg-[#181B21] flex flex-col">
      {/* Top Map Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-[400] bg-white/95 dark:bg-[#181B21]/95 backdrop-blur-xs text-[#1E293B] dark:text-[#F1F5F9] px-3.5 py-2 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs border border-[#E2E8F0] dark:border-[#343B47]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#28734A] dark:text-emerald-400 shrink-0" />
          <span className="font-medium text-[#475569] dark:text-[#CBD5E1] text-[11px] sm:text-xs">
            Donor locations are coarsened (~500m centroid offset). Exact street addresses remain protected.
          </span>
          {tileError && (
            <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 font-mono text-[10px]">
              <AlertCircle className="w-3 h-3" />
              TILE DEGRADED
            </span>
          )}
        </div>

        {/* Inline Radius Preset Selector on Map */}
        {onRadiusChange && (
          <div className="flex items-center gap-1 font-mono text-xs">
            <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase font-bold mr-1">Radius:</span>
            {radiusPresets.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRadiusChange(r)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                  radiusKm === r
                    ? "bg-[#315B83] text-white border-[#315B83]"
                    : "bg-white dark:bg-[#20242C] hover:bg-[#F8FAFC] dark:hover:bg-[#252A33] text-[#1E293B] dark:text-[#F1F5F9] border-[#E2E8F0] dark:border-[#343B47]"
                }`}
              >
                {r}k
              </button>
            ))}
          </div>
        )}
      </div>

      <MapContainer
        center={mapCenter}
        zoom={radiusKm <= 10 ? 12 : radiusKm <= 20 ? 11 : radiusKm <= 30 ? 10 : 9}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        <MapViewUpdater
          center={mapCenter}
          zoom={radiusKm <= 10 ? 12 : radiusKm <= 20 ? 11 : radiusKm <= 30 ? 10 : 9}
        />

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

        {/* Recipient Center Marker */}
        <Marker position={mapCenter} icon={recipientIcon}>
          <Popup className="clinical-map-popup">
            <div className="p-1 font-sans text-xs space-y-1">
              <p className="font-bold text-[#1E293B] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#315B83]" /> Hospital / Search Center
              </p>
              <p className="text-[11px] text-[#475569] font-mono">
                Active Discovery Radius: {radiusKm >= 9999 ? "All Presets" : `${radiusKm} KM`}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Visible Radius Circle */}
        {radiusKm < 9999 && (
          <Circle
            center={mapCenter}
            radius={radiusMeters}
            pathOptions={{
              color: "#315B83",
              fillColor: "#315B83",
              fillOpacity: 0.05,
              weight: 1.5,
              dashArray: "4, 6",
            }}
          />
        )}

        {/* Donor Markers */}
        {donors.map((donor) => {
          const rawLat = donor.lat ? parseFloat(donor.lat) : (donor.latitude ? parseFloat(donor.latitude) : null);
          const rawLng = donor.lng ? parseFloat(donor.lng) : (donor.longitude ? parseFloat(donor.longitude) : null);

          if (!rawLat || !rawLng) return null;

          const coarsened = getPrivacyCoarsenedCoords(rawLat, rawLng, donor.id);
          if (!coarsened) return null;

          const isSelected = selectedDonorId === donor.id;
          const isAvailable = donor.isAvailable || donor.availability === "available";

          return (
            <Marker
              key={donor.id}
              position={coarsened}
              icon={createDonorIcon(donor.bloodGroup, isAvailable, isSelected)}
            >
              <Popup className="clinical-map-popup">
                <div className="p-2 space-y-2 font-sans text-xs min-w-[220px]">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5">
                    <span className="font-bold text-zinc-950">{donor.fullName || donor.name}</span>
                    <BloodGroupBadge group={donor.bloodGroup} size="sm" />
                  </div>

                  <div className="space-y-1 text-[11px] text-zinc-600">
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-500" />
                      {donor.city}{donor.state ? `, ${donor.state}` : ""}
                    </p>
                    <p className="font-mono text-zinc-800">
                      Distance: ~{donor.distanceKm ? donor.distanceKm.toFixed(1) : "—"} KM (Approx. Straight-Line)
                    </p>
                    <p className="flex items-center gap-1 font-semibold text-zinc-900">
                      {isAvailable ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-zinc-950" />
                          <span>Status: Available to Donate</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-zinc-500" />
                          <span className="text-zinc-500">Status: Unavailable</span>
                        </>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectDonor && onSelectDonor(donor)}
                    className="w-full mt-2 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-medium text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Match Details
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
