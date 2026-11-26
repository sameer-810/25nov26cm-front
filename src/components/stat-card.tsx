import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatTone = "1" | "2" | "3" | "4" | "5" | "destructive";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: StatTone;
  hint?: string;
  onClick?: () => void;
  testId?: string;
}

// Literal class strings so Tailwind's JIT scanner can see them.
const TONES: Record<StatTone, string> = {
  "1": "bg-chart-1/10 text-chart-1 ring-chart-1/30",
  "2": "bg-chart-2/10 text-chart-2 ring-chart-2/30",
  "3": "bg-chart-3/10 text-chart-3 ring-chart-3/30",
  "4": "bg-chart-4/10 text-chart-4 ring-chart-4/30",
  "5": "bg-chart-5/10 text-chart-5 ring-chart-5/30",
  destructive: "bg-destructive/10 text-destructive ring-destructive/30",
};

export function StatCard({ label, value, icon, tone = "1", hint, onClick, testId }: StatCardProps) {
  const body = (
    <CardContent className="p-4 md:p-5">
      <div className={cn("w-10 h-10 rounded-full ring-1 flex items-center justify-center mb-3 [&_svg]:w-5 [&_svg]:h-5", TONES[tone])}>
        {icon}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="stat-figure text-2xl md:text-3xl font-bold text-foreground mt-1" data-testid={testId}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  );

  if (!onClick) return <Card>{body}</Card>;
  return (
    <Card className="hover:border-primary/50 focus-within:border-primary/50">
      <button type="button" onClick={onClick} className="w-full text-left rounded-[inherit] focus-visible:outline-none" aria-label={`${label}: ${value}. View details`}>
        {body}
      </button>
    </Card>
  );
}
