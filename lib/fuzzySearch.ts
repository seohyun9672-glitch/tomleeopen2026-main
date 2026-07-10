function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const next =
        a[i - 1] === b[j - 1]
          ? row[j - 1]
          : 1 + Math.min(prev, row[j], row[j - 1]);
      row[j - 1] = prev;
      prev = next;
    }
    row[n] = prev;
  }
  return row[n];
}

/**
 * Returns a relevance score [0–100] for query against candidate text.
 * Checks each whitespace-delimited word as well as the concatenated form.
 * A score of 0 means no match.
 */
export function fuzzyScore(query: string, candidate: string): number {
  if (!query) return 1;
  const q = query.toLowerCase().replace(/\s+/g, "");
  const words = candidate.toLowerCase().split(/\s+/);
  const full = words.join("");

  let best = 0;

  for (const w of [full, ...words]) {
    if (w === q) { best = Math.max(best, 100); continue; }
    if (w.startsWith(q)) { best = Math.max(best, 90); continue; }
    if (w.includes(q)) { best = Math.max(best, 80); continue; }

    // Edit-distance check against a prefix window of the word to handle
    // deletions/insertions/substitutions (e.g. "youchan" → "yuchan")
    const window = w.slice(0, q.length + 2);
    const dist = levenshtein(q, window);
    const threshold = Math.max(1, Math.floor(q.length / 4));
    if (dist <= threshold) best = Math.max(best, 60);
  }

  return best;
}
