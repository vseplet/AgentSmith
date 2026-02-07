import { buildSkillsPrompt, detectSkills } from "#skills";
import { getAgentProfile } from "#config";
import { smithProfile } from "./profiles/smith.ts";
import { defaultProfile } from "./profiles/default.ts";

const PROFILES: Record<string, string> = {
  smith: smithProfile,
  default: defaultProfile,
};

export async function buildSystemPrompt(userText: string): Promise<string> {
  const profileName = (await getAgentProfile()) ?? "smith";
  const profile = PROFILES[profileName] ?? PROFILES["smith"];

  console.log(`[Agent] Profile: ${profileName}`);

  const matchedSkills = detectSkills(userText);

  if (matchedSkills.length > 0) {
    console.log(
      `[Agent] Skills: ${matchedSkills.map((s) => s.name).join(", ")}`,
    );
  }

  return profile + buildSkillsPrompt(matchedSkills);
}
