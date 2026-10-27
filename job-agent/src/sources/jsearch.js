// JSearch (RapidAPI) — aggregates Google for Jobs: LinkedIn, Naukri, Indeed, Glassdoor, company sites.
// Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch

const HOST = 'jsearch.p.rapidapi.com';

export function buildJSearchQueries(profile, maxRequests) {
  const queries = [];
  for (const city of profile.cities) {
    for (const role of profile.roles) queries.push({ query: `${role} in ${city}, India`, remote: false });
  }
  if (profile.includeRemoteIndia) {
    for (const role of profile.roles) queries.push({ query: `${role} remote India`, remote: true });
  }
  // Rotate by day so every role/city combination gets covered within a few days
  // without blowing through the free monthly quota.
  const day = Math.floor(Date.now() / 86_400_000);
  const start = (day * maxRequests) % queries.length;
  return Array.from({ length: Math.min(maxRequests, queries.length) }, (_, i) => queries[(start + i) % queries.length]);
}

export async function fetchJSearch(profile, settings) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    console.log('[jsearch] RAPIDAPI_KEY not set, skipping');
    return [];
  }

  const jobs = [];
  for (const { query, remote } of buildJSearchQueries(profile, settings.jsearchMaxRequests)) {
    const url = new URL(`https://${HOST}/search-v2`);
    url.searchParams.set('query', query);
    url.searchParams.set('page', '1');
    url.searchParams.set('num_pages', '1');
    url.searchParams.set('country', 'in');
    url.searchParams.set('date_posted', settings.jsearchDatePosted);
    if (remote) url.searchParams.set('work_from_home', 'true');

    const res = await fetch(url, { headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': HOST } });
    if (!res.ok) {
      console.warn(`[jsearch] "${query}" failed: ${res.status} ${await res.text()}`);
      continue;
    }
    const body = await res.json();
    const data = body.data ?? [];
    console.log(`[jsearch] "${query}" -> ${data.length} jobs`);
    for (const j of data) jobs.push(normalize(j));
  }
  return jobs;
}

function normalize(j) {
  const salary =
    j.job_min_salary || j.job_max_salary
      ? `${j.job_min_salary ?? '?'} - ${j.job_max_salary ?? '?'} ${j.job_salary_currency ?? ''} / ${j.job_salary_period ?? ''}`.trim()
      : '';
  return {
    id: `jsearch:${j.job_id}`,
    source: `JSearch (${j.job_publisher ?? 'unknown'})`,
    title: j.job_title ?? '',
    company: j.employer_name ?? '',
    companyWebsite: j.employer_website ?? '',
    companyType: j.employer_company_type ?? '',
    location: [j.job_city, j.job_state].filter(Boolean).join(', ') || j.job_country || '',
    remote: Boolean(j.job_is_remote),
    employmentType: j.job_employment_type ?? '',
    salary,
    postedAt: j.job_posted_at_datetime_utc ?? '',
    applyLink: j.job_apply_link ?? '',
    description: j.job_description ?? '',
  };
}
