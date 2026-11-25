import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMcqApi } from "@/mcq/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LEAVE_TYPE_LABELS, days, leaveDates, personName, type LeavePerson, type SharedLeave } from "@/lib/leave";

interface Row { user: LeavePerson & { role: string }; allowance: number; taken: number; pending: number; remaining: number; hasAllowance: boolean }
interface Summary {
  year: number;
  approvedDays: number;
  pendingDays: number;
  onLeaveToday: SharedLeave[];
  upcoming: SharedLeave[];
  byType: Record<string, { approved: number; pending: number }>;
  people: Row[];
}

// Admins: the whole organization. Managers: the employees they look after.
export default function LeaveSummary({ year, onYear }: { year: number; onYear: (y: number) => void }) {
  const api = useMcqApi();
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/leaves/summary", year],
    queryFn: () => api.get<Summary>(`/api/leaves/summary?year=${year}`),
  });
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (error || !data) return <p className="text-sm text-destructive">Couldn't load the leave summary.</p>;

  const q = search.trim().toLowerCase();
  const people = data.people.filter((r) => !q || `${r.user.firstName} ${r.user.lastName}`.toLowerCase().includes(q));
  const tiles = [
    { label: `Approved leave ${year}`, value: days(data.approvedDays) },
    { label: `Pending ${year}`, value: days(data.pendingDays) },
    { label: "On leave today", value: String(data.onLeaveToday.length) },
    { label: "Upcoming (30 days)", value: String(data.upcoming.length) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="summary-year" className="text-sm">Year</label>
        <Input id="summary-year" type="number" min={2000} max={2100} className="w-28" value={year} onChange={(e) => { const y = Number(e.target.value); if (y >= 2000 && y <= 2100) onYear(y); }} data-testid="input-summary-year" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <Card key={t.label}><CardContent className="p-4 text-center"><p className="text-xl font-bold">{t.value}</p><p className="text-xs text-muted-foreground">{t.label}</p></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">On leave today and coming up</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {[...data.onLeaveToday, ...data.upcoming].length === 0 && <p className="text-muted-foreground">No approved leave in the next 30 days.</p>}
            {[...data.onLeaveToday, ...data.upcoming].map((l) => (
              <p key={l._id}><span className="font-medium">{personName(l.userId)}</span> <span className="text-muted-foreground">· {LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType} · {leaveDates(l)}</span></p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{year} by leave type</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {Object.keys(data.byType).length === 0 && <p className="text-muted-foreground">No leave in {year}.</p>}
            {Object.entries(data.byType).map(([type, v]) => (
              <p key={type}>{LEAVE_TYPE_LABELS[type] || type}: <span className="font-medium">{days(v.approved)}</span> approved{v.pending > 0 && <span className="text-muted-foreground">, {days(v.pending)} pending</span>}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm">Balances by person</CardTitle>
          <Input placeholder="Search people" className="w-48" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search people" />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-leave-balances">
            <thead className="text-xs text-muted-foreground text-left">
              <tr><th className="py-1 pr-3 font-medium">Person</th><th className="pr-3 font-medium">Allowance</th><th className="pr-3 font-medium">Taken</th><th className="pr-3 font-medium">Pending</th><th className="font-medium">Remaining</th></tr>
            </thead>
            <tbody>
              {people.map((r) => (
                <tr key={r.user._id} className="border-t">
                  <td className="py-1.5 pr-3">{r.user.firstName} {r.user.lastName} <span className="text-xs text-muted-foreground">{r.user.role.replace("_", " ")}</span></td>
                  <td className="pr-3">{r.hasAllowance ? r.allowance : "No limit"}</td>
                  <td className="pr-3">{r.taken}</td>
                  <td className="pr-3">{r.pending}</td>
                  <td>{r.hasAllowance ? r.remaining : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
