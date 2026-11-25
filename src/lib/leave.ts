// Shared leave types and labels for the Leave page, its tabs and the settings switch.
import { queryClient } from "@/lib/queryClient";

// Every leave figure (lists, balances, summary, who's away, dashboard) after leave or a policy changes.
export const refreshLeave = () => queryClient.invalidateQueries({
  predicate: (q) => /^\/api\/(leaves|leave-policy|dashboard)/.test(String(q.queryKey[0])),
});

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  sick: "Sick Leave",
  casual: "Casual Leave",
  personal: "Personal Leave",
  vacation: "Vacation",
  other: "Other",
  paid: "Paid Leave",
  unpaid: "Unpaid Leave",
};

export interface LeavePerson { _id: string; firstName: string; lastName: string; photoUrl?: string }

// Approved leave as shared with colleagues: never the reason or review note.
export interface SharedLeave {
  _id: string;
  userId: LeavePerson | string;
  leaveType: string;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  halfDayPeriod?: string;
  status: string;
}

export interface TypeBalance {
  leaveType: string;
  allowance: number;
  carried: number;
  taken: number;
  pending: number;
  remaining: number | null;
  limited: boolean;
}

export interface LeaveBalance {
  year: number;
  byType: TypeBalance[];
  allowance: number;
  taken: number;
  pending: number;
  remaining: number;
  hasAllowance: boolean;
  upcoming: SharedLeave[];
}

export interface LeavePolicy {
  _id: string;
  leaveType: string;
  yearlyLimit: number;
  monthlyLimit: number;
  maxConsecutiveDays: number;
  carryForward: boolean;
  halfDayAllowed: boolean;
  year: number | null;
  userIds: string[];
}

export const personName = (p: SharedLeave["userId"]) => (typeof p === "object" ? `${p.firstName} ${p.lastName}`.trim() : "");

export const formatDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export const leaveDates = (l: Pick<SharedLeave, "startDate" | "endDate" | "isHalfDay" | "halfDayPeriod">) =>
  l.isHalfDay ? `${formatDate(l.startDate)} (half day, ${l.halfDayPeriod})`
    : l.startDate === l.endDate ? formatDate(l.startDate) : `${formatDate(l.startDate)} – ${formatDate(l.endDate)}`;

// Days are whole or half; show "1.5" but never "2.0".
export const days = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} day${n === 1 ? "" : "s"}`;
