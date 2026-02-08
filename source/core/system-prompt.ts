import { buildSkillsPrompt, detectSkills } from "$/skills";
import { getAgentProfile } from "$/core/config.ts";
import { PROFILES } from "$/profiles";
import { log } from "$/core/logger.ts";

export async function buildSystemPrompt(userText: string): Promise<string> {
  const profileName = (await getAgentProfile()) ?? "smith";
  const profile = PROFILES[profileName] ?? PROFILES["smith"];

  log.agent.inf(`Profile: ${profileName}`);

  const matchedSkills = detectSkills(userText);

  if (matchedSkills.length > 0) {
    log.agent.inf(`Skills: ${matchedSkills.map((s) => s.name).join(", ")}`);
  }

  return profile + buildSkillsPrompt(matchedSkills);
}
