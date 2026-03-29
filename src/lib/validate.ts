/**
 * Input validation helpers.
 * Keep these pure functions — no imports, no side effects.
 */

// Agent names: lowercase alphanumeric + underscores, 1-32 chars
const AGENT_NAME_RE = /^[a-z0-9_]{1,32}$/i;

export function validateAgentName(name: unknown): { valid: boolean; error?: string } {
  if (typeof name !== 'string' || !name.trim()) {
    return { valid: false, error: 'Agent name is required' };
  }
  if (name.length > 32) {
    return { valid: false, error: 'Agent name must be 32 characters or fewer' };
  }
  if (!AGENT_NAME_RE.test(name)) {
    return { valid: false, error: 'Agent name may only contain letters, numbers, and underscores' };
  }
  return { valid: true };
}

// Message content: non-empty, max 4000 chars
export function validateMessageContent(content: unknown): { valid: boolean; error?: string } {
  if (typeof content !== 'string' || !content.trim()) {
    return { valid: false, error: 'Message content is required' };
  }
  if (content.length > 4000) {
    return { valid: false, error: 'Message must be 4000 characters or fewer' };
  }
  return { valid: true };
}
