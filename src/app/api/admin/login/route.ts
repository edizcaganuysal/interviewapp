import { NextResponse } from "next/server";
import { loginAdmin } from "@/features/admin/admin-auth.service";

/*
Purpose:
- Admin login endpoint.
- Sets HttpOnly admin cookie on success.
*/
export async function POST(req: Request) {
  const body = await req.json();
  const { username, password } = body;

  try {
    await loginAdmin(username, password);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
