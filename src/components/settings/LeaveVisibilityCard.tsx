import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMcqApi } from "@/mcq/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalendarCheck } from "lucide-react";

interface OrgSettings { approvedLeaveVisible?: boolean }
const KEY = ["/api/organizations/my"];

// Approved Leave Visibility: on, everyone sees who is away and when on the Leave page. Reasons stay private.
export default function LeaveVisibilityCard() {
  const api = useMcqApi();
  const { toast } = useToast();
  const { data } = useQuery({ queryKey: KEY, queryFn: () => api.get<OrgSettings>("/api/organizations/my") });
  const save = useMutation({
    mutationFn: (approvedLeaveVisible: boolean) => api.patch<OrgSettings>("/api/organizations/my/leave-visibility", { approvedLeaveVisible }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ["/api/leaves/approved"] });
      toast({ title: res.approvedLeaveVisible ? "Everyone can now see approved leave" : "People now see only their own leave" });
    },
    onError: (err: Error) => toast({ title: "Not saved", description: err.message, variant: "destructive" }),
  });

  return (
    <Card data-testid="card-leave-visibility">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><CalendarCheck className="w-4 h-4" aria-hidden /> Leave</CardTitle>
        <CardDescription>Who can see approved leave on the Leave page's Who's Away tab.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="switch-leave-visibility" className="text-sm font-medium">Approved Leave Visibility</Label>
            <p className="text-xs text-muted-foreground">
              On: everyone sees who is on approved leave, the leave type and dates. Reasons, notes and pending requests stay private.
              Off: people see only their own leave.
            </p>
          </div>
          <Switch
            id="switch-leave-visibility"
            checked={!!data?.approvedLeaveVisible}
            disabled={!data || save.isPending}
            onCheckedChange={(on) => save.mutate(on)}
            data-testid="switch-leave-visibility"
          />
        </div>
      </CardContent>
    </Card>
  );
}
