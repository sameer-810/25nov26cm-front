import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMcqApi } from "@/mcq/lib/api";
import type { AccessItem } from "@/components/members/AccessSwitches";

interface Response {
  person: { _id: string; role: string; roleIds?: string[] };
  permissions: (AccessItem & { on: boolean })[];
  overrides?: { allow: string[]; deny: string[] };
}

// One person's saved switches, loaded by their user ID for the Edit Member form. The form sends
// `value` with the rest of the member's details when it is saved, and only if it changed.
export function usePersonAccess(userId: string | null) {
  const api = useMcqApi();
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/tool-access/permissions", userId],
    queryFn: () => api.get<Response>(`/api/tool-access/permissions/${userId}`),
    enabled: !!userId,
  });
  const saved = useMemo(() => (data?.permissions || []).filter((p) => p.on).map((p) => p.key), [data]);
  const [value, setValue] = useState<string[]>([]);
  useEffect(() => setValue(saved), [saved]);
  const dirty = [...value].sort().join() !== [...saved].sort().join();
  const items = data?.permissions || [];
  // Reset to Role Defaults: exactly what the person's roles give them, no exceptions.
  const reset = () => setValue(items.filter((p) => p.inherited && p.available !== false).map((p) => p.key));
  const exceptions = items.filter((p) => p.inherited !== undefined && value.includes(p.key) !== p.inherited).length;
  return { items, value, setValue, reset, exceptions, dirty, loading: isLoading, failed: !!error };
}
