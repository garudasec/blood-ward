import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { requestService } from "../../services/requestService";
import { patientService } from "../../services/patientService";
import { complaintService } from "../../services/complaintService";
import { socketService } from "../../services/socketService";
import {
  Search,
  PlusCircle,
  AlertTriangle,
  Activity,
  Inbox,
  Clock,
  MapPin,
  XCircle,
  KeyRound,
  ShieldAlert,
  Users,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import Button from "../../components/common/Button";
import { matchService } from "../../services/matchService";
import RecipientSummaryStats from "../../components/recipient/RecipientSummaryStats";
import RecipientRequestSummaryCard from "../../components/recipient/RecipientRequestSummaryCard";
import BloodCompatibility from "../../components/common/BloodCompatibility";
import ClaimPatientModal from "../../components/patient/ClaimPatientModal";
import FamilyAccessModal from "../../components/patient/FamilyAccessModal";

export default function RecipientDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [matches, setMatches] = useState([]);
  const [patients, setPatients] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedPatientForFamily, setSelectedPatientForFamily] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const [resRequests, resPatients, resComplaints, resMatches] = await Promise.allSettled([
        requestService.getMyRequests(),
        patientService.getMyPatients(),
        complaintService.getMyComplaints(),
        matchService.getMyMatches(),
      ]);

      if (resRequests.status === "fulfilled" && resRequests.value?.requests) {
        setRequests(resRequests.value.requests);
      }
      if (resPatients.status === "fulfilled" && resPatients.value?.patients) {
        setPatients(resPatients.value.patients);
      }
      if (resComplaints.status === "fulfilled" && resComplaints.value?.complaints) {
        setComplaints(resComplaints.value.complaints);
      }
      if (resMatches.status === "fulfilled" && resMatches.value?.matches) {
        setMatches(resMatches.value.matches);
      }
    } catch (err) {
      console.error("Failed to load recipient dashboard data:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const handleReconnect = () => {
      fetchDashboardData();
    };

    socketService.on("bloodRequest:accepted", fetchDashboardData);
    socketService.on("bloodRequest:statusChanged", fetchDashboardData);
    socketService.on("bloodRequest:fulfilled", fetchDashboardData);
    socketService.on("bloodRequest:cancelled", fetchDashboardData);
    socketService.on("notification:new", fetchDashboardData);
    window.addEventListener("bloodward:reconnect", handleReconnect);

    return () => {
      socketService.off("bloodRequest:accepted", fetchDashboardData);
      socketService.off("bloodRequest:statusChanged", fetchDashboardData);
      socketService.off("bloodRequest:fulfilled", fetchDashboardData);
      socketService.off("bloodRequest:cancelled", fetchDashboardData);
      socketService.off("notification:new", fetchDashboardData);
      window.removeEventListener("bloodward:reconnect", handleReconnect);
    };
  }, []);

  const totalCount = requests.length;
  const activeList = requests.filter((r) => ["Active", "Donor Accepted", "In Progress"].includes(r.status));
  const activeCount = activeList.length;
  const responsesCount = requests.filter((r) => r.acceptedDonor || r.donorResponsesCount > 0).length;
  const fulfilledCount = requests.filter((r) => r.status === "Fulfilled").length;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. WELCOME HEADER */}
      <div className="bg-white dark:bg-[#181B21] text-[#1E293B] dark:text-[#F1F5F9] p-6 sm:p-7 rounded-2xl border border-[#E2E8F0] dark:border-[#343B47] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E293B] dark:text-[#F1F5F9]">
            Welcome, {user?.fullName || "Recipient"}
          </h1>
          <p className="text-[#475569] dark:text-[#CBD5E1] text-xs sm:text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#315B83] dark:text-sky-400 shrink-0" />
            <span>Search Location: <strong className="text-[#1E293B] dark:text-white">{user?.city ? (user?.state ? user.city + ", " + user.state : user.city) : (user?.state || "Not specified")}</strong></span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsClaimModalOpen(true)}
            className="font-medium text-xs text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <KeyRound className="w-3.5 h-3.5 mr-1.5 text-rose-600 dark:text-rose-400" /> Claim Patient Record
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/recipient/donors")}
            className="font-medium text-xs"
          >
            <Search className="w-3.5 h-3.5 mr-1.5 text-[#315B83] dark:text-sky-400" /> Search Donors
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/recipient/requests/create")}
            className="font-bold text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Create Blood Request
          </Button>
        </div>
      </div>

      {/* Verification Notice for Hospital Representatives */}
      {user?.accountType === "hospital_rep" && user?.verificationStatus === "pending" && (
        <div className="p-4 rounded-xl bg-[#FFFBEB] dark:bg-amber-950/40 border border-[#FDE68A] dark:border-amber-800/50 text-xs text-[#92400E] dark:text-amber-200 flex items-start gap-3">
          <Clock className="w-5 h-5 text-[#A66B19] dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-[#78350F] dark:text-amber-100">
              Hospital Account Verification Pending
            </h4>
            <p className="text-[#92400E] dark:text-amber-300 leading-relaxed">
              Your hospital representative account is awaiting administrative verification. Any blood requests created will remain in <em>Pending Verification</em> status and will not dispatch to voluntary donors until your hospital credentials are verified.
            </p>
          </div>
        </div>
      )}

      {user?.accountType === "hospital_rep" && user?.verificationStatus === "rejected" && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] dark:bg-rose-950/40 border border-[#FECACA] dark:border-rose-800/50 text-xs text-[#991B1B] dark:text-rose-200 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-[#A61B2B] dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-[#7F1D1D] dark:text-rose-100">
              Hospital Account Verification Rejected
            </h4>
            <p className="text-[#991B1B] dark:text-rose-300 leading-relaxed">
              Reason: {user?.verificationRejectionReason || "Verification credentials could not be confirmed."} Please visit your profile to update details.
            </p>
          </div>
        </div>
      )}

      {/* 2. ENTERPRISE EMERGENCY REQUEST NOTICE */}
      <div className="bg-gradient-to-r from-[#FEF2F2] to-[#F0F7FF] dark:from-[#2A161A] dark:to-[#172535] p-6 sm:p-7 rounded-2xl border border-[#FECACA] dark:border-[#343B47] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-[#181B21] text-[#A61B2B] dark:text-rose-400 text-[11px] font-semibold uppercase tracking-wider border border-[#FECACA] dark:border-[#343B47]">
            <AlertTriangle className="w-3.5 h-3.5 text-[#A61B2B] dark:text-rose-400" /> Urgent Broadcast Protocol
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#1E293B] dark:text-[#F1F5F9]">
            Need Blood Urgently For A Medical Procedure?
          </h2>
          <p className="text-[#475569] dark:text-[#CBD5E1] text-xs leading-relaxed">
            Dispatch an emergency request to immediately notify verified voluntary donors within your chosen operational radius.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => navigate("/recipient/requests/create?emergency=true")}
          className="shrink-0 font-bold shadow-xs"
        >
          Create Emergency Request →
        </Button>
      </div>

      {/* 3. RECIPIENT SUMMARY STATS */}
      <RecipientSummaryStats stats={{ totalRequests: totalCount, activeRequests: activeCount, donorsResponded: responsesCount, fulfilledCount: fulfilledCount }} />

      {/* 4. ACTIVE BLOOD REQUESTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#343B47] pb-3">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#315B83] dark:text-sky-400" />
              Your Active Requests
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
              Track donor acceptances, unlocked contacts, and request statuses
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/recipient/requests")}
          >
            View All Requests →
          </Button>
        </div>

        {activeList.length === 0 ? (
          <div className="bg-white dark:bg-[#181B21] p-8 rounded-xl border border-[#E2E8F0] dark:border-[#343B47] text-center space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#F1F5F9] dark:bg-[#20242C] text-[#64748B] dark:text-[#94A3B8] flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-[#1E293B] dark:text-[#F1F5F9] text-base">No active blood requests</h3>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1] max-w-md mx-auto">
              You do not have any active blood requests. Search available donors or create a new request when needed.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/recipient/requests/create")}
            >
              Create Request Now
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeList.map((req) => (
              <RecipientRequestSummaryCard
                key={req.id}
                request={req}
                onViewDetails={() => navigate("/recipient/requests")}
              />
            ))}
          </div>
        )}
      </div>

      {/* 4B. POTENTIAL DONOR MATCHES & LIFECYCLE SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#343B47] pb-3">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-[#A61B2B]" />
              Potential Donor Matches & Lifecycle Tracker
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
              Automated donor matching events, response statuses, and authorized contact releases
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/recipient/requests")}
            className="text-xs"
          >
            Match History →
          </Button>
        </div>

        {matches.length === 0 ? (
          <div className="bg-white dark:bg-[#181B21] p-6 rounded-xl border border-[#E2E8F0] dark:border-[#343B47] text-center space-y-2">
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
              No active donor matches currently pending. When a compatible voluntary donor is identified for your active blood requisitions, automated notifications and match details will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((m) => (
              <div
                key={m._id || m.id}
                className="bg-white dark:bg-[#181B21] p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#343B47] shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                        {m.bloodGroup}
                      </span>
                      <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                        {m.unitsNeeded} unit(s) • {m.hospitalName}
                      </span>
                    </div>
                    <h3 className="font-bold text-[#1E293B] dark:text-[#F1F5F9] text-sm mt-1.5">
                      {m.city}{m.state ? `, ${m.state}` : ""}
                    </h3>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      m.status === "Accepted"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : m.status === "Completed"
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        : m.status === "Declined"
                        ? "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    {m.status === "Awaiting Response" ? "Awaiting Donor Response" : m.status}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#343B47] text-xs">
                  {m.status === "Accepted" || m.status === "Completed" ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Donor Contact Authorized</span>
                      </div>
                      <p className="text-[#1E293B] dark:text-white font-medium flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.donor?.fullName || "Voluntary Donor"}</span>
                        {m.donor?.phone && (
                          <>
                            <span className="text-slate-300 dark:text-zinc-600">•</span>
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <a href={`tel:${m.donor.phone}`} className="text-[#315B83] dark:text-sky-400 hover:underline font-mono">
                              {m.donor.phone}
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[#64748B] dark:text-[#94A3B8] text-[11px] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Donor contact details protected. Released upon voluntary donor acceptance.</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. CLAIMED PATIENTS & FAMILY ACCESS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#343B47] pb-3">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#A61B2B]" />
              Your Claimed Patients & Medical Records
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
              Hospital requisition records claimed via single-use claim codes and approved family access
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsClaimModalOpen(true)}
            className="text-xs font-semibold"
          >
            <KeyRound className="w-3.5 h-3.5 mr-1 text-[#A61B2B]" /> Claim Record
          </Button>
        </div>

        {patients.length === 0 ? (
          <div className="bg-white dark:bg-[#181B21] p-6 rounded-xl border border-[#E2E8F0] dark:border-[#343B47] text-center space-y-2">
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
              You have not claimed any hospital patient records yet. If a hospital created a blood requisition for you or your family member, use your <strong>Patient ID</strong> and <strong>Claim Code</strong> to link it.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClaimModalOpen(true)}
              className="text-xs"
            >
              Enter Claim Code
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patients.map((pat) => (
              <div
                key={pat.id || pat.patientId}
                className="bg-white dark:bg-[#181B21] p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#343B47] shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#A61B2B] bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/40">
                      {pat.patientId}
                    </span>
                    <h3 className="font-bold text-[#1E293B] dark:text-[#F1F5F9] text-base mt-1">
                      {pat.name}
                    </h3>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {pat.age} yrs • {pat.gender} • Blood Group: <strong className="text-rose-600 dark:text-rose-400">{pat.bloodGroup}</strong>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPatientForFamily(pat)}
                    className="text-xs font-medium"
                  >
                    <Users className="w-3.5 h-3.5 mr-1" /> Family Access
                  </Button>
                </div>

                <div className="p-3 bg-[#F8FAFC] dark:bg-[#20242C] rounded-xl text-xs space-y-1 text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#343B47]">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#315B83] dark:text-sky-400" />
                    <span>Hospital: <strong>{pat.hospital?.name || "Hospital Partner"}</strong> {pat.hospital?.city ? `(${pat.hospital.city})` : ""}</span>
                  </div>
                  {pat.wardDepartment && (
                    <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] pl-5">
                      Ward / Department: {pat.wardDepartment}
                    </div>
                  )}
                </div>

                {pat.familyAccess && pat.familyAccess.length > 0 && (
                  <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#343B47] text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-[#94A3B8] block mb-1">
                      Registered Family Members ({pat.familyAccess.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {pat.familyAccess.map((fa, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                            fa.status === "approved"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {fa.relationship} ({fa.status})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. MISCONDUCT COMPLAINTS & GRIEVANCE TRACKING */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#343B47] pb-3">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Your Grievance Complaints
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
              Track administrator reviews, investigations, and resolutions for hospital misconduct reports
            </p>
          </div>
        </div>

        {complaints.length === 0 ? (
          <div className="bg-white dark:bg-[#181B21] p-6 rounded-xl border border-[#E2E8F0] dark:border-[#343B47] text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
            No misconduct or care complaints have been filed by your account.
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div
                key={c.id || c.complaintId}
                className="bg-white dark:bg-[#181B21] p-4 sm:p-5 rounded-xl border border-[#E2E8F0] dark:border-[#343B47] shadow-xs space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#A61B2B] bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/40 text-[11px]">
                      {c.complaintId}
                    </span>
                    <span className="font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                      {c.category}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                      c.status === "Resolved"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : c.status === "Rejected"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                        : c.status === "Investigation"
                        ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <p className="text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                  {c.description}
                </p>

                {c.resolutionReason && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs">
                    <strong className="block font-semibold">Resolution Notice:</strong>
                    {c.resolutionReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clinical Compatibility Matrix */}
      <BloodCompatibility defaultRecipientGroup={user?.bloodGroup || "O+"} />

      {/* 7. RECENT ACTIVITY TIMELINE SNIPPET */}
      <div className="bg-white dark:bg-[#181B21] p-6 sm:p-7 rounded-xl border border-[#E2E8F0] dark:border-[#343B47] shadow-xs space-y-3 transition-colors">
        <h3 className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8]" /> Recent Request Activity
        </h3>

        {activeList.length === 0 ? (
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] italic">No recent request activity recorded yet.</p>
        ) : (
          <div className="space-y-2.5 text-xs">
            {activeList.map((req) => (
              <div key={req.id} className="p-3 bg-[#F8FAFC] dark:bg-[#20242C] rounded-lg border border-[#E2E8F0] dark:border-[#343B47] flex items-start gap-3">
                <div className="p-1.5 bg-[#F1F5F9] dark:bg-[#252A33] text-[#475569] dark:text-[#CBD5E1] rounded-md shrink-0 border border-[#E2E8F0] dark:border-[#343B47]">
                  <PlusCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                    Request #{req.id?.slice(-6) || "--"} at {req.hospitalName || "Hospital"}
                  </p>
                  <p className="text-[#64748B] dark:text-[#94A3B8] text-[11px]">Status: {req.status} • {req.createdAt || "Recently"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ClaimPatientModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        onClaimSuccess={() => fetchDashboardData()}
      />

      <FamilyAccessModal
        isOpen={!!selectedPatientForFamily}
        patient={selectedPatientForFamily}
        onClose={() => setSelectedPatientForFamily(null)}
        onSuccess={() => fetchDashboardData()}
      />
    </div>
  );
}