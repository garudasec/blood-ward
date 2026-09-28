import { useState, useEffect, useCallback } from "react";
import DonorLayout from "../../layouts/DonorLayout";
import { BloodGroupBadge } from "../../components/app/Badges";
import { AppButton, PageHeader, LoadingSkeleton } from "../../components/app/UI";
import AlertMessage from "../../components/auth/AlertMessage";
import { getDonorProfile, updateDonorProfile } from "../../services/donorService";
import { useAuth } from "../../context/AuthContext";

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

const MOCK = { fullName:"Rahul Sharma", email:"rahul@example.com", phone:"+91 9876543210", bloodGroup:"O+", city:"Mumbai", pincode:"400001", available: true };

function FieldRow({ label, value, editing, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-4 border-b border-white/06 last:border-0">
      <span className="text-xs font-semibold text-white/40 uppercase tracking-widest sm:w-36 flex-shrink-0">{label}</span>
      {editing ? children : <span className="text-sm text-white/80">{value || <span className="text-white/25">Not set</span>}</span>}
    </div>
  );
}

function AuthInput({ value, onChange, type = "text", placeholder, disabled }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      className="auth-input focus-ring text-sm py-2.5 max-w-sm" />
  );
}

export default function DonorProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDonorProfile();
      setProfile(data?.donor || MOCK);
    } catch { setProfile(MOCK); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = () => { setForm({ ...profile }); setEditing(true); setAlert(null); };
  const cancelEdit = () => { setEditing(false); setAlert(null); };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const save = async () => {
    if (!form.fullName?.trim()) { setAlert({ type:"error", message:"Full name is required." }); return; }
    setSaving(true); setAlert(null);
    try {
      const data = await updateDonorProfile(form);
      setProfile(data?.donor || form);
      setEditing(false);
      setAlert({ type:"success", message:"Profile updated successfully." });
    } catch (err) {
      setAlert({ type:"error", message: err.message || "Failed to update profile." });
    } finally { setSaving(false); }
  };

  return (
    <DonorLayout>
      <PageHeader title="My Profile" subtitle="View and manage your donor information."
        action={!editing && profile && <AppButton size="sm" onClick={startEdit} id="donor-edit-profile-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Edit Profile
        </AppButton>}
      />

      {alert && <div className="mb-5"><AlertMessage type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /></div>}

      {loading ? <LoadingSkeleton rows={2} /> : (
        <div className="space-y-6">
          {/* Avatar + blood group */}
          <div className="glass rounded-2xl p-6 border border-white/07 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl gradient-crimson flex items-center justify-center text-white font-display font-bold text-2xl glow-crimson-sm flex-shrink-0" aria-hidden="true">
              {profile?.fullName?.[0] || user?.name?.[0] || "D"}
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-xl text-white mb-1">{profile?.fullName || user?.name || "Donor"}</p>
              <p className="text-sm text-white/40">{profile?.email}</p>
            </div>
            <BloodGroupBadge group={profile?.bloodGroup || "—"} size="lg" />
          </div>

          {/* Fields */}
          <div className="glass rounded-2xl p-6 border border-white/07">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Personal Information</h2>

            <FieldRow label="Full Name" value={profile?.fullName} editing={editing}>
              <AuthInput value={form.fullName || ""} onChange={set("fullName")} placeholder="Your full name" />
            </FieldRow>
            <FieldRow label="Email" value={profile?.email} editing={false}>
              <span className="text-sm text-white/40">{profile?.email} <span className="text-white/25 ml-1">(email cannot be changed)</span></span>
            </FieldRow>
            <FieldRow label="Phone" value={profile?.phone} editing={editing}>
              <AuthInput value={form.phone || ""} onChange={set("phone")} type="tel" placeholder="+91 9876543210" />
            </FieldRow>
          </div>

          <div className="glass rounded-2xl p-6 border border-white/07">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Donation Information</h2>

            <FieldRow label="Blood Group" value={profile?.bloodGroup} editing={editing}>
              <div className="grid grid-cols-4 gap-2 max-w-xs">
                {BLOOD_GROUPS.map(g => (
                  <button key={g} type="button" onClick={() => setForm(f => ({...f, bloodGroup: g}))}
                    className={`blood-group-btn focus-ring text-xs ${form.bloodGroup === g ? "selected" : ""}`}>{g}</button>
                ))}
              </div>
            </FieldRow>
            <FieldRow label="City" value={profile?.city} editing={editing}>
              <AuthInput value={form.city || ""} onChange={set("city")} placeholder="City" />
            </FieldRow>
            <FieldRow label="Pincode" value={profile?.pincode} editing={editing}>
              <AuthInput value={form.pincode || ""} onChange={set("pincode")} placeholder="400001" />
            </FieldRow>
          </div>

          {editing && (
            <div className="flex items-center gap-3 justify-end">
              <AppButton variant="secondary" onClick={cancelEdit} disabled={saving}>Cancel</AppButton>
              <AppButton onClick={save} loading={saving} id="donor-save-profile-btn">Save Changes</AppButton>
            </div>
          )}
        </div>
      )}
    </DonorLayout>
  );
}
