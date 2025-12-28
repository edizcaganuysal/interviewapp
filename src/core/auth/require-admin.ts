import { redirect } from "next/navigation";
import { isAdminCookieValid } from "./admin-cookie";

export async function requireAdmin() {
  if (!isAdminCookieValid()) {
    redirect("/admin/login");
  }
}
