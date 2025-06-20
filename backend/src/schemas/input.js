import { z } from 'zod';

export const IncomingTranscript = z.object({
  sessionId: z.string().uuid().optional(),
  transcript: z
    .string()
    .trim()
    .max(300, 'Transcript too long')
    .refine((str) => /^[\p{L}\p{N}\p{P}\p{Z}]+$/u.test(str), 'Invalid characters'),
  language: z.string().default('en'),
  client: z.enum(['ios', 'android', 'web']).default('web'),
  receivedAt: z.string().datetime().optional(),
});

export function parseIncoming(body) {
  return IncomingTranscript.parse(body);
} 