import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profile } from '../config.js';
import { dedupe, filterJobs, addContactAndCompanyInfo } from '../src/enrich.js';
import { keywordScore } from '../src/score.js';
import { buildJSearchQueries } from '../src/sources/jsearch.js';

const job = (over = {}) => ({
  id: 'x:1', source: 'test', title: 'Shopify Developer', company: 'Acme', companyWebsite: '', companyType: '',
  location: 'Mumbai, Maharashtra', remote: false, employmentType: '', salary: '', postedAt: '', applyLink: '',
  description: 'We need Liquid, JavaScript and React skills. 1-3 years. Mail hr@acme.in or call +91 98765 43210.',
  ...over,
});

test('filterJobs keeps Mumbai/Jaipur and remote, drops other cities and senior titles', () => {
  const jobs = [
    job(),
    job({ id: 'x:2', location: 'Jaipur, Rajasthan' }),
    job({ id: 'x:3', location: 'Bengaluru' }),
    job({ id: 'x:4', location: 'Bengaluru', remote: true }),
    job({ id: 'x:5', title: 'Senior Shopify Developer' }),
  ];
  assert.deepEqual(filterJobs(jobs, profile).map((j) => j.id), ['x:1', 'x:2', 'x:4']);
});

test('dedupe drops repeats and jobs already in the sheet', () => {
  const jobs = [job(), job({ id: 'y:9' }), job({ id: 'x:2', company: 'Other' })];
  assert.equal(dedupe(jobs).length, 2);
  assert.equal(dedupe(jobs, new Set(['x:2'])).length, 1);
});

test('extracts contact email and phone', () => {
  const j = addContactAndCompanyInfo(job());
  assert.equal(j.contactEmails, 'hr@acme.in');
  assert.match(j.contactPhones, /98765/);
  assert.match(j.linkedinUrl, /Acme/);
});

test('keyword score favours matching junior roles over senior asks', () => {
  const good = keywordScore(job(), profile).fitScore;
  const bad = keywordScore(job({ title: 'Java Developer', description: 'Java, Spring. 7+ years required.' }), profile).fitScore;
  assert.ok(good >= 60, `good=${good}`);
  assert.ok(bad < 20, `bad=${bad}`);
});

test('JSearch queries respect the request budget', () => {
  const q = buildJSearchQueries(profile, 6);
  assert.equal(q.length, 6);
  assert.equal(new Set(q.map((x) => x.query)).size, 6);
});
