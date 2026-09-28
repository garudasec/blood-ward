import { useState, useEffect } from "react";
import DonorLayout from "../../layouts/DonorLayout";
import { PageHeader, LoadingSkeleton } from "../../components/app/UI";
import { AvailabilityBadge } from "../../components/app/Badges";
import { setAvailability, getDonorProfile } from "../../services/donorService";

export default function DonorAvailabilityPage() {
  const [available, setAvailableState] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await getDonorProfile();
        if (res?.profile?.available !== undefined) {
          setAvailableState(res.profile.available);
        }
      } catch {
        // default available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleToggle = async (newState) => {
    setUpdating(true);
    try {
      await setAvailability(newState);
      setAvailableState(newState);
      setToast({ msg: "Your availability status is now " + (newState ? 'AVAILABLE' : 'UNAVAILABLE') + ".", type: "success" });
    } catch (err) {
      setToast({ msg: err.message || "Failed to update availability.", type: "error" });
    } finally {
      setUpdating(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <DonorLayout>
      <PageHeader
        title="Availability Settings"
        subtitle="Control whether recipients and emergency response coordinators can discover you"
      />

      {toast && (
        <div className={"mb-6 p-4 rounded-xl border text-sm flex items-center justify-between " + (
          toast.type === "error" ? "bg-red-500/15 border-red-500/30 text-red-300" : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
        )}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="text-white/40 hover:text-white">✕</button>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton rows={2} />
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* Main Status Toggle Card */}
          <div className="glass p-6 rounded-2xl border border-white/08 space-y-6">
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-white/08">
              <div>
                <h2 className="font-display font-semibold text-white text-lg mb-1">Current Availability State</h2>
                <p className="text-xs text-white/40">When active, your general location & blood group appear in recipient donor searches.</p>
              </div>
              <AvailabilityBadge available={available} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/03 border border-white/06">
              <div>
                <span className="text-sm font-semibold text-white block">Ready for Emergency Donations</span>
                <span className="text-xs text-white/40">Toggle off if you recently donated or are currently unavailable.</span>
              </div>

              <button
                onClick={() => handleToggle(!available)}
                disabled={updating}
                className={"w-14 h-8 rounded-full p-1 transition-colors duration-200 focus-ring " + (
                  available ? "bg-emerald-500" : "bg-white/20"
                )}
              >
                <div className={"w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 " + (
                  available ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>

            <div className="space-y-3 pt-2 text-xs text-white/50">
              <div className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Privacy Shield:</strong> Your exact residential address is never shown publicly to searching recipients.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Real-Time Alerts:</strong> When an emergency blood request matches your blood type, you receive instant Socket alerts.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </DonorLayout>
  );
}
