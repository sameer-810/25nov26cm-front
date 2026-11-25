import { useQuery } from "@tanstack/react-query";
import { useMcqApi } from "@/mcq/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LEAVE_TYPE_LABELS, days, leaveDates, type LeaveBalance } from "@/lib/leave";

// My allowance, taken, pending and remaining days for a year, by leave type, and my upcoming approved leave.
export default function LeaveBalanceCards({ year }: { year: number }) {
  const api = useMcqApi();
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/leaves/balance", year],
    queryFn: () => api.get<LeaveBalance>(`/api/leaves/balance?year=${year}`),
  });
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (error || !data) return <p className="text-sm text-destructive">Couldn't load your leave balance.</p>;

  const tiles = [
    { label: "Annual Allowance", value: data.hasAllowance ? days(data.allowance) : "No limit set", tone: "" },
    { label: "Leave Taken", value: days(data.taken), tone: "" },
    { label: "Leave Pending", value: days(data.pending), tone: "text-chart-4" },
    { label: "Leave Remaining", value: data.hasAllowance ? days(data.remaining) : "—", tone: "text-chart-2" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-xl font-bold ${t.tone}`} data-testid={`text-balance-${t.label.toLowerCase().replace(/\s+/g, "-")}`}>{t.value}</p>
              <p className="text-xs text-muted-foreground">{t.label} {year}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {data.byType.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">By leave type</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground text-left">
                <tr><th className="py-1 pr-3 font-medium">Type</th><th className="pr-3 font-medium">Allowance</th><th className="pr-3 font-medium">Taken</th><th className="pr-3 font-medium">Pending</th><th className="font-medium">Remaining</th></tr>
              </thead>
              <tbody>
                {data.byType.map((b) => (
                  <tr key={b.leaveType} className="border-t">
                    <td className="py-1.5 pr-3">{LEAVE_TYPE_LABELS[b.leaveType] || b.leaveType}</td>
                    <td className="pr-3">{b.limited ? <>{b.allowance}{b.carried > 0 && <span className="text-muted-foreground"> + {b.carried} carried</span>}</> : "No limit"}</td>
                    <td className="pr-3">{b.taken}</td>
                    <td className="pr-3">{b.pending}</td>
                    <td>{b.remaining ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      {data.upcoming.length > 0 && (
        <p className="text-sm text-muted-foreground" data-testid="text-upcoming-leave">
          Upcoming approved leave: {data.upcoming.map((l) => `${LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType}, ${leaveDates(l)}`).join("; ")}
        </p>
      )}
    </div>
  );
}
