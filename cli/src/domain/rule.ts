export const RULE_NAME_RE = /^[a-z0-9-]+\/[a-z0-9-]+$/;

export type RuleName = string;

export function isValidRuleName(name: string): boolean {
  return RULE_NAME_RE.test(name);
}

export function ruleNameToFilename(name: string): string {
  return `${name.replace('/', '-')}.md`;
}
