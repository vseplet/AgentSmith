import { smithProfile } from "./smith.ts";
import { defaultProfile } from "./default.ts";

export const PROFILES: Record<string, string> = {
  smith: smithProfile,
  default: defaultProfile,
};

export function getProfileNames(): string[] {
  return Object.keys(PROFILES);
}
