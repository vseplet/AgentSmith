import { buildSkillsPrompt, detectSkills } from "$/skills";
import { cfg } from "$/core/config.ts";
import { PROFILES } from "$/profiles";
import { log } from "$/core/logger.ts";

export async function buildSystemPrompt(userText: string): Promise<string> {
  const profileName = cfg("agent.profile") ?? "smith";
  const profile = PROFILES[profileName] ?? PROFILES["smith"];

  log.agent.inf(`Profile: ${profileName}`);

  const matchedSkills = detectSkills(userText);

  if (matchedSkills.length > 0) {
    log.agent.inf(`Skills: ${matchedSkills.map((s) => s.name).join(", ")}`);
  }

  return profile + buildSkillsPrompt(matchedSkills);
}
