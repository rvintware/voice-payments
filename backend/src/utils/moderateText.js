import OpenAI from 'openai';

const openai = new OpenAI();
const DEFAULT_THRESHOLD = 0.4;

export async function moderateText(text, threshold = DEFAULT_THRESHOLD) {
  if (!text) return { ok: true };
  if (process.env.NODE_ENV === 'test') return { ok: true };
  const mod = await openai.moderations.create({ input: text });
  const res = mod.results[0];
  const { hate, harassment, self_harm: selfHarm, sexual, profanity } = res.category_scores;
  const blocked =
    hate > threshold ||
    harassment > threshold ||
    selfHarm > threshold ||
    sexual > threshold ||
    profanity > threshold;
  return { ok: !blocked, scores: res.category_scores };
} 