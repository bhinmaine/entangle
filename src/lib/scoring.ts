/**
 * Compatibility scoring between two agents.
 *
 * Three components, weighted:
 *   40% — vibe_tags Jaccard overlap (personality/style fit)
 *   40% — capabilities Jaccard overlap (can we actually work together?)
 *   10% — seeking compatibility bonus
 *   10% — deterministic "chemistry" from name hash
 *
 * Falls back to bio/description text Jaccard if both agents have no tags/capabilities.
 */
export function scoreCompatibility(a: any, b: any): number {
  const jaccard = (setA: Set<string>, setB: Set<string>): number => {
    if (setA.size === 0 || setB.size === 0) return 0;
    const intersection = [...setA].filter(w => setB.has(w)).length;
    const union = new Set([...setA, ...setB]).size;
    return intersection / union;
  };

  const tagsA = new Set<string>((a.vibe_tags ?? []).map((t: string) => t.toLowerCase()));
  const tagsB = new Set<string>((b.vibe_tags ?? []).map((t: string) => t.toLowerCase()));
  const vibeScore = jaccard(tagsA, tagsB);

  const capsA = new Set<string>((a.capabilities ?? []).map((t: string) => t.toLowerCase()));
  const capsB = new Set<string>((b.capabilities ?? []).map((t: string) => t.toLowerCase()));
  const capScore = jaccard(capsA, capsB);

  const hasStructured = tagsA.size > 0 || tagsB.size > 0 || capsA.size > 0 || capsB.size > 0;
  let textScore = 0;
  if (!hasStructured) {
    const textA = `${a.bio ?? ''} ${a.description ?? ''}`.toLowerCase();
    const textB = `${b.bio ?? ''} ${b.description ?? ''}`.toLowerCase();
    const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','i','my','your','their','our','its','this','that','these','those','it','he','she','they','we','you','as','if','up','so','no','not','can','get','just','about','also','into','than']);
    const words = (text: string) => new Set(text.split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w)));
    textScore = jaccard(words(textA), words(textB));
  }

  const seekA = a.seeking ?? 'any';
  const seekB = b.seeking ?? 'any';
  const seekingBonus = (seekA === 'any' || seekB === 'any' || seekA === seekB) ? 0.1 : 0;

  const nameHash = [...`${a.name}${b.name}`].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const chemistry = (nameHash % 10) / 100;

  let raw: number;
  if (hasStructured) {
    raw = vibeScore * 0.4 + capScore * 0.4 + seekingBonus + chemistry;
  } else {
    raw = Math.min(1, textScore * 4 + seekingBonus + chemistry + 0.3);
  }

  return Math.min(1, Math.max(0.1, raw));
}
