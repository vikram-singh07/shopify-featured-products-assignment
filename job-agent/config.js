// Your job-search profile. Edit this file to change what the agent looks for.

export const profile = {
  experience: '1-3 years',

  // Skills used to score each job (keyword scoring, and context for Claude).
  skills: [
    'Shopify', 'Liquid', 'Shopify theme', 'Dawn', 'Shopify app', 'storefront', 'e-commerce', 'ecommerce',
    'JavaScript', 'JS', 'TypeScript', 'React', 'Next.js', 'Redux', 'Vue', 'Angular',
    'HTML', 'CSS', 'SCSS', 'Tailwind', 'Bootstrap', 'responsive design', 'UI', 'front end', 'frontend',
    'Node.js', 'REST API', 'GraphQL', 'AJAX', 'Git', 'full stack', 'fullstack', 'web application',
  ],

  // Words that make a title a web/front-end role (adds to the score).
  titleKeywords: ['web', 'frontend', 'front end', 'front-end', 'react', 'shopify', 'javascript', 'full stack', 'fullstack', 'ui'],

  // Short summary Claude reads when scoring jobs and writing cover notes.
  summary:
    'Web developer with 1-3 years of experience building Shopify themes (Liquid, Dawn, ' +
    'AJAX collection rendering, infinite scroll), React front ends and responsive ' +
    'HTML/CSS/JavaScript sites. Looking for junior / mid-level developer roles.',

  // Job titles to search for.
  roles: [
    'Shopify developer',
    'React developer',
    'Web developer',
    'Frontend developer',
    'Junior developer',
  ],

  // Cities searched for onsite / hybrid roles, plus remote roles inside India.
  cities: ['Mumbai', 'Jaipur'],
  includeRemoteIndia: true,

  // A job title must match this, so non-developer roles are dropped.
  titleMustMatch: /developer|engineer|programmer/i,

  // Titles containing these words are dropped (too senior for 1-3 years).
  excludeTitleWords: ['senior', 'sr.', 'sr ', 'lead', 'principal', 'architect', 'manager', 'head of', 'director', 'staff'],
};

export const settings = {
  // JSearch free tier = 200 requests/month, so ~6 per daily run is safe.
  jsearchMaxRequests: Number(process.env.JSEARCH_MAX_REQUESTS || 6),
  // JSearch: 'today' | '3days' | 'week'. Adzuna: max age in days.
  jsearchDatePosted: process.env.JSEARCH_DATE_POSTED || 'today',
  adzunaMaxDaysOld: Number(process.env.ADZUNA_MAX_DAYS_OLD || 1),

  // Jobs below this score are not written to the sheet.
  minScore: Number(process.env.MIN_SCORE || 25),

  claudeModel: process.env.CLAUDE_MODEL || 'claude-opus-5-5',
  sheetTab: process.env.GOOGLE_SHEET_TAB || 'Jobs',
};
