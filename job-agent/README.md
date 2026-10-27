# Daily Job Agent

Every morning at **8:47 AM IST** this agent:

1. Searches **JSearch** (Google for Jobs: LinkedIn, Naukri, Indeed, Glassdoor, company career pages) and **Adzuna** for Shopify, React, web, frontend and junior developer jobs.
2. Keeps only roles in **Mumbai or Jaipur**, or **remote within India**, and drops senior/lead titles.
3. Removes duplicates, including jobs already in your sheet from earlier days.
4. Adds company details and any HR email or phone number printed in the listing.
5. Scores each job 0–100 for fit. If you add an Anthropic key, Claude also writes a short cover note. Without one, the agent uses free keyword scoring.
6. Appends the new jobs, best matches first, to your **Google Sheet**. A CSV backup is kept in the GitHub Actions run.

## Columns in the sheet

Job ID · Date found · **Fit score** · Job title · Company · Location · Remote · Employment type · Salary · Posted at · **Apply link** · Company website · Company type / industry · Company LinkedIn · Find HR on LinkedIn · **Contact email** · **Contact phone** · Why it fits · **Cover note** · Scored by · Source · Dedupe key · Status

The **Status** column starts as `New`. Change it yourself to `Applied`, `Interview`, `Rejected` and so on to track your applications.

> Contact email and phone are filled in only when the company printed them in the listing. Many listings don't include them, so use the **Find HR on LinkedIn** link to look for a recruiter.

---

## One-time setup (about 20 minutes)

### 1. JSearch API key (required)
1. Sign up at <https://rapidapi.com> and open the **JSearch** API.
2. Subscribe to the **Basic (free)** plan, which gives 200 requests a month.
3. Copy your `X-RapidAPI-Key`.

The agent uses 6 requests a day (about 180 a month) and rotates through your role and city combinations, so all of them get covered every few days.

### 2. Adzuna API key (required)
1. Register at <https://developer.adzuna.com/signup>.
2. Copy your **Application ID** and **Application Key**.

### 3. Google Sheet + service account
1. Create a new Google Sheet. Copy its ID from the URL: `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`.
2. Go to <https://console.cloud.google.com>, create a project, and **enable the Google Sheets API** (APIs & Services → Library → "Google Sheets API" → Enable).
3. Go to APIs & Services → Credentials → **Create credentials → Service account**. Give it any name and click Done.
4. Open the service account, go to the **Keys** tab, and choose **Add key → JSON**. A `.json` file downloads.
5. Open the JSON file and copy the `client_email` value, for example `job-agent@your-project.iam.gserviceaccount.com`.
6. In your Google Sheet, click **Share**, paste that email, and give it **Editor** access.

### 4. Anthropic API key (optional, for AI scores and cover notes)
Create a key at <https://console.anthropic.com>. If you skip this step, the agent still runs and uses keyword scoring.

### 5. Add the secrets to GitHub
In this repo, go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Value |
|---|---|
| `RAPIDAPI_KEY` | JSearch key from step 1 |
| `ADZUNA_APP_ID` | Adzuna Application ID |
| `ADZUNA_APP_KEY` | Adzuna Application Key |
| `GOOGLE_SHEET_ID` | Sheet ID from step 3.1 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The **entire contents** of the downloaded JSON file |
| `ANTHROPIC_API_KEY` | *(optional)* Anthropic key |

Optional **Variables** (same page, Variables tab):

| Variable | Default | Meaning |
|---|---|---|
| `MIN_SCORE` | `40` | Jobs scoring below this aren't added |
| `CLAUDE_MODEL` | `claude-opus-5-5` | Set to `claude-haiku-5-5` for a much cheaper run (see cost below) |

### 6. Test it
Go to **Actions → Daily job listings → Run workflow**. In about a minute, rows should appear in your sheet. After that, it runs every day automatically.

> GitHub only runs scheduled workflows from the **default branch** (`main`), so this branch must be merged before the daily schedule starts.

---

## Customise

Edit [`config.js`](config.js) to change your skills, summary, job titles, cities, or the words that mark a title as too senior. Commit the change and it applies from the next run.

## Run locally

```bash
cd job-agent
npm install
export RAPIDAPI_KEY=... ADZUNA_APP_ID=... ADZUNA_APP_KEY=...   # plus the optional ones
npm run dry-run   # writes output/jobs-YYYY-MM-DD.csv, doesn't touch the sheet
npm start         # full run, appends to the Google Sheet
npm test
```

## Cost

| Item | Cost |
|---|---|
| GitHub Actions, JSearch free tier, Adzuna, Google Sheets | Free |
| Claude scoring with `claude-opus-5-5` (default) | about $0.30–0.50 a day for 30–60 new jobs |
| Claude scoring with `claude-haiku-5-5` | about $0.01–0.03 a day |
| No Anthropic key (keyword scoring) | Free |

Job descriptions are trimmed to their first 4,000 characters before scoring, which keeps the cost predictable.
