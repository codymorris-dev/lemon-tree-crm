# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lead generation CRM for **Lemon Tree Bookkeeping** (St. Petersburg, FL). Finds small business leads via the Google Places API and manages them through a web dashboard. All data persists in `leads.json` — no database.

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Start the CRM server (then open http://localhost:5000)
python app.py

# Fetch new leads from Google Places API
GOOGLE_PLACES_API_KEY=your_key_here python fetch_leads.py
```

## Architecture

```
fetch_leads.py      # Standalone script: hits Google Places API, writes to leads.json
app.py              # Flask server: REST API + serves the frontend
leads.json          # Flat-file data store (array of lead objects)
templates/
  index.html        # Single-page CRM dashboard
static/
  styles.css        # Full styling — lemon/green brand theme
  app.js            # All frontend logic (fetch, filter, sort, modals, export)
```

**Data flow:**
- `fetch_leads.py` populates `leads.json` with raw leads from the Google Places Nearby Search + Details APIs
- `app.py` exposes `GET/POST /api/leads` and `PATCH/DELETE /api/leads/<id>`
- `app.js` fetches all leads on load, filters/sorts in-memory, and PATCHes individual leads on save

**Lead schema** (in `leads.json`):
```json
{
  "id": "uuid",
  "place_id": "google_place_id",
  "name": "Business Name",
  "address": "...", "phone": "...", "website": "...",
  "business_type": "Restaurant",
  "rating": 4.5, "review_count": 120,
  "status": "new | contacted | interested | converted",
  "contacted": false,
  "notes": "...",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

## Google Places API Notes

- Uses Nearby Search then Place Details for each result (two API calls per lead)
- Add a 2-second delay before using `next_page_token` (Google requirement)
- Deduplication is by `place_id` — re-running the script is safe
- API key needs **Places API** enabled in Google Cloud Console
