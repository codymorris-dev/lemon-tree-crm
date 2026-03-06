#!/usr/bin/env python3
"""
Lemon Tree Bookkeeping - CRM Server
Run: python app.py
Open: http://localhost:5000
"""

import json
import os
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory, abort

app = Flask(__name__, static_folder="static", template_folder="templates")
LEADS_FILE = "leads.json"


def load_leads() -> list:
    if os.path.exists(LEADS_FILE):
        with open(LEADS_FILE, "r") as f:
            return json.load(f)
    return []


def save_leads(leads: list) -> None:
    with open(LEADS_FILE, "w") as f:
        json.dump(leads, f, indent=2)


# ── Frontend ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory("templates", "index.html")


# ── API ───────────────────────────────────────────────────────────────────────

@app.route("/api/leads", methods=["GET"])
def get_leads():
    return jsonify(load_leads())


@app.route("/api/leads", methods=["POST"])
def create_lead():
    import uuid
    data = request.get_json(force=True)
    lead = {
        "id": str(uuid.uuid4()),
        "place_id": "",
        "name": data.get("name", ""),
        "address": data.get("address", ""),
        "phone": data.get("phone", ""),
        "website": data.get("website", ""),
        "business_type": data.get("business_type", "Other"),
        "rating": None,
        "review_count": None,
        "status": "new",
        "notes": "",
        "contacted": False,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }
    leads = load_leads()
    leads.append(lead)
    save_leads(leads)
    return jsonify(lead), 201


@app.route("/api/leads/<lead_id>", methods=["PATCH"])
def update_lead(lead_id):
    leads = load_leads()
    data = request.get_json(force=True)

    for lead in leads:
        if lead["id"] == lead_id:
            allowed = {"status", "notes", "contacted", "name", "address", "phone", "website", "business_type"}
            for key in allowed:
                if key in data:
                    lead[key] = data[key]
            lead["updated_at"] = datetime.now().isoformat()
            save_leads(leads)
            return jsonify(lead)

    abort(404)


@app.route("/api/leads/<lead_id>", methods=["DELETE"])
def delete_lead(lead_id):
    leads = load_leads()
    original_len = len(leads)
    leads = [l for l in leads if l["id"] != lead_id]
    if len(leads) == original_len:
        abort(404)
    save_leads(leads)
    return jsonify({"success": True})


@app.route("/api/stats", methods=["GET"])
def get_stats():
    leads = load_leads()
    stats = {"total": len(leads), "new": 0, "contacted": 0, "interested": 0, "converted": 0}
    for lead in leads:
        s = lead.get("status", "new")
        if s in stats:
            stats[s] += 1
    return jsonify(stats)


if __name__ == "__main__":
    print("🍋  Lemon Tree Bookkeeping CRM")
    print("   Open: http://localhost:5000\n")
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
