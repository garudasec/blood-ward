import { useState, useEffect } from "react";
import RecipientLayout from "../../layouts/RecipientLayout";
import { PageHeader, AppButton, LoadingSkeleton } from "../../components/app/UI";
import { useAuth } from "../../context/AuthContext";
import { getRecipientProfile, updateRecipientProfile } from "../../services/recipientService";

export default function RecipientProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", city: "", defaultHospital: "" });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await getRecipientProfile();
        if (res?.profile) setProfile(res.profile);
        else setProfile({ name: user?.name || "", email: user?.email || "", phone: "+91 98765 43210", city: "Mumbai", defaultHospital: "Lilavati Hospital" });
      } catch {
        setProfile({ name: user?.name || "", email: user?.email || "", phone: "+91 98765 43210", city: "Mumbai", defaultHospital: "Lilavati Hospital" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await updateRecipientProfile(profile);
      setToast({ msg: "Recipient profile updated successfully.", type: "success" });
    } catch (err) {
      setToast({ msg: err.message || "Failed to update profile.", type: "error" });
    } finally {
      setUpdating(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <RecipientLayout>
      <PageHeader
        title="Recipient Profile"
        subtitle="Manage your personal contact details, primary location, and medical center preferences"
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
        <LoadingSkeleton rows={4} />
      ) : (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          <div className="glass p-6 rounded-2xl border border-white/08 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2">Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/04 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2">Email Address</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-3 bg-white/02 border border-white/06 rounded-xl text-sm text-white/40 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-2">Contact Phone</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-white/04 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-2">Primary City</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={e => setProfile({ ...profile, city: e.target.value })}
                  className="w-full px-4 py-3 bg-white/04 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2">Primary Preferred Hospital</label>
              <input
                type="text"
                value={profile.defaultHospital}
                onChange={e => setProfile({ ...profile, defaultHospital: e.target.value })}
                placeholder="e.g. Lilavati Hospital, Bandra"
                className="w-full px-4 py-3 bg-white/04 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50"
              />
            </div>

            <div className="pt-4 border-t border-white/08 flex justify-end">
              <AppButton type="submit" variant="primary" loading={updating}>
                Save Profile Changes
              </AppButton>
            </div>
          </div>
        </form>
      )}
    </RecipientLayout>
  );
}
