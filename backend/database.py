import sqlite3
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "autolead.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_name TEXT NOT NULL,
        source TEXT NOT NULL,
        category TEXT NOT NULL,
        website_url TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        contact_person TEXT,
        location TEXT,
        description TEXT,
        website_analysis TEXT,
        pitch_subject TEXT,
        pitch_body TEXT,
        status TEXT NOT NULL DEFAULT 'DISCOVERED',
        sent_at TEXT,
        created_at TEXT NOT NULL,
        error_message TEXT,
        UNIQUE(website_url, contact_email)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL,
        module TEXT NOT NULL,
        message TEXT NOT NULL
    )
    """)

    # Deduplication Tables: Strictly track seen domains, emails, and post IDs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS seen_domains (
        domain TEXT PRIMARY KEY,
        first_seen TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS seen_emails (
        email TEXT PRIMARY KEY,
        first_seen TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS seen_sources (
        source_id TEXT PRIMARY KEY,
        first_seen TEXT NOT NULL
    )
    """)

    # Backfill seen tables from existing leads
    cursor.execute("SELECT website_url, contact_email FROM leads")
    for r in cursor.fetchall():
        url = r["website_url"]
        em = r["contact_email"]
        if url:
            from urllib.parse import urlparse
            d = urlparse(url).netloc.lower().replace("www.", "")
            if d:
                cursor.execute("INSERT OR IGNORE INTO seen_domains (domain, first_seen) VALUES (?, ?)", (d, datetime.utcnow().isoformat()))
        if em:
            cursor.execute("INSERT OR IGNORE INTO seen_emails (email, first_seen) VALUES (?, ?)", (em.strip().lower(), datetime.utcnow().isoformat()))

    # Seed default settings if not exists
    default_settings = {
        "autonomous_mode": "true",
        "crawler_active": "true",
        "crawl_interval_minutes": "10",
        "smtp_host": "smtp.gmail.com",
        "smtp_port": "587",
        "smtp_user": "",
        "smtp_pass": "",
        "from_name": "Senior Solutions Architect",
        "daily_send_limit": "30",
        "gemini_api_key": "",
        "simulation_mode": "false",
        "target_niches": json.dumps([
            "Dental & Medical Clinics",
            "Real Estate Agencies",
            "Fitness Centers & Gyms",
            "Boutique E-commerce Brands",
            "Law Firms & Legal Consultancies",
            "Home Improvement & Roofing"
        ]),
        "target_locations": json.dumps([
            "New York, NY",
            "Austin, TX",
            "London, UK",
            "Toronto, Canada",
            "Los Angeles, CA",
            "Chicago, IL"
        ])
    }

    for key, val in default_settings.items():
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, val))

    conn.commit()
    conn.close()

def log_activity(module: str, message: str, level: str = "INFO"):
    try:
        conn = get_db()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute(
            "INSERT INTO activity_logs (timestamp, level, module, message) VALUES (?, ?, ?, ?)",
            (now, level, module, message)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to log activity: {e}")

def get_recent_logs(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_setting(key: str, default: str = "") -> str:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default

def set_setting(key: str, value: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

def get_all_settings() -> Dict[str, str]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

from urllib.parse import urlparse

def normalize_domain(url: str) -> str:
    if not url:
        return ""
    try:
        if not url.startswith("http://") and not url.startswith("https://"):
            url = "https://" + url
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        domain = domain.split(":")[0].strip()
        return domain
    except Exception:
        return ""

def is_domain_seen(domain: str) -> bool:
    if not domain:
        return False
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM seen_domains WHERE domain = ?", (domain,))
    res = cursor.fetchone()
    conn.close()
    return res is not None

def is_email_seen(email: str) -> bool:
    if not email:
        return False
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM seen_emails WHERE email = ?", (email.strip().lower(),))
    res = cursor.fetchone()
    conn.close()
    return res is not None

def is_source_id_seen(source_id: str) -> bool:
    if not source_id:
        return False
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM seen_sources WHERE source_id = ?", (source_id,))
    res = cursor.fetchone()
    conn.close()
    return res is not None

def mark_domain_seen(domain: str):
    if not domain:
        return
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO seen_domains (domain, first_seen) VALUES (?, ?)", (domain, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()

def mark_email_seen(email: str):
    if not email:
        return
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO seen_emails (email, first_seen) VALUES (?, ?)", (email.strip().lower(), datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()

def mark_source_id_seen(source_id: str):
    if not source_id:
        return
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO seen_sources (source_id, first_seen) VALUES (?, ?)", (source_id, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()

def save_lead(lead: Dict[str, Any]) -> Optional[int]:
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    url = lead.get("website_url", "").strip()
    email = lead.get("contact_email", "").strip().lower()
    domain = normalize_domain(url)

    # 1. Strict Domain Deduplication
    if domain:
        cursor.execute("SELECT 1 FROM seen_domains WHERE domain = ?", (domain,))
        if cursor.fetchone():
            conn.close()
            return None

    # 2. Strict Email Deduplication
    if email:
        cursor.execute("SELECT 1 FROM seen_emails WHERE email = ?", (email,))
        if cursor.fetchone():
            conn.close()
            return None

    analysis_str = json.dumps(lead.get("website_analysis", {})) if isinstance(lead.get("website_analysis"), dict) else (lead.get("website_analysis") or "{}")

    try:
        cursor.execute("""
        INSERT INTO leads (
            business_name, source, category, website_url, contact_email,
            contact_phone, contact_person, location, description,
            website_analysis, pitch_subject, pitch_body, status,
            sent_at, created_at, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            lead.get("business_name", "Unknown Business"),
            lead.get("source", "crawler"),
            lead.get("category", "Website Redesign"),
            url,
            email,
            lead.get("contact_phone", ""),
            lead.get("contact_person", ""),
            lead.get("location", ""),
            lead.get("description", ""),
            analysis_str,
            lead.get("pitch_subject", ""),
            lead.get("pitch_body", ""),
            lead.get("status", "DISCOVERED"),
            lead.get("sent_at", None),
            now,
            lead.get("error_message", None)
        ))
        conn.commit()
        new_id = cursor.lastrowid

        # Register in seen tables
        if domain:
            cursor.execute("INSERT OR IGNORE INTO seen_domains (domain, first_seen) VALUES (?, ?)", (domain, now))
        if email:
            cursor.execute("INSERT OR IGNORE INTO seen_emails (email, first_seen) VALUES (?, ?)", (email, now))
        conn.commit()
        conn.close()
        return new_id
    except sqlite3.IntegrityError:
        conn.close()
        return None

def update_lead(lead_id: int, updates: Dict[str, Any]):
    conn = get_db()
    cursor = conn.cursor()
    set_clauses = []
    values = []

    for k, v in updates.items():
        if k == "website_analysis" and isinstance(v, dict):
            v = json.dumps(v)
        set_clauses.append(f"{k} = ?")
        values.append(v)

    values.append(lead_id)
    sql = f"UPDATE leads SET {', '.join(set_clauses)} WHERE id = ?"
    cursor.execute(sql, values)
    conn.commit()
    conn.close()

def get_lead(lead_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leads WHERE id = ?", (lead_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    if d.get("website_analysis"):
        try:
            d["website_analysis"] = json.loads(d["website_analysis"])
        except Exception:
            pass
    return d

def get_leads(status: Optional[str] = None, category: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM leads WHERE 1=1"
    params = []

    if status and status != "ALL":
        query += " AND status = ?"
        params.append(status)
    if category and category != "ALL":
        query += " AND category = ?"
        params.append(category)

    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        d = dict(r)
        if d.get("website_analysis"):
            try:
                d["website_analysis"] = json.loads(d["website_analysis"])
            except Exception:
                pass
        result.append(d)
    return result

def get_metrics() -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM leads")
    total_leads = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM leads WHERE status = 'SENT'")
    total_sent = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM leads WHERE contact_email IS NOT NULL AND contact_email != ''")
    emails_found = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM leads WHERE category = 'App Development'")
    app_leads = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM leads WHERE category = 'Website Redesign'")
    web_leads = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM leads WHERE status = 'DISCOVERED'")
    pending_leads = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM seen_domains")
    seen_domains_count = cursor.fetchone()[0]

    conn.close()

    return {
        "total_leads": total_leads,
        "total_sent": total_sent,
        "emails_found": emails_found,
        "app_leads": app_leads,
        "web_leads": web_leads,
        "pending_leads": pending_leads,
        "seen_domains_count": seen_domains_count
    }

init_db()
