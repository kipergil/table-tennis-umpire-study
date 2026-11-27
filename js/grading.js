// Pure answer-checking helpers, shared by study sessions and exams.

// Umpire's-decision cards ("call"): who wins the point, a let, or no action.
export const CALLS = {
  singles: [['A', 'Point to A'], ['X', 'Point to X'], ['let', 'Let'], ['none', 'No action']],
  doubles: [['AB', 'Point to A/B'], ['XY', 'Point to X/Y'], ['let', 'Let'], ['none', 'No action']]
};

/**
 * True/false and decision cards are stored compactly; on load they become ordinary option cards
 * (fixed option order) so every screen can show and check them. The stored answer is kept as `key`.
 */
export function expandCard(c) {
  if (c.format === 'tf') {
    return { ...c, key: c.answer, options: ['True', 'False'], answer: c.answer ? 0 : 1, shuffle: false };
  }
  if (c.format === 'call') {
    const opts = CALLS[c.match];
    return { ...c, key: c.answer, options: opts.map(([, label]) => label), answer: opts.findIndex(([k]) => k === c.answer), shuffle: false,
      matchLabel: c.match === 'doubles' ? 'Doubles: A/B v X/Y' : 'Singles: A v X' };
  }
  return c;
}

/** The correct answer as text. */
export function answerText(c) {
  if (c.format === 'flip') return c.a;
  if (c.format === 'number') return `${c.value} ${c.unit || ''}`.trim();
  if (c.format === 'multi') return c.answers.map((i) => c.options[i]).join('; ');
  return c.options[c.answer];
}

export function checkNumber(c, raw) {
  const v = parseFloat(String(raw ?? '').replace(',', '.').replace(/[^\d.\-]/g, ''));
  if (Number.isNaN(v)) return false;
  const accepted = [c.value, ...(c.accept || [])];
  return accepted.some((a) => Math.abs(v - a) <= (c.tolerance || 1e-9));
}

/**
 * Is a response correct?
 *  mcq / scenario: response is the chosen option index
 *  multi:          response is an array (or Set) of chosen option indices
 *  number:         response is the typed value (string or number)
 */
export function isCorrect(c, response) {
  if (response === null || response === undefined || response === '') return false;
  if (c.format === 'number') return checkNumber(c, response);
  if (c.format === 'multi') {
    const sel = new Set(response);
    return sel.size === c.answers.length && c.answers.every((i) => sel.has(i));
  }
  return response === c.answer;
}

/** A readable version of a learner's response, for exam reviews. */
export function responseText(c, response) {
  if (response === null || response === undefined || response === '' || (Array.isArray(response) && !response.length)) return 'No answer';
  if (c.format === 'number') return `${response} ${c.unit || ''}`.trim();
  if (c.format === 'multi') return [...response].sort((a, b) => a - b).map((i) => c.options[i]).join('; ');
  return c.options[response];
}
