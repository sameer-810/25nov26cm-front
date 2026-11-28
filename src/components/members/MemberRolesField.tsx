import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface AssignableRole {
  value: string;
  label: string;
  permissionKeys: string[];
}

interface Props {
  roles: AssignableRole[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

// Extra roles on top of the main role, shown as chips. Their permissions combine.
export function MemberRolesField({ roles, value, onChange, disabled }: Props) {
  const byId = new Map(roles.map((r) => [r.value, r]));
  const remaining = roles.filter((r) => !value.includes(r.value));
  const selected = value.map((id) => byId.get(id)).filter((r): r is AssignableRole => !!r);

  return (
    <div className="space-y-2" data-testid="member-roles">
      <Label>Additional Roles</Label>
      <div className="flex flex-wrap gap-1.5 min-h-[2rem] items-center">
        {selected.length === 0 && <span className="text-xs text-muted-foreground">No additional roles</span>}
        {selected.map((r) => (
          <Badge key={r.value} variant="secondary" className="gap-1 pr-1" data-testid={`chip-role-${r.value}`}>
            {r.label}
            <span className="text-muted-foreground font-normal">· {r.permissionKeys.length}</span>
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-muted disabled:opacity-50"
              onClick={() => onChange(value.filter((id) => id !== r.value))}
              disabled={disabled}
              aria-label={`Remove ${r.label}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      {remaining.length > 0 && (
        <Select value="" onValueChange={(id) => onChange([...value, id])} disabled={disabled}>
          <SelectTrigger className="h-9" data-testid="select-add-role" aria-label="Add a role"><SelectValue placeholder="Add a role…" /></SelectTrigger>
          <SelectContent>
            {remaining.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <p className="text-xs text-muted-foreground">They get everything these roles grant, together with their main role.</p>
    </div>
  );
}
