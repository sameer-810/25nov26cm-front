import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

// One permission from GET /api/roles/catalog.
export interface CatalogItem {
  key: string;
  label: string;
  hint: string;
  module: string | null;
  isModule: boolean;
  requires: string | null;
  roles: string[];
  available: boolean;
}

type Preset = "none" | "full" | "custom";

interface Props {
  catalog: CatalogItem[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

const ROLE_LABELS: Record<string, string> = { manager: "Managers", teacher: "Teachers", employee: "Employees", student: "Students", member: "Members" };
const whoCanUse = (roles: string[]) => (roles.length ? `For ${roles.map((r) => ROLE_LABELS[r] || r).join(", ")}` : "No role can use this");

// Modules with a preset each (No Access / Full Access / Custom); Custom opens the features inside.
// A feature always brings its module and whatever it requires, so every choice works on its own.
export function PermissionBuilder({ catalog, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const selected = new Set(value);
  const byKey = new Map(catalog.map((c) => [c.key, c]));
  const modules = catalog.filter((c) => c.isModule);
  const featuresOf = (moduleKey: string) => catalog.filter((c) => c.module === moduleKey && c.available);
  const usable = catalog.filter((c) => c.available);

  const emit = (next: Set<string>) => onChange(catalog.filter((c) => next.has(c.key)).map((c) => c.key));
  const withParents = (set: Set<string>, key: string) => {
    for (let item = byKey.get(key); item; item = item.requires ? byKey.get(item.requires) : undefined) {
      set.add(item.key);
      if (item.module) set.add(item.module);
    }
  };

  const presetOf = (moduleKey: string): Preset => {
    const features = featuresOf(moduleKey);
    if (!selected.has(moduleKey)) return "none";
    if (features.length === 0) return "full";
    const on = features.filter((f) => selected.has(f.key)).length;
    return on === features.length ? "full" : "custom";
  };

  const applyPreset = (moduleKey: string, preset: Preset) => {
    const next = new Set(selected);
    const features = featuresOf(moduleKey);
    if (preset === "none") {
      next.delete(moduleKey);
      features.forEach((f) => next.delete(f.key));
    } else if (preset === "full") {
      next.add(moduleKey);
      features.forEach((f) => next.add(f.key));
    } else {
      next.add(moduleKey);
      setOpen((o) => new Set(o).add(moduleKey));
    }
    emit(next);
  };

  const toggleFeature = (key: string, on: boolean) => {
    const next = new Set(selected);
    if (on) withParents(next, key);
    else {
      next.delete(key);
      // Anything that needs this feature goes with it.
      catalog.filter((c) => c.requires === key).forEach((c) => next.delete(c.key));
    }
    emit(next);
  };

  const toggleOpen = (key: string) => setOpen((o) => {
    const copy = new Set(o);
    if (copy.has(key)) copy.delete(key); else copy.add(key);
    return copy;
  });

  const featureCount = catalog.filter((c) => !c.isModule && selected.has(c.key)).length;

  return (
    <div className="space-y-3" data-testid="permission-builder">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground" data-testid="text-permission-count">
          <span className="font-semibold text-foreground">{featureCount}</span> of {usable.filter((c) => !c.isModule).length} features selected
        </p>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => emit(new Set(usable.map((c) => c.key)))} data-testid="button-permissions-all">Select All</Button>
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => emit(new Set())} data-testid="button-permissions-none">Clear All</Button>
        </div>
      </div>

      <ul className="space-y-2">
        {modules.map((m) => {
          const features = featuresOf(m.key);
          const preset = presetOf(m.key);
          const expanded = open.has(m.key) && features.length > 0;
          const onCount = features.filter((f) => selected.has(f.key)).length;
          return (
            <li key={m.key} className={cn("rounded-lg border", !m.available && "opacity-60")} data-testid={`builder-module-${m.key}`}>
              <div className="flex items-center gap-3 p-3 flex-wrap">
                <button
                  type="button"
                  className="flex items-center gap-2 min-w-0 flex-1 text-left disabled:cursor-default"
                  onClick={() => toggleOpen(m.key)}
                  disabled={features.length === 0}
                  aria-expanded={expanded}
                  aria-controls={`builder-features-${m.key}`}
                >
                  {features.length > 0 && <ChevronDown className={cn("w-4 h-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />}
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{m.label}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {features.length ? `${onCount}/${features.length} features` : m.hint}
                    </span>
                  </span>
                </button>
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={preset}
                  onValueChange={(v) => v && applyPreset(m.key, v as Preset)}
                  disabled={disabled || !m.available}
                  aria-label={`${m.label} access`}
                >
                  <ToggleGroupItem value="none" className="text-xs px-2.5">No Access</ToggleGroupItem>
                  <ToggleGroupItem value="full" className="text-xs px-2.5">Full Access</ToggleGroupItem>
                  {features.length > 0 && <ToggleGroupItem value="custom" className="text-xs px-2.5">Custom</ToggleGroupItem>}
                </ToggleGroup>
              </div>
              {expanded && (
                <div id={`builder-features-${m.key}`} className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t p-2">
                  {features.map((f) => (
                    <div key={f.key} className="flex items-start justify-between gap-3 rounded-md border p-2">
                      <label htmlFor={`perm-${f.key}`} className="text-sm min-w-0">
                        <span className="font-medium">{f.label}</span>
                        <span className="block text-xs text-muted-foreground">{f.hint}</span>
                        <span className="block text-[11px] text-muted-foreground/80 mt-0.5">{whoCanUse(f.roles)}</span>
                      </label>
                      <Switch id={`perm-${f.key}`} checked={selected.has(f.key)} disabled={disabled} onCheckedChange={(on) => toggleFeature(f.key, on)} aria-label={f.label} data-testid={`switch-perm-${f.key}`} />
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">A feature only counts for people whose built-in role can use it. Personal exceptions are set on Edit Member.</p>
    </div>
  );
}
