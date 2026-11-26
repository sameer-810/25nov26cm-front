// Theme-aware series colours: each resolves through the --chart-N tokens in index.css,
// so every chart follows light/dark mode without per-chart logic.
const CHART_COLORS = [1, 2, 3, 4, 5].map((n) => `hsl(var(--chart-${n}))`);

export const STATUS_COLORS = {
  present: "hsl(var(--success))",
  late: "hsl(var(--chart-4))",
  absent: "hsl(var(--destructive))",
} as const;

export const chartColor = (index: number) => CHART_COLORS[index % CHART_COLORS.length];
