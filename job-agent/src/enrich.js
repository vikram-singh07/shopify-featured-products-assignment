// Cleans up the raw job list: removes duplicates, filters by location / seniority,
// and pulls out any contact details printed in the job description.

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Indian mobile/landline numbers, with or without +91.
const PHONE_RE = /(?:\+91[\s-]?)?(?:[6-9]\d{4}[\s-]?\d{5}|0\d{2,4}[\s-]?\d{6,8})/g;

export function dedupe(jobs, seenIds = new Set()) {
  const out = [];
  const keys = new Set();
  for (const job of jobs) {
    const key = `${job.company}|${job.title}|${job.location}`.toLowerCase().replace(/\s+/g, ' ');
    if (seenIds.has(job.id) || seenIds.has(key) || keys.has(key)) continue;
    keys.add(key);
    out.push({ ...job, dedupeKey: key });
  }
  return out;
}

export function filterJobs(jobs, profile) {
  const cities = profile.cities.map((c) => c.toLowerCase());
  return jobs.filter((job) => {
    const title = job.title.toLowerCase();
    if (profile.excludeTitleWords.some((w) => title.includes(w))) return false;
    if (!profile.titleMustMatch.test(title)) return false;
    const loc = job.location.toLowerCase();
    const inCity = cities.some((c) => loc.includes(c));
    // A remote job only counts if it is open to India, not just "remote" from a US listing.
    const remoteIndia = profile.includeRemoteIndia && job.remote && /\bindia\b/i.test(`${loc} ${job.description}`);
    return inCity || remoteIndia;
  });
}

export function addContactAndCompanyInfo(job) {
  const emails = [...new Set(job.description.match(EMAIL_RE) ?? [])]
    .filter((e) => !/example\.|\.png$|\.jpg$/i.test(e));
  const phones = [...new Set((job.description.match(PHONE_RE) ?? []).map((p) => p.trim()))];
  const q = encodeURIComponent(job.company);
  return {
    ...job,
    contactEmails: emails.join(', '),
    contactPhones: phones.join(', '),
    linkedinUrl: job.company ? `https://www.linkedin.com/search/results/companies/?keywords=${q}` : '',
    hrSearchUrl: job.company
      ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${job.company} HR recruiter`)}`
      : '',
  };
}
