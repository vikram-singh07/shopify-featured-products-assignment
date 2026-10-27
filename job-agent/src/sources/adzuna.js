// Adzuna — job search API with good India coverage.
// Docs: https://developer.adzuna.com/docs/search

export async function fetchAdzuna(profile, settings) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.log('[adzuna] ADZUNA_APP_ID / ADZUNA_APP_KEY not set, skipping');
    return [];
  }

  const searches = [];
  for (const city of profile.cities) {
    for (const role of profile.roles) searches.push({ what: role, where: city });
  }
  if (profile.includeRemoteIndia) {
    for (const role of profile.roles) searches.push({ what: `${role} remote`, where: '' });
  }

  const jobs = [];
  for (const { what, where } of searches) {
    const url = new URL('https://api.adzuna.com/v1/api/jobs/in/search/1');
    url.searchParams.set('app_id', appId);
    url.searchParams.set('app_key', appKey);
    url.searchParams.set('what', what);
    if (where) url.searchParams.set('where', where);
    url.searchParams.set('max_days_old', String(settings.adzunaMaxDaysOld));
    url.searchParams.set('results_per_page', '50');
    url.searchParams.set('sort_by', 'date');

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.warn(`[adzuna] "${what}" in "${where || 'India'}" failed: ${res.status}`);
      continue;
    }
    const body = await res.json();
    const results = body.results ?? [];
    console.log(`[adzuna] "${what}" in "${where || 'India'}" -> ${results.length} jobs`);
    for (const j of results) jobs.push(normalize(j));
  }
  return jobs;
}

function normalize(j) {
  const salary = j.salary_min || j.salary_max ? `${j.salary_min ?? '?'} - ${j.salary_max ?? '?'} INR / year` : '';
  const location = j.location?.display_name ?? '';
  return {
    id: `adzuna:${j.id}`,
    source: 'Adzuna',
    title: stripTags(j.title ?? ''),
    company: j.company?.display_name ?? '',
    companyWebsite: '',
    companyType: j.category?.label ?? '',
    location,
    remote: /remote|work from home|wfh/i.test(`${j.title} ${j.description}`),
    employmentType: [j.contract_time, j.contract_type].filter(Boolean).join(', '),
    salary,
    postedAt: j.created ?? '',
    applyLink: j.redirect_url ?? '',
    // Adzuna only returns a snippet of the description; the full text is on the apply link.
    description: stripTags(j.description ?? ''),
  };
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '');
}
