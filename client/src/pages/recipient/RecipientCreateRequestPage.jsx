import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import RecipientLayout from "../../layouts/RecipientLayout";
import { PageHeader, AppButton } from "../../components/app/UI";
import { BLOOD_GROUPS, URGENCY_LEVELS } from "../../constants";
import { createBloodRequest } from "../../services/recipientService";
import { useSocket } from "../../context/SocketContext";

export default function RecipientCreateRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialBloodGroup = searchParams.get("bloodGroup") || "O+";

  const { socket } = useSocket();

  const [formData, setFormData] = useState({
    bloodGroup: initialBloodGroup,
    units: 2,
    hospital: "",
    location: "",
    urgency: "emergency",
    requiredDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    notes: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await createBloodRequest(formData);

      // Emit Socket.io real-time event if connected
      if (socket && socket.connected) {
        socket.emit("blood_request_created", {
          requestId: res.request?._id || "req-" + Date.now(),
          bloodGroup: formData.bloodGroup,
          urgency: formData.urgency,
          hospital: formData.hospital
        });
      }

      navigate("/recipient/requests", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to create blood request.");
      setLoading(false);
    }
  };

  return (
    <RecipientLayout>
      <PageHeader
        title="Create Emergency Blood Request"
        subtitle="Submit urgent blood requirement details to alert matching donors in your vicinity"
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="glass p-6 rounded-2xl border border-white/08 space-y-6">
          {/* Blood Group Picker */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">Required Blood Group</label>
            <div className="flex flex-wrap gap-2">
              {BLOOD_GROUPS.map(bg => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setFormData({ ...formData, bloodGroup: bg })}
                  className={"px-4 py-2.5 rounded-xl text-xs font-bold transition-all focus-ring " + (
                    formData.bloodGroup === bg
                      ? "gradient-crimson text-white glow-crimson-sm shadow-lg scale-105"
                      : "glass border border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                  )}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Units + Urgency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2">Units Required</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.units}
                onChange={e => setFormData({ ...formData, units: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-3 bg-white/04 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2">Urgency Level</label>
              <select
                value={formData.urgency}
                onChange={e => setFormData({ ...formData, urgency: e.target.value })}
                className="w-full px-4 py-3 bg-white/04 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50"
              >
                {URGENCY_LEVELS.map(u => (
                  <option key={u.id} value={u.id} className="bg-[#111116]">{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Hospital & Location */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">Hospital / Clinic Name</label>
            <input
              type="text"
              placeholder="e.g. Lilavati Hospital & Research Centre"
              value={formData.hospital}
              onChange={e => setFormData({ ...formData, hospital: e.target.value })}
              className="w-full px-4 py-3 bg-white/04 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">Hospital Address / General Location</label>
            <input
              type="text"
              placeholder="e.g. Bandra West, Mumbai"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 bg-white/04 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">Required By Date</label>
            <input
              type="date"
              value={formData.requiredDate}
              onChange={e => setFormData({ ...formData, requiredDate: e.target.value })}
              className="w-full px-4 py-3 bg-white/04 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">Additional Medical Notes / Patient Instructions</label>
            <textarea
              rows="3"
              placeholder="Provide any helpful instructions for responding donors (e.g. Contact ward 3B, patient name...)"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-white/04 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50"
            />
          </div>

          <div className="pt-4 border-t border-white/08 flex justify-end gap-3">
            <AppButton variant="secondary" onClick={() => navigate(-1)}>Cancel</AppButton>
            <AppButton type="submit" variant="primary" loading={loading}>
              Broadcast Blood Request
            </AppButton>
          </div>
        </div>
      </form>
    </RecipientLayout>
  );
}
