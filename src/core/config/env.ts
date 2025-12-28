import { publicEnv } from "./env.public";
import { serverEnv } from "./env.server";

export function requireAllEnv() {
  return { ...publicEnv(), ...serverEnv() };
}
