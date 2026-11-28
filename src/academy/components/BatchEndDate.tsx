import { CalendarCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { endDateFor, formatDay, parseDuration } from "@/academy/lib/duration";

interface Props {
  id: string;
  startDate: string;
  // The course's duration text; the end date follows from it when it can be read.
  duration?: string | null;
  endDate: string;
  onEndDateChange: (value: string) => void;
}

// The batch's end date when its course has a usable duration; otherwise none could be worked out, so ask.
export const needsEndDate = (duration?: string | null) => !parseDuration(duration);

export function BatchEndDate({ id, startDate, duration, endDate, onEndDateChange }: Props) {
  const computed = endDateFor(startDate, duration);
  if (computed || (!startDate && parseDuration(duration))) {
    return (
      <div className="space-y-1">
        <Label>Ends on</Label>
        <p className="flex h-9 items-center gap-2 rounded-md border border-dashed px-3 text-sm" data-testid={`${id}-computed`}>
          <CalendarCheck className="w-4 h-4 text-primary shrink-0" aria-hidden />
          <span className="font-medium">{computed ? formatDay(computed) : "After the start date"}</span>
          <span className="text-muted-foreground truncate">· {duration}</span>
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>End date</Label>
      <Input id={id} type="date" required min={startDate || undefined} value={endDate} onChange={(e) => onEndDateChange(e.target.value)} data-testid={id} />
      <p className="text-xs text-muted-foreground">
        {startDate ? "This course has no duration. Set one on the Syllabus page to fill this in automatically." : "Choose a start date first."}
      </p>
    </div>
  );
}
