// Utility functions for parsing transcripts and extracting dollar amounts

// Convert basic English number words up to 999 to integer
export function wordsToNumber(str) {
  const units = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19,
  };
  const tens = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  };
  const tokens = str.toLowerCase().replace(/[^a-z\s-]/g, '').split(/\s+/);
  let total = 0;
  let current = 0;
  tokens.forEach(tok => {
    if (units[tok] !== undefined) {
      current += units[tok];
    } else if (tens[tok] !== undefined) {
      current += tens[tok];
    } else if (tok === 'hundred') {
      current *= 100;
    }
  });
  total += current;
  return total || null;
}

// Extract the first monetary amount in cents from a transcript string
export function extractAmountCents(transcript) {
  const numMatch = transcript.match(/\d+(?:\.\d{1,2})?/);
  if (numMatch) {
    const dollars = parseFloat(numMatch[0]);
    return Math.round(dollars * 100);
  }
  const wordAmount = wordsToNumber(transcript);
  if (wordAmount) return wordAmount * 100;
  return null;
}

export function extractName(transcript) {
  // 1) Try to capture the first word after "to" (e.g. "Send 25 dollars to Rehan").
  const m1 = transcript.match(/\bto\s+([a-z]+)/i);
  if (m1) return m1[1].toLowerCase();

  // 2) Fallback: use the last standalone word in the sentence
  //    Works for utterances like "Send twenty dollars Rehan" (missing "to").
  const m2 = transcript.trim().match(/([a-z]+)[.!?]?$/i);
  if (m2) return m2[1].toLowerCase();
  return null;
}

export function parseYesNo(transcript) {
  const text = transcript.trim().toLowerCase();
  if (/\b(yes|yeah|yep|sure|affirmative)\b/.test(text)) return 'yes';
  if (/\b(no|nope|nah|negative)\b/.test(text))   return 'no';
  return null;
} 