#!/usr/bin/env python3
"""
Lemon Tree Bookkeeping - Lead Fetcher
Pulls small business leads from SerpAPI (Google Maps) in St. Petersburg, FL
Usage: SERPAPI_KEY=your_key python fetch_leads.py
"""

import requests
import json
import os
import time
import uuid
from datetime import datetime

API_KEY = os.environ.get("SERPAPI_KEY", "")
LEADS_FILE = "leads.json"

# St. Petersburg, FL — ll format: @lat,lng,zoom
LOCATION = "@27.7676,-82.6403,13z"

# (search query, display label)
BUSINESS_TYPES = [
    ("restaurants", "Restaurant"),
    ("hair salons", "Salon"),
    ("general contractors", "Contractor"),
    ("dentists", "Dentist"),
    ("auto repair shops", "Auto Repair"),
    ("retail shops", "Retail"),
    ("gyms", "Gym / Fitness"),
    ("medical offices", "Medical Office"),
    ("law firms", "Law Firm"),
    ("accountants", "Accounting"),
]


def search_businesses(query: str, start: int = 0) -> dict:
    params = {
        "engine": "google_maps",
        "q": f"{query} in St Petersburg FL",
        "ll": LOCATION,
        "type": "search",
        "start": start,
        "api_key": API_KEY,
    }
    resp = requests.get("https://serpapi.com/search", params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def load_existing_leads() -> list:
    if os.path.exists(LEADS_FILE):
        with open(LEADS_FILE, "r") as f:
            return json.load(f)
    return []


def save_leads(leads: list) -> None:
    with open(LEADS_FILE, "w") as f:
        json.dump(leads, f, indent=2)


def main():
    if not API_KEY:
        print("Error: SERPAPI_KEY environment variable is not set.")
        print("   Run: export SERPAPI_KEY='your_api_key_here'")
        return

    print("Lemon Tree Bookkeeping - Lead Fetcher")
    print("   Searching St. Petersburg, FL via SerpAPI (Google Maps)\n")

    existing_leads = load_existing_leads()
    existing_place_ids = {lead["place_id"] for lead in existing_leads if lead.get("place_id")}
    new_leads = []
    total_skipped = 0

    for query, type_label in BUSINESS_TYPES:
        print(f"  Searching: {type_label}s...")

        for page in range(3):  # Up to 3 pages (0, 20, 40)
            start = page * 20

            try:
                data = search_businesses(query, start)
            except requests.RequestException as e:
                print(f"    Warning: Request failed: {e}")
                break

            results = data.get("local_results", [])
            if not results:
                break

            for place in results:
                place_id = place.get("place_id", "")

                # Use place_id for dedup; fall back to title+address
                dedup_key = place_id or f"{place.get('title', '')}|{place.get('address', '')}"

                if dedup_key in existing_place_ids:
                    total_skipped += 1
                    continue

                lead = {
                    "id": str(uuid.uuid4()),
                    "place_id": place_id,
                    "name": place.get("title", ""),
                    "address": place.get("address", ""),
                    "phone": place.get("phone", ""),
                    "website": place.get("website", ""),
                    "business_type": type_label,
                    "rating": place.get("rating"),
                    "review_count": place.get("reviews"),
                    "status": "new",
                    "notes": "",
                    "contacted": False,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                }

                existing_place_ids.add(dedup_key)
                new_leads.append(lead)
                print(f"    + {lead['name']}")

            # Stop paginating if fewer than 20 results (last page)
            if len(results) < 20:
                break

            time.sleep(1)  # Polite rate limiting between pages

        time.sleep(0.5)  # Brief pause between business types

    all_leads = existing_leads + new_leads
    save_leads(all_leads)

    print(f"\n{'─' * 50}")
    print(f"Done!")
    print(f"   New leads added : {len(new_leads)}")
    print(f"   Skipped (dupes) : {total_skipped}")
    print(f"   Total in CRM    : {len(all_leads)}")
    print(f"\n   Open the CRM: python app.py  ->  http://localhost:5000")


if __name__ == "__main__":
    main()
