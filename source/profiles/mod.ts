import { smithProfile } from "./smith.ts";
import { defaultProfile } from "./default.ts";
import { kateProfile } from "./kate.ts";

export const PROFILES: Record<string, string> = {
  smith: smithProfile,
  default: defaultProfile,
  kate: kateProfile,
};

export function getProfileNames(): string[] {
  return Object.keys(PROFILES);
}
