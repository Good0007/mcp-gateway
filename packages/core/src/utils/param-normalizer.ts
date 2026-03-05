/**
 * Parameter Normalizer
 *
 * Xiaozhi's LLM generates tool-call arguments using its own semantic
 * understanding.  The parameter names it produces may differ from the
 * exact names in the MCP tool schema (e.g. "text" vs "message").
 *
 * This module resolves the mismatch using a layered strategy:
 *   1. Exact match            – pass through unchanged
 *   2. Case-insensitive match – normalise casing
 *   3. Synonym lookup         – curated semantic equivalence table
 *   4. Single-required-value  – if schema has exactly one required string
 *                               param and caller supplies exactly one
 *                               unmatched string, map it directly
 *   5. Fuzzy match            – normalised Levenshtein distance ≤ 0.4
 *
 * Remapping is logged so mismatches can be spotted and the synonym table
 * refined over time.
 */

import type { ToolParameter } from '@mcp-gateway/shared';
import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// Synonym table  (schema-canonical name → possible Xiaozhi names)
// ---------------------------------------------------------------------------
const SYNONYMS: Record<string, string[]> = {
  message:    ['text', 'msg', 'content', 'body', 'input', 'query', 'prompt', 'request', 'data', 'payload'],
  query:      ['search', 'keyword', 'q', 'term', 'text', 'input', 'message', 'keywords'],
  entity_id:  ['device_id', 'id', 'device', 'entity', 'target', 'object_id'],
  command:    ['action', 'cmd', 'operation', 'op', 'method'],
  url:        ['link', 'uri', 'href', 'address', 'endpoint', 'path'],
  file_path:  ['path', 'file', 'filepath', 'filename', 'file_name'],
  pattern:    ['keyword', 'search', 'term', 'regex', 'glob', 'filter'],
  name:       ['label', 'title', 'key', 'identifier'],
  value:      ['val', 'data', 'content', 'setting'],
  limit:      ['count', 'max', 'num', 'number', 'n', 'size', 'top'],
  offset:     ['skip', 'start', 'from', 'page_offset'],
  timeout:    ['wait', 'max_wait', 'timeout_seconds', 'max_time'],
  language:   ['lang', 'locale', 'lng'],
  format:     ['type', 'output_format', 'response_format'],
  temperature:['temp', 'creativity', 'randomness'],
};

// Reverse index: xiaozhi alias → canonical name
const REVERSE_SYNONYMS: Map<string, string> = new Map();
for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
  for (const alias of aliases) {
    // Only register if there is no ambiguity (first writer wins)
    if (!REVERSE_SYNONYMS.has(alias)) {
      REVERSE_SYNONYMS.set(alias, canonical);
    }
  }
}

// ---------------------------------------------------------------------------
// Levenshtein distance (character edit distance)
// ---------------------------------------------------------------------------
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

/** Normalised distance in [0, 1].  0 = identical, 1 = completely different. */
function similarity(a: string, b: string): number {
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 0 : dist / maxLen;
}

// ---------------------------------------------------------------------------
// Core normalizer
// ---------------------------------------------------------------------------

export interface NormalizeResult {
  /** Final arguments to pass to the MCP tool */
  args: Record<string, unknown>;
  /** Map of  remappedSchemaKey → originalProvidedKey  for any renames performed */
  remapped: Record<string, string>;
  /** Arguments present in `provided` that had no matching schema key */
  unmatched: string[];
}

/**
 * Normalise `provided` arguments so their keys match the tool schema.
 *
 * @param toolName  - Tool name (for logging only)
 * @param provided  - Arguments received from Xiaozhi
 * @param schema    - Tool.parameters from the MCP tool definition
 */
export function normalizeArgs(
  toolName: string,
  provided: Record<string, unknown>,
  schema: Record<string, ToolParameter>,
): NormalizeResult {
  const schemaKeys = Object.keys(schema);
  const remapped: Record<string, string> = {};
  const result: Record<string, unknown> = {};

  // Track which provided keys have already been consumed
  const consumed = new Set<string>();

  // ── Pass 1: exact matches ─────────────────────────────────────────────────
  for (const sk of schemaKeys) {
    if (sk in provided) {
      result[sk] = provided[sk];
      consumed.add(sk);
    }
  }

  // Remaining schema keys that still need a value
  const remaining = schemaKeys.filter(sk => !(sk in result));
  // Remaining provided keys not yet consumed
  const leftover = () => Object.keys(provided).filter(pk => !consumed.has(pk));

  // ── Pass 2: case-insensitive match ────────────────────────────────────────
  for (const sk of [...remaining]) {
    if (sk in result) continue;
    const skLower = sk.toLowerCase();
    const match = leftover().find(pk => pk.toLowerCase() === skLower);
    if (match) {
      result[sk] = provided[match];
      consumed.add(match);
      remapped[sk] = match;
    }
  }

  // ── Pass 3: synonym lookup ────────────────────────────────────────────────
  for (const sk of schemaKeys) {
    if (sk in result) continue;
    const lo = leftover();

    // a) Is `sk` a known canonical name?  Check if any provided key is its alias.
    const canonicalAliases = SYNONYMS[sk] ?? [];
    const aliasMatch = lo.find(pk => canonicalAliases.includes(pk.toLowerCase()));
    if (aliasMatch) {
      result[sk] = provided[aliasMatch];
      consumed.add(aliasMatch);
      remapped[sk] = aliasMatch;
      continue;
    }

    // b) Is `sk` itself an alias of some other canonical? (probably not useful but keep)
    // c) Check if any provided key maps (via reverse table) to a schema key with same meaning
    for (const pk of lo) {
      const canonical = REVERSE_SYNONYMS.get(pk.toLowerCase());
      if (canonical === sk) {
        result[sk] = provided[pk];
        consumed.add(pk);
        remapped[sk] = pk;
        break;
      }
    }
  }

  // ── Pass 4: single-required-value shortcut ────────────────────────────────
  // If tool has exactly one required string and caller provides exactly one
  // unmatched string value — map it directly.
  const missingRequired = schemaKeys.filter(
    sk => !(sk in result) && schema[sk].required !== false,
  );
  const lo4 = leftover();
  if (missingRequired.length === 1 && lo4.length === 1) {
    const sk = missingRequired[0];
    const pk = lo4[0];
    const schemaType = schema[sk].type;
    const valueType = typeof provided[pk];
    if (
      schemaType === valueType ||
      (schemaType === 'string' && valueType === 'string')
    ) {
      result[sk] = provided[pk];
      consumed.add(pk);
      remapped[sk] = pk;
    }
  }

  // ── Pass 5: fuzzy match (Levenshtein ≤ 0.4) ──────────────────────────────
  for (const sk of schemaKeys) {
    if (sk in result) continue;
    const lo5 = leftover();
    let best: { key: string; score: number } | null = null;

    for (const pk of lo5) {
      const score = similarity(sk, pk);
      if (score <= 0.4 && (!best || score < best.score)) {
        best = { key: pk, score };
      }
    }

    if (best) {
      result[sk] = provided[best.key];
      consumed.add(best.key);
      remapped[sk] = best.key;
    }
  }

  // ── Collect truly unmatched provided keys ────────────────────────────────
  const unmatched = Object.keys(provided).filter(pk => !consumed.has(pk));

  // ── Keep unmatched pairs that have no schema conflict (passthrough) ───────
  // This preserves any *extra* args the caller sends that happen to have
  // no schema key to map to — better to let the downstream tool decide.
  for (const pk of unmatched) {
    if (!(pk in result)) {
      result[pk] = provided[pk];
    }
  }

  if (Object.keys(remapped).length > 0) {
    logger.info('Parameter normalizer remapped arguments', {
      tool: toolName,
      remapped,
      providedKeys: Object.keys(provided),
      resultKeys: Object.keys(result),
    });
  }

  return { args: result, remapped, unmatched };
}
