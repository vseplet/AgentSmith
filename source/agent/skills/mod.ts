import type { Skill } from "#types";
import { telegramMessengerSkill } from "./telegram-messenger.ts";

export const skills: Skill[] = [
  telegramMessengerSkill,
];

export function detectSkills(text: string): Skill[] {
  const lowerText = text.toLowerCase();
  const matched: Skill[] = [];

  for (const skill of skills) {
    const hasMatch = skill.triggers.some((trigger) =>
      lowerText.includes(trigger.toLowerCase())
    );
    if (hasMatch) {
      matched.push(skill);
    }
  }

  return matched;
}

export function buildSkillsPrompt(matchedSkills: Skill[]): string {
  if (matchedSkills.length === 0) return "";

  const parts = matchedSkills.map((s) => s.instructions);
  return "\n\n" + parts.join("\n\n");
}
