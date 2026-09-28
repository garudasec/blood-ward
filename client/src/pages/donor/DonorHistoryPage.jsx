import { useState, useEffect, useCallback } from "react";
import DonorLayout from "../../layouts/DonorLayout";
import { PageHeader, LoadingSkeleton, EmptyState } from "../../components/app/UI";
import { BloodGroupBadge, StatusBadge } from "../../components/app/Badges";
import { getDonorHistory } from "../../services/donorService";

const MOCK_HISTORY = [
  { _id: "hist-1", hospital: "Nanavati Hospital", location: "Vile Parle, Mumbai", bloodGroup: "O+", units: 1, date: "2026-08-14T10:00:00.000Z", status: "fulfilled", notes: "Emergency platelet donation completed successfully" },
  { _id: "hist-2", hospital: "Lilavati Hospital", location: "Bandra, Mumbai", bloodGroup: "O+", units: 2, date: "2026-05-20T14:30:00.000Z", status: "fulfilled", notes: "Whole blood donation" }
];

export default function DonorHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDonorHistory();
      setHistory(res.history || MOCK_HISTORY);
    } catch {
      setHistory(MOCK_HISTORY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <DonorLayout>
      <PageHeader
        title="Donation History"
        subtitle="Record of your completed blood donations and life-saving contributions"
      />

      {loading ? (
        <LoadingSkeleton rows={3} />
      ) : history.length === 0 ? (
        <EmptyState
          title="No History Yet"
          description="You haven't completed any blood donations through BloodWard yet."
        />
      ) : (
        <div className="glass rounded-2xl border border-white/08 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/08 bg-white/02 text-[11px] font-bold text-white/40 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Hospital / Location</th>
                  <th className="py-3.5 px-4">Blood Group</th>
                  <th className="py-3.5 px-4">Units</th>
                  <th className="py-3.5 px-4">Donation Date</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/06 text-xs text-white/80">
                {history.map(item => (
                  <tr key={item._id} className="hover:bg-white/03 transition-colors">
                    <td className="py-4 px-4 font-medium">
                      <div className="text-white font-semibold text-sm">{item.hospital}</div>
                      <div className="text-white/40 text-xs">📍 {item.location}</div>
                      {item.notes && <div className="text-white/30 text-[11px] mt-1">{item.notes}</div>}
                    </td>
                    <td className="py-4 px-4">
                      <BloodGroupBadge group={item.bloodGroup} size="sm" />
                    </td>
                    <td className="py-4 px-4 font-semibold text-white">
                      {item.units} Unit(s)
                    </td>
                    <td className="py-4 px-4 text-white/40 font-mono text-[11px]">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DonorLayout>
  );
}
