import { z } from 'zod';

export const ChatResponse = z.object({
  speak: z
    .string()
    .min(1)
    .max(400)
    .refine((s) => !/[<>]/.test(s), 'No HTML/SSML tags'),
  ui: z.enum(['none', 'confirm', 'link', 'links', 'error']).default('none'),
  link: z.string().url().optional(),
  links: z.array(z.object({
    url: z.string().url(),
    name: z.string().min(1),
    amount_cents: z.number().positive(),
    currency: z.string().min(3).max(3).default('usd'),
  })).optional(),
});

export function parseChatResponse(json) {
  return ChatResponse.parse(json);
} 