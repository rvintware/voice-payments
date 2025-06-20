import { z } from 'zod';

export const ChatResponse = z.object({
  speak: z
    .string()
    .min(1)
    .max(200)
    .refine((s) => !/[<>]/.test(s), 'No HTML/SSML tags'),
  ui: z.enum(['none', 'confirm', 'link', 'error']).default('none'),
  link: z.string().url().optional(),
});

export function parseChatResponse(json) {
  return ChatResponse.parse(json);
} 