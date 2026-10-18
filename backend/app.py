import asyncio
import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from .database import (
    init_db, get_leads, get_lead, update_lead, get_metrics,
    get_all_settings, set_setting, get_recent_logs, log_activity, save_lead
)
from .crawler.engine import (
    start_crawler_engine, stop_crawler_engine, run_single_crawler_cycle
)
from .ai.pitch_generator import generate_ai_pitch
from .outreach.email_sender import send_cold_email

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Database
    init_db()
    # Start 24/7 background crawler engine
    loop = asyncio.get_event_loop()
    start_crawler_engine(loop)
    log_activity("SYSTEM", "AutoLead AI Server started on http://127.0.0.1:8000", "SUCCESS")
    yield
    # Cleanup
    stop_crawler_engine()
    log_activity("SYSTEM", "AutoLead AI Server shutdown", "INFO")

app = FastAPI(title="AutoLead AI Engine", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SettingsUpdate(BaseModel):
    settings: Dict[str, Any]

class PitchUpdate(BaseModel):
    pitch_subject: str
    pitch_body: str

class TestSMTPRequest(BaseModel):
    test_email: str

@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "AutoLead AI"}

@app.get("/api/metrics")
async def fetch_metrics():
    return get_metrics()

@app.get("/api/leads")
async def fetch_leads(status: Optional[str] = "ALL", category: Optional[str] = "ALL", limit: int = 100):
    return get_leads(status=status, category=category, limit=limit)

@app.get("/api/leads/{lead_id}")
async def fetch_lead(lead_id: int):
    lead = get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@app.post("/api/leads/{lead_id}/generate-pitch")
async def regenerate_pitch(lead_id: int):
    lead = get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    subject, body = await generate_ai_pitch(lead)
    update_lead(lead_id, {
        "pitch_subject": subject,
        "pitch_body": body,
        "status": "DRAFTED"
    })
    return {"subject": subject, "body": body}

@app.post("/api/leads/{lead_id}/update-pitch")
async def edit_pitch(lead_id: int, data: PitchUpdate):
    update_lead(lead_id, {
        "pitch_subject": data.pitch_subject,
        "pitch_body": data.pitch_body
    })
    return {"status": "updated"}

@app.post("/api/leads/{lead_id}/send")
async def trigger_send(lead_id: int):
    lead = get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.get("pitch_body"):
        subject, body = await generate_ai_pitch(lead)
        lead["pitch_subject"] = subject
        lead["pitch_body"] = body
        update_lead(lead_id, {"pitch_subject": subject, "pitch_body": body})

    success, msg = await send_cold_email(lead)
    return {"success": success, "message": msg, "lead": get_lead(lead_id)}

@app.delete("/api/leads/{lead_id}")
async def delete_lead(lead_id: int):
    from .database import get_db
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM leads WHERE id = ?", (lead_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

@app.get("/api/settings")
async def fetch_settings():
    return get_all_settings()

@app.post("/api/settings")
async def update_settings(data: SettingsUpdate):
    for k, v in data.settings.items():
        if isinstance(v, (list, dict)):
            v = json.dumps(v)
        set_setting(k, str(v))
    log_activity("SYSTEM", "Settings successfully updated by user.", "INFO")
    return {"status": "saved"}

@app.get("/api/logs")
async def fetch_logs(limit: int = 60):
    return get_recent_logs(limit=limit)

@app.post("/api/crawler/trigger")
async def trigger_crawler_cycle(bg_tasks: BackgroundTasks):
    bg_tasks.add_task(run_single_crawler_cycle)
    log_activity("CRAWLER", "Manual crawl trigger requested by user.", "INFO")
    return {"status": "initiated", "message": "Crawler cycle launched in background"}

@app.post("/api/crawler/toggle")
async def toggle_crawler():
    from .database import get_setting
    curr = get_setting("crawler_active", "true").lower() == "true"
    new_state = "false" if curr else "true"
    set_setting("crawler_active", new_state)
    log_activity("CRAWLER", f"Crawler state switched to: {new_state.upper()}", "INFO")
    return {"crawler_active": new_state == "true"}

@app.post("/api/seed-leads")
async def seed_demo_leads():
    """Seeds high quality starter leads for instant exploration."""
    demo_leads = [
        {
            "business_name": "Apex Dental & Implant Center",
            "source": "Local Business Discovery",
            "category": "App Development",
            "website_url": "https://apexdentalaustin.example.com",
            "contact_email": "hello@apexdentalaustin.example.com",
            "contact_phone": "+1 (512) 555-0194",
            "location": "Austin, TX, USA",
            "description": "High-volume cosmetic dental & orthodontics clinic in Austin. Currently taking bookings via slow phone lines and outdated web form.",
            "website_analysis": {
                "mobile_responsive": True,
                "has_mobile_app": False,
                "load_speed_ms": 1950,
                "tech_stack": ["WordPress", "Wix"],
                "audit_flags": ["No Native iOS/Android App (Losing mobile repeat patients)", "Missing automated SMS/push appointment reminders"],
                "opportunity_score": 94,
                "recommended_category": "App Development"
            },
            "status": "DISCOVERED"
        },
        {
            "business_name": "Prestige Prime Real Estate",
            "source": "Local Business Discovery",
            "category": "Website Redesign",
            "website_url": "https://prestigeprime-properties.example.co.uk",
            "contact_email": "inquiries@prestigeprime-properties.example.co.uk",
            "contact_phone": "+44 20 7946 0912",
            "location": "London, UK",
            "description": "Luxury property brokerage in Central London. High value listings but site is built on an old non-responsive template with 3.8s load times.",
            "website_analysis": {
                "mobile_responsive": False,
                "has_mobile_app": False,
                "load_speed_ms": 3820,
                "tech_stack": ["WordPress", "Bootstrap 3"],
                "audit_flags": ["Missing mobile viewport tag", "Severe load time (>3.8s) causing client bounce", "No 3D Virtual Tour integration"],
                "opportunity_score": 98,
                "recommended_category": "Website Redesign"
            },
            "status": "DISCOVERED"
        },
        {
            "business_name": "HyperFit Elite Performance Gym",
            "source": "Local Business Discovery",
            "category": "App Development",
            "website_url": "https://hyperfit-nyc.example.com",
            "contact_email": "partnerships@hyperfit-nyc.example.com",
            "contact_phone": "+1 (212) 555-0188",
            "location": "New York, NY, USA",
            "description": "Crossfit and functional fitness center with 850 active members. Currently using paper/generic QR sheets for workout tracking and class checkins.",
            "website_analysis": {
                "mobile_responsive": True,
                "has_mobile_app": False,
                "load_speed_ms": 1400,
                "tech_stack": ["Squarespace"],
                "audit_flags": ["No Member Mobile App for QR checkin or workout leaderboard", "High membership retention opportunity"],
                "opportunity_score": 92,
                "recommended_category": "App Development"
            },
            "status": "DISCOVERED"
        },
        {
            "business_name": "FinTech Startup seeking React Native Builder",
            "source": "Reddit r/forhire",
            "category": "App Development",
            "website_url": "https://reddit.com/r/forhire/comments/demo1",
            "contact_email": "founder@novawallet.example.io",
            "contact_person": "u/cryptodev_founder",
            "location": "Remote / San Francisco, CA",
            "description": "[HIRING] We need an experienced mobile app developer to build an MVP for an iOS & Android expense and crypto rewards tracker. Budget: $4,500 - $8,000.",
            "website_analysis": {
                "source": "Reddit Gig Board",
                "opportunity_score": 96,
                "audit_flags": ["Explicit client budget stated ($5k+)", "Immediate hiring urgency"]
            },
            "status": "DISCOVERED"
        },
        {
            "business_name": "Artisan Craft Roasters E-Commerce",
            "source": "Local Business Discovery",
            "category": "Website Redesign",
            "website_url": "https://artisancraftroasters.example.com",
            "contact_email": "orders@artisancraftroasters.example.com",
            "location": "Toronto, Canada",
            "description": "Specialty coffee roastery selling subscriptions and whole bean bags. Current site has cumbersome 5-step checkout on old Shopify theme.",
            "website_analysis": {
                "mobile_responsive": True,
                "has_mobile_app": False,
                "load_speed_ms": 2890,
                "tech_stack": ["Shopify"],
                "audit_flags": ["High cart abandonment due to slow checkout", "Outdated theme lacks modern headless speed"],
                "opportunity_score": 86,
                "recommended_category": "Website Redesign"
            },
            "status": "DISCOVERED"
        }
    ]

    count = 0
    for l in demo_leads:
        res = save_lead(l)
        if res:
            count += 1
            # Generate pitch right away
            l["id"] = res
            subj, body = await generate_ai_pitch(l)
            update_lead(res, {"pitch_subject": subj, "pitch_body": body, "status": "DRAFTED"})

    log_activity("SYSTEM", f"Seeded {count} high-conversion starter leads with AI pitches ready.", "SUCCESS")
    return {"seeded": count}
