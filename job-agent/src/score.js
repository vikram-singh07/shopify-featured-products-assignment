// Scores each job 0-100 for fit. Uses Claude when ANTHROPIC_API_KEY is set,
// otherwise a free keyword-based score.

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

const BATCH_SIZE = 15;
// Descriptions are trimmed to keep the daily cost predictable; the first few
// thousand characters always contain the role, stack and requirements.
const MAX_DESCRIPTION_CHARS = 4000;
// Models that accept server-side refusal fallbacks.
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);

const ScoreSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      fit_score: z.number().describe('0-100, how well the job matches the candidate'),
      reason: z.string().describe('One sentence explaining the score'),
      cover_note: z.string().describe('2-3 sentence personalised note the candidate can paste into an application'),
    }),
  ),
});

export async function scoreJobs(jobs, profile, settings) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[score] ANTHROPIC_API_KEY not set, using keyword scoring');
    return jobs.map((job) => ({ ...job, ...keywordScore(job, profile), scoredBy: 'keywords' }));
  }

  const client = new Anthropic();
  const scored = [];
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    try {
      scored.push(...(await scoreBatchWithClaude(client, batch, profile, settings)));
    } catch (err) {
      console.warn(`[score] Claude scoring failed for batch ${i / BATCH_SIZE + 1}, using keywords: ${err.message}`);
      scored.push(...batch.map((job) => ({ ...job, ...keywordScore(job, profile), scoredBy: 'keywords' })));
    }
  }
  return scored;
}

async function scoreBatchWithClaude(client, batch, profile, settings) {
  const jobsText = batch
    .map(
      (job) =>
        `<job id="${job.id}">\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}${job.remote ? ' (remote)' : ''}\n` +
        `Type: ${job.employmentType}\nSalary: ${job.salary || 'not listed'}\n` +
        `Description:\n${job.description.slice(0, MAX_DESCRIPTION_CHARS)}\n</job>`,
    )
    .join('\n\n');

  const params = {
    model: settings.claudeModel,
    max_tokens: 16000,
    output_config: { effort: 'medium', format: betaZodOutputFormat(ScoreSchema) },
    system:
      'You screen job listings for a job seeker in India. Score each job 0-100 for fit: ' +
      'stack overlap with their skills, seniority match with their experience, and location ' +
      '(onsite/hybrid in their cities or remote within India). Penalise roles demanding far more ' +
      'experience than they have, and unrelated stacks. Write the cover note in first person, ' +
      'referencing concrete overlaps between their experience and the job. Return one result per job id.',
    messages: [
      {
        role: 'user',
        content:
          `Candidate experience: ${profile.experience}\nCandidate skills: ${profile.skills.join(', ')}\n` +
          `Candidate summary: ${profile.summary}\nPreferred locations: ${profile.cities.join(', ')}` +
          `${profile.includeRemoteIndia ? ', or remote within India' : ''}\n\n${jobsText}`,
      },
    ],
  };
  if (FALLBACK_MODELS.has(settings.claudeModel)) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }

  const response = await client.beta.messages.parse(params);
  if (response.stop_reason === 'refusal') throw new Error('request was declined');
  if (!response.parsed_output) throw new Error(`no parsed output (stop_reason: ${response.stop_reason})`);

  const byId = new Map(response.parsed_output.results.map((r) => [r.id, r]));
  return batch.map((job) => {
    const r = byId.get(job.id);
    if (!r) return { ...job, ...keywordScore(job, profile), scoredBy: 'keywords' };
    return {
      ...job,
      fitScore: Math.max(0, Math.min(100, Math.round(r.fit_score))),
      fitReason: r.reason,
      coverNote: r.cover_note,
      scoredBy: 'claude',
    };
  });
}

export function keywordScore(job, profile) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  const title = job.title.toLowerCase();
  const matched = profile.skills.filter((s) => text.includes(s.toLowerCase()));
  const roleHit = profile.roles.some((r) => title.includes(r.toLowerCase().replace(/ developer$/, '')));

  let score = Math.min(60, matched.length * 10);
  if (roleHit) score += 25;
  if (/\b(junior|fresher|associate|entry|trainee)\b/.test(title)) score += 10;
  const years = text.match(/(\d+)\s*\+?\s*(?:-\s*\d+\s*)?years?/);
  if (years && Number(years[1]) >= 5) score -= 30;

  score = Math.max(0, Math.min(100, score));
  return {
    fitScore: score,
    fitReason: matched.length ? `Matches: ${matched.join(', ')}` : 'No skill keywords found in the listing',
    coverNote: '',
  };
}
