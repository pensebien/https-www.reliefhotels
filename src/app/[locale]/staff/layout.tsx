import { StaffShell } from "@/features/staff-shell/components/staff-shell";
import type { ReactNode } from "react";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
