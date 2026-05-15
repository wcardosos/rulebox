import { confirm, isCancel } from '@clack/prompts';

export async function confirmPrompt(message: string): Promise<boolean> {
  const answer = await confirm({ message, initialValue: false });
  if (isCancel(answer)) return false;
  return answer;
}
