import { apiFetch, safeJson } from "@/lib/api";
import { downloadAuthorized } from "@/lib/download";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { localDateString } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, UserCheck, UserX, Clock, CalendarOff, AlertCircle, Download, FileSpreadsheet, FileText, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { AttendanceTrendChart, type AttendancePoint } from "./org-admin/attendance-trend-chart";
import { AttendanceDistributionChart } from "./org-admin/attendance-distribution-chart";
import { AcademyOverview } from "./org-admin/academy-overview";
import { featureOn } from "@/academy/lib/academy";

interface DashboardMember {
  _id: string;
  firstName: string;
  lastName: string;
}

interface OrgDashboardData {
  totalMembers: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  pendingCount: number;
  pendingLeaves: number;
  organization?: { name?: string };
  roleBreakdown: { _id: string; count: number }[];
  chartData: AttendancePoint[];
  startDate: string;
  endDate: string;
  allMembers: DashboardMember[];
}

const statusBadge: Record<string, string> = {
  present: "bg-chart-2/10 text-chart-2",
  late: "bg-chart-4/10 text-chart-4",
  absent: "bg-destructive/10 text-destructive",
  pending: "bg-chart-3/10 text-chart-3",
};

const periodLabels: Record<string, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
  yearly: "This Year",
};

const chartTitles: Record<string, string> = {
  daily: "Today's Attendance",
  weekly: "Weekly Attendance Trend",
  monthly: "Daily Attendance Trend",
  yearly: "Monthly Attendance Trend",
};

export default function OrgAdminDashboard() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState("daily");
  const [drilldownType, setDrilldownType] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<any>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>("");

  const orgType = user?.organizationId?.type;

  function downloadReport(format: string, type: "team" | "user" = "team") {
    const url = type === "team"
      ? `/api/reports/team?period=${period}&format=${format}`
      : `/api/reports/user/${selectedMember}?period=${period}&format=${format}`;
    downloadAuthorized(url, token, `report.${format}`).catch((err: Error) =>
      toast({ title: "Report download failed", description: err.message, variant: "destructive" })
    );
  }

  const { data, isLoading, isError, refetch } = useQuery<OrgDashboardData>({
    queryKey: ["/api/dashboard/org", period, selectedMember],
    queryFn: async () => {
      let url = `/api/dashboard/org?period=${period}`;
      if (selectedMember) url += `&memberId=${selectedMember}`;
      const res = await apiFetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return safeJson(res);
    },
  });

  async function openDrilldown(type: string) {
    setDrilldownType(type);
    setDrilldownLoading(true);
    try {
      const startDate = data?.startDate || localDateString();
      const endDate = data?.endDate || startDate;
      const res = await apiFetch(`/api/dashboard/org/drilldown?type=${type}&startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDrilldownData(await res.json());
      }
    } catch (e) {}
    setDrilldownLoading(false);
  }

  function closeDrilldown() {
    setDrilldownType(null);
    setDrilldownData(null);
  }

  const pLabel = periodLabels[period] || "Today";

  const drilldownTitles: Record<string, string> = {
    total: "Total Members",
    present: `Present ${pLabel}`,
    absent: `Absent ${pLabel}`,
    late: `Late ${pLabel}`,
    pending: `Pending ${pLabel}`,
    pending_leaves: "Pending Leave Requests",
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return <div className="p-4 md:p-6"><ErrorState what="the dashboard" onRetry={() => refetch()} /></div>;
  }

  // presentCount already includes late arrivals and half days.
  const presentCount = data.presentCount || 0;
  const lateCount = data.lateCount || 0;
  const absentCount = data.absentCount || 0;
  const marked = presentCount + absentCount;
  const attendanceRate = marked > 0 ? Math.round((presentCount / marked) * 100) : 0;
  const memberLabel = orgType === "academy" ? "Students" : "Employees";
  const totalMembers = data.totalMembers || 0;
  const roleBreakdown = data.roleBreakdown || [];
  const pendingCount = data.pendingCount || 0;
  const pendingLeaves = data.pendingLeaves || 0;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4">
        <div>
          <h1 className="page-title" data-testid="text-org-dashboard-title">
            {data.organization?.name || "Organization"} Dashboard
          </h1>
          <p className="text-muted-foreground">
            {pLabel}'s overview and attendance summary
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {data.allMembers?.length > 0 && (
            <Select value={selectedMember || "all"} onValueChange={(v) => setSelectedMember(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]" data-testid="select-member-filter" aria-label={`Filter ${memberLabel}`}>
                <SelectValue placeholder={`Filter ${memberLabel}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {memberLabel}</SelectItem>
                {data.allMembers.map((m) => (
                  <SelectItem key={m._id} value={m._id}>{m.firstName} {m.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px]" data-testid="select-period-filter" aria-label="Period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-download-reports">
                <Download className="w-4 h-4 mr-2" />
                Reports
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadReport("xlsx", "team")} data-testid="button-download-team-excel">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Team Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadReport("docx", "team")} data-testid="button-download-team-word">
                <FileText className="w-4 h-4 mr-2" />
                Team Word
              </DropdownMenuItem>
              {selectedMember && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => downloadReport("xlsx", "user")} data-testid="button-download-member-excel">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Member Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadReport("docx", "user")} data-testid="button-download-member-word">
                    <FileText className="w-4 h-4 mr-2" />
                    Member Word
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard label="Total Members" value={totalMembers} icon={<Users />} tone="1" onClick={() => openDrilldown("total")} testId="text-total-members" />
        <StatCard label={`Present ${pLabel}`} value={presentCount} icon={<UserCheck />} tone="2" onClick={() => openDrilldown("present")} testId="text-present-count" />
        <StatCard label={`Absent ${pLabel}`} value={absentCount} icon={<UserX />} tone="destructive" onClick={() => openDrilldown("absent")} testId="text-absent-count" />
        <StatCard label={`Late ${pLabel}`} value={lateCount} icon={<Clock />} tone="4" onClick={() => openDrilldown("late")} testId="text-late-count" />
        <StatCard label="Pending Leaves" value={pendingLeaves} icon={<CalendarOff />} tone="3" onClick={() => openDrilldown("pending_leaves")} testId="text-pending-leaves" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">{chartTitles[period]}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-72">
              <AttendanceTrendChart data={data.chartData || []} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceDistributionChart
              onTime={Math.max(0, presentCount - lateCount)}
              late={lateCount}
              absent={absentCount}
              rate={attendanceRate}
              periodLabel={pLabel}
            />
          </CardContent>
        </Card>
      </div>

      {orgType === "academy" && featureOn(user, "lectures") && <AcademyOverview />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">Team Composition</CardTitle>
          </CardHeader>
          <CardContent>
            {roleBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No members yet</p>
            ) : (
              <ul className="space-y-4">
                {roleBreakdown.map((rb) => {
                  const share = totalMembers > 0 ? Math.round((rb.count / totalMembers) * 100) : 0;
                  return (
                    <li key={rb._id}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="capitalize">{rb._id.replace(/_/g, " ")}s</span>
                        <span className="stat-figure text-muted-foreground">{rb.count} · {share}%</span>
                      </div>
                      <Progress value={share} className="h-2" aria-label={`${rb._id}: ${share}% of members`} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 via-card to-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingCount === 0 && pendingLeaves === 0 ? (
              <p className="text-sm text-muted-foreground py-4">All caught up. Nothing is waiting for your review.</p>
            ) : (
              <>
                {pendingCount > 0 && (
                  <Button variant="outline" className="w-full justify-between h-auto py-3" onClick={() => openDrilldown("pending")}>
                    <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-chart-3" /> Attendance awaiting confirmation</span>
                    <span className="flex items-center gap-1"><Badge variant="secondary">{pendingCount}</Badge><ChevronRight className="w-4 h-4" /></span>
                  </Button>
                )}
                {pendingLeaves > 0 && (
                  <Button variant="outline" className="w-full justify-between h-auto py-3" onClick={() => openDrilldown("pending_leaves")}>
                    <span className="flex items-center gap-2"><CalendarOff className="w-4 h-4 text-chart-3" /> Leave requests to review</span>
                    <span className="flex items-center gap-1"><Badge variant="secondary">{pendingLeaves}</Badge><ChevronRight className="w-4 h-4" /></span>
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!drilldownType} onOpenChange={(open) => { if (!open) closeDrilldown(); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle data-testid="text-drilldown-title">{drilldownTitles[drilldownType || ""] || "Details"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {drilldownLoading && (
              <div className="space-y-3 py-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            )}
            {!drilldownLoading && drilldownData && !["pending_leaves"].includes(drilldownType || "") && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  {drilldownData.count} member(s) — {drilldownData.startDate === drilldownData.endDate ? drilldownData.startDate : `${drilldownData.startDate} to ${drilldownData.endDate}`}
                </p>
                {(drilldownData.members || []).map((m: any, idx: number) => (
                  <div key={m._id || idx} className="flex items-center justify-between p-3 rounded-md bg-muted/30" data-testid={`drilldown-member-${m._id}`}>
                    <div>
                      <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.role} {m.username ? `• @${m.username}` : ""}</p>
                    </div>
                    <Badge className={statusBadge[m.status] || "bg-muted text-muted-foreground"}>
                      {m.status === "present" ? "Present" : m.status === "late" ? "Late" : m.status === "pending" ? "Pending" : "Absent"}
                    </Badge>
                  </div>
                ))}
                {drilldownData.members?.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">No members found</p>
                )}
              </div>
            )}
            {!drilldownLoading && drilldownData && drilldownType === "pending_leaves" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">{drilldownData.count} pending request(s)</p>
                {(drilldownData.leaves || []).map((l: any) => (
                  <div key={l._id} className="flex items-center justify-between p-3 rounded-md bg-muted/30" data-testid={`drilldown-leave-${l._id}`}>
                    <div>
                      <p className="text-sm font-medium">{l.userId?.firstName} {l.userId?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{l.startDate} - {l.endDate} • {l.reason}</p>
                    </div>
                    <Badge className="bg-chart-3/10 text-chart-3">Pending</Badge>
                  </div>
                ))}
                {drilldownData.leaves?.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">No pending leaves</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
