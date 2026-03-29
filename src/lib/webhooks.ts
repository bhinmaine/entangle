import { createHmac, randomBytes } from 'crypto';
import getDb from './db';

export type WebhookEvent =
  | 'match.request'
  | 'match.accept'
  | 'match.decline'
  | 'match.disconnect'
  | 'message.new';

export async function fireWebhooks(
  agentId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const hooks = await getDb()`
    SELECT * FROM webhooks
    WHERE agent_id = ${agentId}
      AND ${event} = ANY(events)
  `;
  if (!hooks.length) return;

  const body = JSON.stringify({ event, data: payload, ts: Date.now() });

  await Promise.allSettled(
    hooks.map(async (hook: any) => {
      const sig = createHmac('sha256', hook.secret).update(body).digest('hex');
      try {
        await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Entangle-Event': event,
            'X-Entangle-Signature': `sha256=${sig}`,
          },
          body,
          signal: AbortSignal.timeout(5000),
        });
        await getDb()`UPDATE webhooks SET last_fired_at = NOW() WHERE id = ${hook.id}`;
      } catch {
        // Fire and forget — failed deliveries are not retried (for now)
      }
    })
  );
}
