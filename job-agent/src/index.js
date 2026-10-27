// Daily job agent: fetch -> filter -> dedupe -> enrich -> score -> Google Sheet + CSV.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profile, settings } from '../config.js';
import { fetchJSearch } from './sources/jsearch.js';
import { fetchAdzuna } from './sources/adzuna.js';
import { dedupe, filterJobs, addContactAndCompanyInfo } from './enrich.js';
import { scoreJobs } from './score.js';
import { loadSeenIds, appendToSheet, writeCsv } from './output.js';

const OUTPUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'output');

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const dryRun = Boolean(process.env.DRY_RUN);

  const [jsearch, adzuna] = await Promise.all([fetchJSearch(profile, settings), fetchAdzuna(profile, settings)]);
  const fetched = [...jsearch, ...adzuna];
  console.log(`Fetched ${fetched.length} jobs (JSearch ${jsearch.length}, Adzuna ${adzuna.length})`);

  const seen = dryRun ? new Set() : await loadSeenIds(settings);
  const fresh = dedupe(filterJobs(fetched, profile), seen);
  console.log(`${fresh.length} new jobs after location/seniority filter and dedupe (${seen.size} already in sheet)`);

  const enriched = fresh.map(addContactAndCompanyInfo);
  const scored = (await scoreJobs(enriched, profile, settings))
    .filter((j) => j.fitScore >= settings.minScore)
    .map((j) => ({ ...j, foundOn: today }))
    .sort((a, b) => b.fitScore - a.fitScore);
  console.log(`${scored.length} jobs scored ${settings.minScore}+`);

  writeCsv(scored, OUTPUT_DIR, today);
  if (!dryRun) await appendToSheet(scored, settings);

  for (const j of scored.slice(0, 10)) {
    console.log(`  ${String(j.fitScore).padStart(3)}  ${j.title} — ${j.company} (${j.location}${j.remote ? ', remote' : ''})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
