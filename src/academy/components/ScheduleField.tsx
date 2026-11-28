import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = (typeof DAYS)[number];

interface Slot { days: Day[]; start: string; end: string }

// The schedule is stored as text ("Mon, Wed, Fri 15:30-16:30"), as before, so lists and older batches
// keep showing it. Text in another shape (typed before this picker) is kept until a new time is chosen.
const PATTERN = /^\s*((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:\s*,\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun))*)?\s*(\d{2}:\d{2})-(\d{2}:\d{2})\s*$/;

export function parseSchedule(value: string): Slot | null {
  const match = PATTERN.exec(value);
  if (!match) return null;
  const days = (match[1] || "").split(",").map((d) => d.trim()).filter(Boolean) as Day[];
  return { days, start: match[2], end: match[3] };
}

const toText = ({ days, start, end }: Slot) => {
  const ordered = DAYS.filter((d) => days.includes(d));
  return start && end ? `${ordered.length ? `${ordered.join(", ")} ` : ""}${start}-${end}` : "";
};

// A saved range is valid when its end is after its start.
export const scheduleError = (value: string): string | null => {
  const slot = parseSchedule(value);
  return slot && slot.end <= slot.start ? "The end time must be after the start time" : null;
};

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

// Remounts with the dialog, so it starts from the batch's saved schedule each time it opens.
export function ScheduleField({ id, value, onChange }: Props) {
  const [slot, setSlot] = useState<Slot>(() => parseSchedule(value) || { days: [], start: "", end: "" });
  const [legacy] = useState(() => (value && !parseSchedule(value) ? value : ""));
  const update = (next: Partial<Slot>) => {
    const merged = { ...slot, ...next };
    setSlot(merged);
    // Until both times are chosen, the schedule saved before stays.
    onChange(merged.start && merged.end ? toText(merged) : legacy);
  };
  const error = slot.start && slot.end && slot.end <= slot.start ? "The end time must be after the start time" : null;

  return (
    <fieldset className="space-y-2" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="text-sm font-medium">Schedule <span className="text-xs font-normal text-muted-foreground">(optional)</span></legend>
      <ToggleGroup
        type="multiple"
        variant="outline"
        size="sm"
        value={slot.days}
        onValueChange={(days) => update({ days: days as Day[] })}
        className="flex-wrap justify-start"
        aria-label="Days"
      >
        {DAYS.map((d) => <ToggleGroupItem key={d} value={d} className="px-2.5 text-xs data-[state=on]:border-primary data-[state=on]:bg-primary/15 data-[state=on]:text-primary" aria-label={d} data-testid={`${id}-day-${d}`}>{d}</ToggleGroupItem>)}
      </ToggleGroup>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`${id}-start`} className="text-xs text-muted-foreground">From</Label>
          <Input id={`${id}-start`} type="time" value={slot.start} onChange={(e) => update({ start: e.target.value })} data-testid={`${id}-start`} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-end`} className="text-xs text-muted-foreground">To</Label>
          <Input id={`${id}-end`} type="time" value={slot.end} min={slot.start || undefined} onChange={(e) => update({ end: e.target.value })} data-testid={`${id}-end`} />
        </div>
      </div>
      {legacy && <p className="text-xs text-muted-foreground">Saved as "{legacy}". Choose the times above to replace it.</p>}
      {error && <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>}
    </fieldset>
  );
}
