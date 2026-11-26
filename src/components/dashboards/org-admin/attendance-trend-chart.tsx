import { memo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { STATUS_COLORS } from "@/lib/chart-colors";

export interface AttendancePoint {
  day: string;
  present: number;
  late: number;
  absent: number;
}

const SERIES = [
  { key: "present", name: "Present" },
  { key: "late", name: "Late" },
  { key: "absent", name: "Absent" },
] as const;

const hasActivity = (data: AttendancePoint[]) => data.some((d) => d.present + d.late + d.absent > 0);

function AttendanceTrendChartImpl({ data }: { data: AttendancePoint[] }) {
  if (!hasActivity(data)) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState icon={CalendarCheck} title="No attendance recorded yet" description="Check-ins for this period appear here as people mark attendance." testId="state-empty-attendance-chart" />
      </div>
    );
  }

  // A single day (the daily view) has no trend to draw: compare the statuses as bars instead.
  if (data.length === 1) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={12}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip />
          <Legend iconType="circle" iconSize={8} />
          {SERIES.map(({ key, name }) => (
            <Bar key={key} dataKey={key} name={name} fill={STATUS_COLORS[key]} radius={[6, 6, 0, 0]} maxBarSize={56} animationDuration={500} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          {SERIES.map(({ key }) => (
            <linearGradient key={key} id={`trend-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={STATUS_COLORS[key]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={STATUS_COLORS[key]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={8} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip />
        <Legend iconType="circle" iconSize={8} />
        {SERIES.map(({ key, name }) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={name}
            stroke={STATUS_COLORS[key]}
            strokeWidth={2}
            fill={`url(#trend-${key})`}
            animationDuration={500}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export const AttendanceTrendChart = memo(AttendanceTrendChartImpl);
