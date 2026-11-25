import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMcqApi } from "@/mcq/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { Pencil, Plus } from "lucide-react";
import { LEAVE_TYPE_LABELS, refreshLeave, type LeavePolicy } from "@/lib/leave";

interface Member { _id: string; firstName: string; lastName: string; role: string }
interface Form { leaveType: string; yearlyLimit: string; monthlyLimit: string; maxConsecutiveDays: string; year: string; carryForward: boolean; halfDayAllowed: boolean; userIds: string[] }

const KEY = ["/api/leave-policy"];
const blank = (year: number): Form => ({ leaveType: "casual", yearlyLimit: "12", monthlyLimit: "0", maxConsecutiveDays: "0", year: String(year), carryForward: false, halfDayAllowed: true, userIds: [] });
const toForm = (p: LeavePolicy): Form => ({
  leaveType: p.leaveType, yearlyLimit: String(p.yearlyLimit), monthlyLimit: String(p.monthlyLimit), maxConsecutiveDays: String(p.maxConsecutiveDays),
  year: p.year == null ? "" : String(p.year), carryForward: p.carryForward, halfDayAllowed: p.halfDayAllowed, userIds: p.userIds,
});

function PolicyDialog({ editing, year, onClose }: { editing: LeavePolicy | null; year: number; onClose: () => void }) {
  const api = useMcqApi();
  const { toast } = useToast();
  const [form, setForm] = useState<Form>(editing ? toForm(editing) : blank(year));
  const [search, setSearch] = useState("");
  const { data: members = [] } = useQuery({ queryKey: ["/api/users", "leave-policy"], queryFn: () => api.get<Member[]>("/api/users") });
  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, yearlyLimit: Number(form.yearlyLimit), monthlyLimit: Number(form.monthlyLimit), maxConsecutiveDays: Number(form.maxConsecutiveDays), year: form.year === "" ? null : Number(form.year) };
      return editing ? api.put(`/api/leave-policy/${editing._id}`, body) : api.post("/api/leave-policy", body);
    },
    onSuccess: () => {
      refreshLeave();
      toast({ title: "Leave policy saved" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Not saved", description: err.message, variant: "destructive" }),
  });
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (id: string, on: boolean) => set({ userIds: on ? [...form.userIds, id] : form.userIds.filter((x) => x !== id) });
  const q = search.trim().toLowerCase();
  const listed = members.filter((m) => m.role !== "superadmin" && (!q || `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)));
  const number = (key: "yearlyLimit" | "monthlyLimit" | "maxConsecutiveDays", label: string, hint: string) => (
    <div>
      <Label htmlFor={`policy-${key}`}>{label}</Label>
      <Input id={`policy-${key}`} type="number" min={0} max={366} step={0.5} value={form[key]} onChange={(e) => set({ [key]: e.target.value })} />
      <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit leave policy" : "New leave policy"}</DialogTitle>
          <DialogDescription>A yearly allowance for one leave type. A policy for a given year, or for chosen people, wins over a general one.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Leave type</Label>
              <Select value={form.leaveType} onValueChange={(v) => set({ leaveType: v })} disabled={!!editing}>
                <SelectTrigger data-testid="select-policy-type"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="policy-year">Policy year</Label>
              <Input id="policy-year" type="number" min={2000} max={2100} placeholder="Every year" value={form.year} onChange={(e) => set({ year: e.target.value })} data-testid="input-policy-year" />
              <p className="text-xs text-muted-foreground mt-0.5">Empty: every year</p>
            </div>
          </div>
          {number("yearlyLimit", "Yearly allowance (days)", "0 means no limit")}
          <div className="grid grid-cols-2 gap-3">
            {number("monthlyLimit", "Monthly limit", "0: none")}
            {number("maxConsecutiveDays", "Max days in a row", "0: none")}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="policy-carry" className="font-normal">Carry unused days into next year</Label>
            <Switch id="policy-carry" checked={form.carryForward} onCheckedChange={(v) => set({ carryForward: v })} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="policy-half" className="font-normal">Half days allowed</Label>
            <Switch id="policy-half" checked={form.halfDayAllowed} onCheckedChange={(v) => set({ halfDayAllowed: v })} />
          </div>
          <div className="space-y-2">
            <Label>Applies to</Label>
            <p className="text-xs text-muted-foreground">{form.userIds.length ? `${form.userIds.length} chosen ${form.userIds.length === 1 ? "person" : "people"}` : "Everyone (tick people to limit it to them)"}</p>
            <Input placeholder="Search people" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search people" />
            <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
              {listed.map((m) => (
                <label key={m._id} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer">
                  <Checkbox checked={form.userIds.includes(m._id)} onCheckedChange={(v) => toggle(m._id, v === true)} />
                  {m.firstName} {m.lastName} <span className="text-xs text-muted-foreground">{m.role.replace("_", " ")}</span>
                </label>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={save.isPending} data-testid="button-save-policy">{save.isPending ? "Saving..." : "Save Policy"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Admins: the organization's yearly leave policies.
export default function LeavePolicies({ year }: { year: number }) {
  const api = useMcqApi();
  const { toast } = useToast();
  const [editing, setEditing] = useState<LeavePolicy | null | "new">(null);
  const { data: policies = [], isLoading } = useQuery({ queryKey: KEY, queryFn: () => api.get<LeavePolicy[]>("/api/leave-policy") });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/leave-policy/${id}`),
    onSuccess: () => { refreshLeave(); toast({ title: "Policy removed" }); },
    onError: (err: Error) => toast({ title: "Not removed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">Allowances apply to leave by its dates. Only approved leave uses them; pending leave is held until decided.</p>
        <Button size="sm" onClick={() => setEditing("new")} data-testid="button-new-policy"><Plus className="w-4 h-4 mr-1" />New Policy</Button>
      </div>
      {isLoading ? <Skeleton className="h-24 w-full" /> : policies.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No leave policies yet. Without one, leave has no yearly limit.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {policies.map((p) => (
            <Card key={p._id} data-testid={`card-policy-${p._id}`}>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{LEAVE_TYPE_LABELS[p.leaveType] || p.leaveType} · {p.year ?? "Every year"}</p>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit policy" onClick={() => setEditing(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <ConfirmDeleteButton title="Remove this policy?" description="Leave records stay as they are; balances are worked out again without this allowance." onConfirm={() => remove.mutate(p._id)} disabled={remove.isPending} testId={`button-delete-policy-${p._id}`} />
                  </div>
                </div>
                <p className="text-sm">{p.yearlyLimit > 0 ? `${p.yearlyLimit} days a year` : "No yearly limit"}{p.carryForward && ", unused days carry forward"}</p>
                <p className="text-xs text-muted-foreground">
                  {p.userIds.length ? `${p.userIds.length} chosen ${p.userIds.length === 1 ? "person" : "people"}` : "Everyone"}
                  {p.monthlyLimit > 0 && ` · ${p.monthlyLimit} a month`}{p.maxConsecutiveDays > 0 && ` · at most ${p.maxConsecutiveDays} in a row`}{!p.halfDayAllowed && " · no half days"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {editing && <PolicyDialog editing={editing === "new" ? null : editing} year={year} onClose={() => setEditing(null)} />}
    </div>
  );
}
