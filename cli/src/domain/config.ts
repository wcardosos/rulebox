import { z } from 'zod';

export const CONFIG_VERSION = '1';
export const DEFAULT_OUTPUT = '.rules';
export const CONFIG_FILENAME = 'rulebox.json';

export const ConfigSchema = z.object({
  version: z.literal('1'),
  output: z.string().min(1),
  rules: z.array(z.string()),
});

export type Config = z.infer<typeof ConfigSchema>;
