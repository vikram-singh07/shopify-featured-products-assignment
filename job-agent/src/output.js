// Writes results to Google Sheets (deduplicated across days) and to a local CSV backup.

import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';

export const COLUMNS = [
  ['Job ID', (j) => j.id],
  ['Date found', (j) => j.foundOn],
  ['Fit score', (j) => j.fitScore],
  ['Job title', (j) => j.title],
  ['Company', (j) => j.company],
  ['Location', (j) => j.location],
  ['Remote', (j) => (j.remote ? 'Yes' : 'No')],
  ['Employment type', (j) => j.employmentType],
  ['Salary', (j) => j.salary],
  ['Posted at', (j) => j.postedAt],
  ['Apply link', (j) => j.applyLink],
  ['Company website', (j) => j.companyWebsite],
  ['Company type / industry', (j) => j.companyType],
  ['Company LinkedIn', (j) => j.linkedinUrl],
  ['Find HR on LinkedIn', (j) => j.hrSearchUrl],
  ['Contact email', (j) => j.contactEmails],
  ['Contact phone', (j) => j.contactPhones],
  ['Why it fits', (j) => j.fitReason],
  ['Cover note', (j) => j.coverNote],
  ['Scored by', (j) => j.scoredBy],
  ['Source', (j) => j.source],
  ['Dedupe key', (j) => j.dedupeKey],
  ['Status', () => 'New'],
];

const HEADER = COLUMNS.map(([name]) => name);
const toRow = (job) => COLUMNS.map(([, get]) => get(job) ?? '');

function sheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw || !process.env.GOOGLE_SHEET_ID) return null;
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  return google.sheets({ version: 'v4', auth });
}

// Returns job IDs and dedupe keys already in the sheet so the same job isn't added twice.
export async function loadSeenIds(settings) {
  const sheets = sheetsClient();
  if (!sheets) return new Set();
  await ensureTab(sheets, settings.sheetTab);
  const idCol = 'A';
  const keyCol = String.fromCharCode(65 + HEADER.indexOf('Dedupe key'));
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    ranges: [`${settings.sheetTab}!${idCol}2:${idCol}`, `${settings.sheetTab}!${keyCol}2:${keyCol}`],
  });
  const seen = new Set();
  for (const range of res.data.valueRanges ?? []) for (const [v] of range.values ?? []) if (v) seen.add(v);
  return seen;
}

async function ensureTab(sheets, tab) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  if (!meta.data.sheets.some((s) => s.properties.title === tab)) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] } });
  }
  const head = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A1:A1` });
  if (!head.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER] },
    });
  }
}

export async function appendToSheet(jobs, settings) {
  const sheets = sheetsClient();
  if (!sheets) {
    console.log('[sheets] GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_SHEET_ID not set, skipping Google Sheet');
    return false;
  }
  if (!jobs.length) return true;
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${settings.sheetTab}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: jobs.map(toRow) },
  });
  console.log(`[sheets] appended ${jobs.length} rows to "${settings.sheetTab}"`);
  return true;
}

export function writeCsv(jobs, dir, date) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `jobs-${date}.csv`);
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [HEADER, ...jobs.map(toRow)].map((row) => row.map(esc).join(','));
  fs.writeFileSync(file, lines.join('\n') + '\n');
  console.log(`[csv] wrote ${jobs.length} rows to ${file}`);
  return file;
}
