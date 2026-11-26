import { memo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { STATUS_COLORS } from "@/lib/chart-colors";

interface AttendanceDistributionProps {
  onTime: number;
  late: number;
  absent: number;
  rate: number;
  periodLabel: string;
}

function AttendanceDistributionChartImpl({ onTime, late, absent, rate, periodLabel }: AttendanceDistributionProps) {
  const slices = [
    { name: "On time", value: onTime, color: STATUS_COLORS.present },
    { name: "Late", value: late, color: STATUS_COLORS.late },
    { name: "Absent", value: absent, color: STATUS_COLORS.absent },
  ];
  const total = onTime + late + absent;
  // An empty period still draws the ring, as a single muted track.
  const pieData = total > 0 ? slices : [{ name: "No data", value: 1, color: "hsl(var(--muted))" }];

  return (
    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6">
      <div className="relative w-44 h-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius="72%"
              outerRadius="100%"
              paddingAngle={total > 0 ? 2 : 0}
              stroke="none"
              animationDuration={500}
            >
              {pieData.map((s) => <Cell key={s.name} fill={s.color} />)}
            </Pie>
            {total > 0 && <Tooltip />}
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="stat-figure text-3xl font-bold">{rate}%</span>
          <span className="text-xs text-muted-foreground">Attendance</span>
        </div>
      </div>
      <ul className="space-y-3 w-full" aria-label={`${periodLabel} attendance breakdown`}>
        {slices.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
              {s.name}
            </span>
            <span className="stat-figure text-lg font-semibold">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const AttendanceDistributionChart = memo(AttendanceDistributionChartImpl);
