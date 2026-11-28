import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BookOpenCheck, CalendarClock, GraduationCap, Layers, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { StatCard } from "@/components/stat-card";
import { useMcqApi } from "@/mcq/lib/api";

interface BatchRow {
  _id: string;
  batchName: string;
  status: "active" | "upcoming";
  course: string;
  teacher: string;
  students: number;
  portion: number;
  progress: number;
}

interface AcademyOverviewData {
  activeBatches: number;
  upcomingBatches: number;
  studentsEnrolled: number;
  averageProgress: number;
  pendingRecovery: number;
  lecturesThisWeek: number;
  batches: BatchRow[];
}

const BATCHES_SHOWN = 8;

// Batches, syllabus completion and make-ups at a glance, from GET /api/dashboard/academy.
export function AcademyOverview() {
  const api = useMcqApi();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/dashboard/academy"],
    queryFn: () => api.get<AcademyOverviewData>("/api/dashboard/academy"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }
  if (isError || !data) return <ErrorState what="the academy overview" onRetry={() => refetch()} />;

  const shown = data.batches.slice(0, BATCHES_SHOWN);

  return (
    <section className="space-y-4" aria-labelledby="academy-overview-title" data-testid="section-academy-overview">
      <div className="flex items-center justify-between gap-2">
        <h2 id="academy-overview-title" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Academy</h2>
        <Button variant="ghost" size="sm" asChild><Link href="/progress">Student Progress</Link></Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Active Batches" value={data.activeBatches} icon={<Layers />} tone="1" hint={`${data.studentsEnrolled} students${data.upcomingBatches ? ` · ${data.upcomingBatches} upcoming` : ""}`} testId="text-active-batches" />
        <StatCard label="Avg. Syllabus Done" value={`${data.averageProgress}%`} icon={<BookOpenCheck />} tone="2" hint="Across active batches" testId="text-average-progress" />
        <StatCard label="Pending Make-ups" value={data.pendingRecovery} icon={<RotateCcw />} tone={data.pendingRecovery ? "4" : "2"} hint="Missed topics to recover" testId="text-pending-recovery" />
        <StatCard label="Lectures This Week" value={data.lecturesThisWeek} icon={<CalendarClock />} tone="3" testId="text-lectures-week" />
      </div>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">Batch Progress</CardTitle>
          {data.batches.length > BATCHES_SHOWN && (
            <Button variant="ghost" size="sm" asChild><Link href="/batches">All {data.batches.length} batches</Link></Button>
          )}
        </CardHeader>
        <CardContent>
          {shown.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No active batches" description="Create a course on the Syllabus page, then a batch for it on Batches." testId="state-empty-academy" />
          ) : (
            <ul className="space-y-4">
              {shown.map((b) => (
                <li key={b._id}>
                  <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {b.batchName}
                        {b.status === "upcoming" && <Badge variant="secondary" className="ml-2 text-[10px] align-middle">Upcoming</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[b.course, b.teacher, `${b.students} students`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="stat-figure font-semibold shrink-0">{b.portion ? `${b.progress}%` : "No syllabus"}</span>
                  </div>
                  <Progress value={b.progress} className="h-2" aria-label={`${b.batchName}: ${b.progress}% of the syllabus completed`} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
