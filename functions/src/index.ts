import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { PlanOutputSchema, PlanRequestSchema, SYSTEM_PROMPT, buildUserMessage, sanitizePlan } from './planner.js';

initializeApp();

/** Set once with: firebase functions:secrets:set ANTHROPIC_API_KEY */
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const MODEL = 'claude-opus-5-5';
/** Each plan costs a few cents; this keeps one account from running up the bill. */
const DAILY_PLAN_LIMIT = 10;

/** Counts today's plans for the user and refuses past the daily limit. */
async function useDailyQuota(uid: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const ref = getFirestore().doc(`users/${uid}/usage/planner`);
  await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.get('date') === today ? Number(snap.get('count') ?? 0) : 0;
    if (count >= DAILY_PLAN_LIMIT) {
      throw new HttpsError('resource-exhausted', 'daily-limit');
    }
    tx.set(ref, { date: today, count: count + 1, updatedAt: FieldValue.serverTimestamp() });
  });
}

/**
 * Turns the user's goal into scheduled tasks for the coming days.
 * Called from the app with Firebase's callable protocol, so only signed-in users get in.
 */
export const generateWeeklyPlan = onCall(
  { secrets: [ANTHROPIC_API_KEY], region: 'europe-west1', timeoutSeconds: 300, memory: '512MiB', maxInstances: 5 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'sign-in-required');
    }

    const parsed = PlanRequestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', 'bad-request');
    }
    const req = parsed.data;

    await useDailyQuota(uid);

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    try {
      const response = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        // If Claude declines for safety reasons, the API retries on a fallback model automatically.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: betaZodOutputFormat(PlanOutputSchema) },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessage(req) }]
      });

      if (response.stop_reason === 'refusal' || !response.parsed_output) {
        logger.warn('Planner got no usable plan', { uid, stopReason: response.stop_reason });
        throw new HttpsError('failed-precondition', 'no-plan');
      }

      const plan = sanitizePlan(response.parsed_output, req);
      logger.info('Planner plan generated', {
        uid,
        tasks: plan.tasks.length,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      });
      return plan;
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      if (err instanceof Anthropic.RateLimitError) {
        throw new HttpsError('resource-exhausted', 'ai-busy');
      }
      if (err instanceof Anthropic.AuthenticationError) {
        logger.error('Anthropic API key is missing or invalid');
        throw new HttpsError('internal', 'ai-not-configured');
      }
      if (err instanceof Anthropic.APIError) {
        logger.error('Anthropic API error', { status: err.status, message: err.message });
        throw new HttpsError('unavailable', 'ai-unavailable');
      }
      logger.error('Planner failed', err);
      throw new HttpsError('internal', 'planner-failed');
    }
  }
);
