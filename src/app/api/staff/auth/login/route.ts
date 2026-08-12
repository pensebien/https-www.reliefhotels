import { verifyStaffCredentials } from "@/lib/staff-accounts";
import { isStaffAuthEnabled, createStaffSessionToken, withStaffSessionCookie } from "@/lib/staff-session";
import { NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
  name: z.string().min(1).max(120),
  pin: z.string().min(4).max(6),
});

export async function POST(request: Request) {
  if (!isStaffAuthEnabled()) {
    return NextResponse.json(
      { error: "Staff login is not enabled" },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid login", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const account = await verifyStaffCredentials(parsed.data.name, parsed.data.pin);
    if (!account) {
      return NextResponse.json({ error: "Invalid name or PIN" }, { status: 401 });
    }

    const token = createStaffSessionToken({
      accountId: account.id,
      name: account.name,
      role: account.role,
    });

    return withStaffSessionCookie(
      NextResponse.json({
        ok: true,
        account: { id: account.id, name: account.name, role: account.role },
      }),
      token,
    );
  } catch (error) {
    console.error("[staff/auth/login]", error);
    return NextResponse.json({ error: "Unable to log in" }, { status: 500 });
  }
}
