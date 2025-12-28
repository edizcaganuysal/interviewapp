import { serverEnv } from "@/core/config/env.server";
import { setAdminCookie, clearAdminCookie } from "@/core/auth/admin-cookie";

/*
Purpose:
- Authenticate fixed admin credentials.
- Issue or clear admin session cookie.
*/
export async function loginAdmin(username: string, password: string) {
  const env = serverEnv();

  if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
    throw new Error("INVALID_ADMIN_CREDENTIALS");
  }

  await setAdminCookie();
}

export async function logoutAdmin() {
  await clearAdminCookie();
}
