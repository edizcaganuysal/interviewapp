import { cookies } from "next/headers";
import crypto from "crypto";
import { serverEnv } from "@/core/config/env.server";

const COOKIE_NAME = "admin_session";

function base64url(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(payload: string, secret: string) {
  const sig = crypto.createHmac("sha256", secret).update(payload).digest();
  return base64url(sig);
}

export function setAdminCookie() {
  const env = serverEnv();
  const now = Date.now();
  const exp = now + 7 * 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({ admin: true, exp });
  const token = `${base64url(payload)}.${sign(payload, env.COOKIE_SECRET)}`;

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearAdminCookie() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function isAdminCookieValid() {
  const env = serverEnv();
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const payloadB64 = parts[0];
  const sig = parts[1];

  const payloadJson = Buffer.from(
    payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString("utf8");

  const expected = sign(payloadJson, env.COOKIE_SECRET);
  if (sig !== expected) return false;

  try {
    const parsed = JSON.parse(payloadJson) as { admin: boolean; exp: number };
    if (!parsed.admin) return false;
    if (typeof parsed.exp !== "number") return false;
    if (Date.now() > parsed.exp) return false;
    return true;
  } catch {
    return false;
  }
}
