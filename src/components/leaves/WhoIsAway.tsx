import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMcqApi } from "@/mcq/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RemoteImage } from "@/components/remote-image";
import { EmptyState } from "@/components/ui/states";
import { CalendarOff, User } from "lucide-react";
import { LEAVE_TYPE_LABELS, leaveDates, personName, type SharedLeave } from "@/lib/leave";

interface Approved { visible: boolean; everyone: boolean; from: string; to: string; leaves: SharedLeave[] }

const plus30 = (d: string) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + 30); return x.toISOString().slice(0, 10); };
const localToday = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

function LeaveRow({ leave }: { leave: SharedLeave }) {
  const person = typeof leave.userId === "object" ? leave.userId : null;
  return (
    <li className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
        <RemoteImage src={person?.photoUrl || ""} alt="" className="w-full h-full object-cover" fallback={<User className="w-4 h-4 text-muted-foreground" aria-hidden />} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{personName(leave.userId)}</p>
        <p className="text-xs text-muted-foreground">{LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType} · {leaveDates(leave)} · Approved</p>
      </div>
    </li>
  );
}

// Who is away on a date, and approved leave over the following 30 days.
export default function WhoIsAway() {
  const api = useMcqApi();
  const [date, setDate] = useState(localToday);
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/leaves/approved", date],
    queryFn: () => api.get<Approved>(`/api/leaves/approved?from=${date}&to=${plus30(date)}`),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
  const away = (data?.leaves || []).filter((l) => l.startDate <= date && l.endDate >= date);
  const later = (data?.leaves || []).filter((l) => l.startDate > date);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <Label htmlFor="away-date">Date</Label>
          <Input id="away-date" type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-away-date" />
        </div>
        {data && !data.everyone && (
          <p className="text-xs text-muted-foreground pb-2">Only your own leave is shown. Your admin can let everyone see approved leave in Settings.</p>
        )}
      </div>
      {isLoading ? <Skeleton className="h-32 w-full" /> : error ? <p className="text-sm text-destructive">Couldn't load approved leave.</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold mb-1">Away on this date ({away.length})</h2>
              {away.length ? <ul className="divide-y" data-testid="list-away">{away.map((l) => <LeaveRow key={l._id} leave={l} />)}</ul>
                : <EmptyState icon={CalendarOff} title="Nobody is on approved leave" description="" />}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold mb-1">Next 30 days ({later.length})</h2>
              {later.length ? <ul className="divide-y" data-testid="list-away-upcoming">{later.map((l) => <LeaveRow key={l._id} leave={l} />)}</ul>
                : <p className="text-sm text-muted-foreground py-4">No approved leave coming up.</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
