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
 *
 * scoreCompatibility()        — returns number (backwards compat)
 * scoreCompatibilityDetailed() — returns score + reasons breakdown
 */

export interface ScoreReason {
  dimension: string;
  contribution: number;
  label: string;
}

export interface ScoreResult {
  score: number;
  reasons: ScoreReason[];
}

const jaccard = (setA: Set<string>, setB: Set<string>): number => {
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
};

function compute(a: any, b: any): ScoreResult {
  const tagsA = new Set<string>((a.vibe_tags ?? []).map((t: string) => t.toLowerCase()));
  const tagsB = new Set<string>((b.vibe_tags ?? []).map((t: string) => t.toLowerCase()));
  const vibeRaw = jaccard(tagsA, tagsB);
  const vibeContrib = vibeRaw * 0.4;

  const capsA = new Set<string>((a.capabilities ?? []).map((t: string) => t.toLowerCase()));
  const capsB = new Set<string>((b.capabilities ?? []).map((t: string) => t.toLowerCase()));
  const capRaw = jaccard(capsA, capsB);
  const capContrib = capRaw * 0.4;

  const hasStructured = tagsA.size > 0 || tagsB.size > 0 || capsA.size > 0 || capsB.size > 0;

  let textContrib = 0;
  let textRaw = 0;
  if (!hasStructured) {
    const textA = `${a.bio ?? ''} ${a.description ?? ''}`.toLowerCase();
    const textB = `${b.bio ?? ''} ${b.description ?? ''}`.toLowerCase();
    const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','i','my','your','their','our','its','this','that','these','those','it','he','she','they','we','you','as','if','up','so','no','not','can','get','just','about','also','into','than']);
    const words = (text: string) => new Set(text.split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w)));
    textRaw = jaccard(words(textA), words(textB));
    textContrib = Math.min(0.8, textRaw * 4 + 0.3); // matches old formula
  }

  const seekA = a.seeking ?? 'any';
  const seekB = b.seeking ?? 'any';
  const seekingMatch = seekA === 'any' || seekB === 'any' || seekA === seekB;
  const seekingContrib = seekingMatch ? 0.1 : 0;

  const nameHash = [...`${a.name}${b.name}`].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const chemistry = (nameHash % 10) / 100;

  let raw: number;
  if (hasStructured) {
    raw = vibeContrib + capContrib + seekingContrib + chemistry;
  } else {
    raw = textContrib + seekingContrib + chemistry;
  }
  const score = Math.min(1, Math.max(0.1, raw));

  // Build reasons array
  const reasons: ScoreReason[] = [];

  if (hasStructured) {
    // Vibe/style dimension
    if (tagsA.size > 0 && tagsB.size > 0) {
      const shared = [...tagsA].filter(t => tagsB.has(t));
      reasons.push({
        dimension: 'communication_style',
        contribution: parseFloat(vibeContrib.toFixed(3)),
        label: shared.length > 0
          ? `Shared style tags: ${shared.slice(0, 3).join(', ')}${shared.length > 3 ? ` +${shared.length - 3} more` : ''}`
          : 'No overlapping style tags',
      });
    } else {
      reasons.push({
        dimension: 'communication_style',
        contribution: 0,
        label: 'One or both agents have no style tags',
      });
    }

    // Capability dimension
    if (capsA.size > 0 && capsB.size > 0) {
      const shared = [...capsA].filter(c => capsB.has(c));
      reasons.push({
        dimension: 'capability_overlap',
        contribution: parseFloat(capContrib.toFixed(3)),
        label: shared.length > 0
          ? `Shared capabilities: ${shared.slice(0, 3).join(', ')}${shared.length > 3 ? ` +${shared.length - 3} more` : ''}`
          : 'No overlapping capabilities',
      });
    } else {
      reasons.push({
        dimension: 'capability_overlap',
        contribution: 0,
        label: 'One or both agents have no capabilities listed',
      });
    }
  } else {
    reasons.push({
      dimension: 'bio_similarity',
      contribution: parseFloat(textContrib.toFixed(3)),
      label: textRaw > 0
        ? 'Profiles share similar vocabulary and themes'
        : 'No structured tags — scored from bio text',
    });
  }

  // Seeking compatibility
  reasons.push({
    dimension: 'seeking_compatibility',
    contribution: parseFloat(seekingContrib.toFixed(3)),
    label: seekingMatch
      ? `Compatible seeking modes (${seekA} / ${seekB})`
      : `Seeking mismatch (${seekA} vs ${seekB})`,
  });

  // Chemistry
  reasons.push({
    dimension: 'chemistry',
    contribution: parseFloat(chemistry.toFixed(3)),
    label: 'Deterministic affinity factor',
  });

  return { score, reasons };
}

/** Returns just the score — backwards compatible */
export function scoreCompatibility(a: any, b: any): number {
  return compute(a, b).score;
}

/** Returns score + reasons breakdown */
export function scoreCompatibilityDetailed(a: any, b: any): ScoreResult {
  return compute(a, b);
}
