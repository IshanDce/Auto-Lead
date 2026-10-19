import asyncio
import json
import random
from datetime import datetime
from typing import Dict, Any, List

from ..database import (
    get_setting, log_activity, get_leads, update_lead, 
    get_leads_needing_pitch, get_leads_ready_for_outreach, get_daily_sent_count
)
from .local_businesses import crawl_local_niche
from .job_boards import crawl_job_boards
from .website_analyzer import is_valid_email
from ..ai.pitch_generator import generate_ai_pitch
from ..outreach.email_sender import send_cold_email

_crawler_task: asyncio.Task = None
_is_running = False

async def process_autonomous_pipeline():
    """
    1. Looks for newly discovered/analyzed leads and creates AI pitches (DRAFTED).
    2. If autonomous mode is ON, automatically dispatches valid cold emails to pending leads.
    """
    autonomous_on = get_setting("autonomous_mode", "true").lower() == "true"
    
    # 1. Generate AI pitches for unpitched leads
    rows = get_leads_needing_pitch(limit=15)
    for r in rows:
        lead = dict(r)
        lead_id = lead["id"]
        try:
            subject, body = await generate_ai_pitch(lead)
            update_lead(lead_id, {
                "pitch_subject": subject,
                "pitch_body": body,
                "status": "DRAFTED"
            })
            lead["pitch_subject"] = subject
            lead["pitch_body"] = body
            log_activity("AI_PITCH", f"Generated customized pitch for '{lead.get('business_name')}': '{subject}'", "INFO")
        except Exception as e:
            log_activity("AI_PITCH", f"Error generating pitch for lead #{lead_id}: {e}", "ERROR")

    # 2. If Autonomous mode is active, dispatch pending ready leads
    if autonomous_on:
        daily_limit = int(get_setting("daily_send_limit", "30"))
        today_sent = get_daily_sent_count()

        if today_sent >= daily_limit:
            log_activity("EMAIL_SENDER", f"Daily send quota reached ({today_sent}/{daily_limit}). Autonomous sending paused until tomorrow.", "WARNING")
            return

        ready_leads = get_leads_ready_for_outreach(limit=10)
        for lead in ready_leads:
            lead_id = lead["id"]
            to_email = lead.get("contact_email", "").strip()

            if not to_email or not is_valid_email(to_email):
                update_lead(lead_id, {
                    "status": "FAILED",
                    "error_message": f"Blocked: Invalid recipient address format '{to_email}'"
                })
                continue

            if today_sent >= daily_limit:
                break

            biz_name = lead.get("business_name", "Lead")
            log_activity("EMAIL_SENDER", f"Auto-Pilot Active: Shooting automated pitch to {to_email} ({biz_name})...", "INFO")
            success, msg = await send_cold_email(lead)
            if success:
                today_sent += 1
            
            # Anti-spam natural delay between autonomous emails
            sim_active = get_setting("simulation_mode", "false").lower() == "true"
            delay = random.uniform(1.0, 3.0) if sim_active else random.uniform(30.0, 60.0)
            await asyncio.sleep(delay)

async def run_single_crawler_cycle():
    """Executes one full crawl across active niches, job boards, and dispatches outreach."""
    log_activity("CRAWLER", "🚀 Starting autonomous crawling cycle across multi-channel sources...", "INFO")

    try:
        raw_niches = get_setting("target_niches", "[]")
        raw_locations = get_setting("target_locations", "[]")
        niches = json.loads(raw_niches) if raw_niches else ["Dental Clinics", "Real Estate Agencies"]
        locations = json.loads(raw_locations) if raw_locations else ["New York, NY", "London, UK"]
    except Exception:
        niches = ["Dental Clinics", "Fitness Centers"]
        locations = ["Austin, TX", "London, UK"]

    # 1. Pick a random niche and location pair to diversify crawling
    chosen_niche = random.choice(niches)
    chosen_location = random.choice(locations)

    # 2. Crawl local businesses
    try:
        await crawl_local_niche(chosen_niche, chosen_location)
    except Exception as e:
        log_activity("CRAWLER", f"Local crawl exception: {e}", "ERROR")

    # 3. Crawl job boards (Reddit & HackerNews)
    try:
        await crawl_job_boards()
    except Exception as e:
        log_activity("CRAWLER", f"Job boards crawl exception: {e}", "ERROR")

    # 4. Run AI pitch generation and autonomous email dispatch
    await process_autonomous_pipeline()

    log_activity("CRAWLER", f"✅ Crawl cycle complete for {chosen_niche} in {chosen_location}. Standing by for next cycle.", "SUCCESS")

async def crawler_background_loop():
    """Continuous 24/7 background worker loop."""
    global _is_running
    _is_running = True
    log_activity("CRAWLER", "Autonomous 24/7 Crawler Engine initiated. Background worker running.", "SUCCESS")

    while _is_running:
        active_setting = get_setting("crawler_active", "true").lower() == "true"
        if active_setting:
            try:
                await run_single_crawler_cycle()
            except Exception as e:
                log_activity("CRAWLER", f"Error in background crawl loop: {e}", "ERROR")

        # Configurable wait time (default 10 minutes between automated sweep cycles)
        try:
            interval_min = int(get_setting("crawl_interval_minutes", "10"))
        except Exception:
            interval_min = 10

        sleep_seconds = max(60, interval_min * 60)
        # Sleep in small increments to allow rapid shutdown or instant trigger
        for _ in range(int(sleep_seconds / 5)):
            if not _is_running:
                break
            await asyncio.sleep(5)

def start_crawler_engine(loop: asyncio.AbstractEventLoop):
    global _crawler_task, _is_running
    if _crawler_task is None or _crawler_task.done():
        _is_running = True
        _crawler_task = loop.create_task(crawler_background_loop())

def stop_crawler_engine():
    global _crawler_task, _is_running
    _is_running = False
    if _crawler_task and not _crawler_task.done():
        _crawler_task.cancel()
        _crawler_task = None
    log_activity("CRAWLER", "Crawler engine stopped by user.", "INFO")
