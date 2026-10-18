import os
import json
import sqlite3
import urllib.parse
from datetime import datetime
from typing import Optional, List, Dict, Any

from pymongo import MongoClient, ReturnDocument

# Auto-load .env file if available
def _load_env_file():
    env_paths = [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    ]
    for p in env_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip('"').strip("'")
                            if k and k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass

_load_env_file()

DB_PATH = os.path.join(os.path.dirname(__file__), "autolead.db")

# MongoDB Atlas Connection
MONGODB_URI = os.environ.get("MONGODB_URI", "")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "autolead")

_mongo_client: Optional[MongoClient] = None
_mongo_db = None
USE_MONGO = False

def get_mongo_db():
    global _mongo_client, _mongo_db, USE_MONGO
    if _mongo_db is not None:
        return _mongo_db
    try:
        if MONGODB_URI:
            _mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            _mongo_db = _mongo_client[MONGODB_DB_NAME]
            # Test ping
            _mongo_client.admin.command('ping')
            USE_MONGO = True
            return _mongo_db
    except Exception as e:
        print(f"[MongoDB] Connection failed: {e}. Falling back to SQLite.")
        USE_MONGO = False
        _mongo_db = None
    return None

def get_db():
    """Legacy SQLite connection fallback"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    global USE_MONGO
    mdb = get_mongo_db()
    if mdb is not None:
        USE_MONGO = True
        try:
            # Create indexes in MongoDB
            mdb.leads.create_index("id", unique=True)
            mdb.leads.create_index([("website_url", 1), ("contact_email", 1)])
            mdb.leads.create_index("status")
            mdb.leads.create_index("category")
            mdb.activity_logs.create_index([("id", -1)])
            mdb.activity_logs.create_index([("timestamp", -1)])

            # Seed default settings in Mongo if missing
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
                "gemini_api_key": os.environ.get("GEMINI_API_KEY", ""),
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
            for k, v in default_settings.items():
                mdb.settings.update_one({"_id": k}, {"$setOnInsert": {"value": v}}, upsert=True)

            log_activity("SYSTEM", "AutoLead connected to MongoDB Atlas (Cloud Database)", "SUCCESS")
            return
        except Exception as e:
            print(f"[MongoDB] Setup error: {e}")

    # Fallback to SQLite initialization
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
    cursor.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL,
        module TEXT NOT NULL,
        message TEXT NOT NULL
    )
    """)
    cursor.execute("CREATE TABLE IF NOT EXISTS seen_domains (domain TEXT PRIMARY KEY, first_seen TEXT NOT NULL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS seen_emails (email TEXT PRIMARY KEY, first_seen TEXT NOT NULL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS seen_sources (source_id TEXT PRIMARY KEY, first_seen TEXT NOT NULL)")
    conn.commit()
    conn.close()

def log_activity(module: str, message: str, level: str = "INFO"):
    now = datetime.utcnow().isoformat()
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            counter = mdb.counters.find_one_and_update(
                {"_id": "log_id"},
                {"$inc": {"seq": 1}},
                upsert=True,
                return_document=ReturnDocument.AFTER
            )
            log_id = counter["seq"]
            mdb.activity_logs.insert_one({
                "id": log_id,
                "timestamp": now,
                "level": level,
                "module": module,
                "message": message
            })
            return
        except Exception as e:
            print(f"Mongo log_activity error: {e}")

    # SQLite fallback
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO activity_logs (timestamp, level, module, message) VALUES (?, ?, ?, ?)",
            (now, level, module, message)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to log activity: {e}")

def get_recent_logs(limit: int = 50) -> List[Dict[str, Any]]:
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            docs = list(mdb.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
            return docs
        except Exception as e:
            print(f"Mongo get_recent_logs error: {e}")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_setting(key: str, default: str = "") -> str:
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            doc = mdb.settings.find_one({"_id": key})
            if doc and "value" in doc:
                return str(doc["value"])
            return default
        except Exception as e:
            print(f"Mongo get_setting error: {e}")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default

def set_setting(key: str, value: str):
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            mdb.settings.update_one({"_id": key}, {"$set": {"value": str(value)}}, upsert=True)
            return
        except Exception as e:
            print(f"Mongo set_setting error: {e}")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
    conn.commit()
    conn.close()

def get_all_settings() -> Dict[str, str]:
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            docs = list(mdb.settings.find({}))
            return {d["_id"]: d.get("value", "") for d in docs}
        except Exception as e:
            print(f"Mongo get_all_settings error: {e}")

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
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            return mdb.seen_domains.find_one({"_id": domain}) is not None
        except Exception:
            pass
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM seen_domains WHERE domain = ?", (domain,))
    res = cursor.fetchone()
    conn.close()
    return res is not None

def is_email_seen(email: str) -> bool:
    if not email:
        return False
    clean_em = email.strip().lower()
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            return mdb.seen_emails.find_one({"_id": clean_em}) is not None
        except Exception:
            pass
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM seen_emails WHERE email = ?", (clean_em,))
    res = cursor.fetchone()
    conn.close()
    return res is not None

def is_source_id_seen(source_id: str) -> bool:
    if not source_id:
        return False
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            return mdb.seen_sources.find_one({"_id": source_id}) is not None
        except Exception:
            pass
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM seen_sources WHERE source_id = ?", (source_id,))
    res = cursor.fetchone()
    conn.close()
    return res is not None

def mark_domain_seen(domain: str):
    if not domain:
        return
    now = datetime.utcnow().isoformat()
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            mdb.seen_domains.update_one({"_id": domain}, {"$setOnInsert": {"first_seen": now}}, upsert=True)
            return
        except Exception:
            pass
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO seen_domains (domain, first_seen) VALUES (?, ?)", (domain, now))
    conn.commit()
    conn.close()

def mark_email_seen(email: str):
    if not email:
        return
    clean_em = email.strip().lower()
    now = datetime.utcnow().isoformat()
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            mdb.seen_emails.update_one({"_id": clean_em}, {"$setOnInsert": {"first_seen": now}}, upsert=True)
            return
        except Exception:
            pass
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO seen_emails (email, first_seen) VALUES (?, ?)", (clean_em, now))
    conn.commit()
    conn.close()

def mark_source_id_seen(source_id: str):
    if not source_id:
        return
    now = datetime.utcnow().isoformat()
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            mdb.seen_sources.update_one({"_id": source_id}, {"$setOnInsert": {"first_seen": now}}, upsert=True)
            return
        except Exception:
            pass
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO seen_sources (source_id, first_seen) VALUES (?, ?)", (source_id, now))
    conn.commit()
    conn.close()

def save_lead(lead: Dict[str, Any]) -> Optional[int]:
    now = datetime.utcnow().isoformat()
    url = lead.get("website_url", "").strip()
    email = lead.get("contact_email", "").strip().lower()
    domain = normalize_domain(url)

    # 1. Strict Domain Deduplication
    if domain and is_domain_seen(domain):
        return None

    # 2. Strict Email Deduplication
    if email and is_email_seen(email):
        return None

    analysis = lead.get("website_analysis", {})
    if isinstance(analysis, str):
        try:
            analysis = json.loads(analysis)
        except Exception:
            analysis = {}

    mdb = get_mongo_db()
    if mdb is not None:
        try:
            # Atomic autoincrement ID
            counter = mdb.counters.find_one_and_update(
                {"_id": "lead_id"},
                {"$inc": {"seq": 1}},
                upsert=True,
                return_document=ReturnDocument.AFTER
            )
            new_id = counter["seq"]

            doc = {
                "id": new_id,
                "business_name": lead.get("business_name", "Unknown Business"),
                "source": lead.get("source", "crawler"),
                "category": lead.get("category", "Website Redesign"),
                "website_url": url,
                "contact_email": email,
                "contact_phone": lead.get("contact_phone", ""),
                "contact_person": lead.get("contact_person", ""),
                "location": lead.get("location", ""),
                "description": lead.get("description", ""),
                "website_analysis": analysis,
                "pitch_subject": lead.get("pitch_subject", ""),
                "pitch_body": lead.get("pitch_body", ""),
                "status": lead.get("status", "DISCOVERED"),
                "sent_at": lead.get("sent_at", None),
                "created_at": now,
                "error_message": lead.get("error_message", None)
            }
            mdb.leads.insert_one(doc)

            if domain:
                mark_domain_seen(domain)
            if email:
                mark_email_seen(email)

            return new_id
        except Exception as e:
            print(f"Mongo save_lead error: {e}")
            return None

    # SQLite fallback
    conn = get_db()
    cursor = conn.cursor()
    analysis_str = json.dumps(analysis)
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
        if domain:
            mark_domain_seen(domain)
        if email:
            mark_email_seen(email)
        conn.close()
        return new_id
    except sqlite3.IntegrityError:
        conn.close()
        return None

def update_lead(lead_id: int, updates: Dict[str, Any]):
    lead_id = int(lead_id)
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            upd = dict(updates)
            if "website_analysis" in upd and isinstance(upd["website_analysis"], str):
                try:
                    upd["website_analysis"] = json.loads(upd["website_analysis"])
                except Exception:
                    pass
            mdb.leads.update_one({"id": lead_id}, {"$set": upd})
            return
        except Exception as e:
            print(f"Mongo update_lead error: {e}")

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

def delete_lead(lead_id: int):
    lead_id = int(lead_id)
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            mdb.leads.delete_one({"id": lead_id})
            return
        except Exception as e:
            print(f"Mongo delete_lead error: {e}")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM leads WHERE id = ?", (lead_id,))
    conn.commit()
    conn.close()

def get_lead(lead_id: int) -> Optional[Dict[str, Any]]:
    lead_id = int(lead_id)
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            doc = mdb.leads.find_one({"id": lead_id}, {"_id": 0})
            return doc
        except Exception as e:
            print(f"Mongo get_lead error: {e}")

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
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            query = {}
            if status and status != "ALL":
                query["status"] = status
            if category and category != "ALL":
                query["category"] = category
            docs = list(mdb.leads.find(query, {"_id": 0}).sort("id", -1).limit(limit))
            return docs
        except Exception as e:
            print(f"Mongo get_leads error: {e}")

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
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            total_leads = mdb.leads.count_documents({})
            total_sent = mdb.leads.count_documents({"status": "SENT"})
            emails_found = mdb.leads.count_documents({"contact_email": {"$nin": [None, ""]}})
            app_leads = mdb.leads.count_documents({"category": "App Development"})
            web_leads = mdb.leads.count_documents({"category": "Website Redesign"})
            pending_leads = mdb.leads.count_documents({"status": "DISCOVERED"})
            seen_domains_count = mdb.seen_domains.count_documents({})

            return {
                "total_leads": total_leads,
                "total_sent": total_sent,
                "emails_found": emails_found,
                "app_leads": app_leads,
                "web_leads": web_leads,
                "pending_leads": pending_leads,
                "seen_domains_count": seen_domains_count,
                "database_mode": "MongoDB Atlas"
            }
        except Exception as e:
            print(f"Mongo get_metrics error: {e}")

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
        "seen_domains_count": seen_domains_count,
        "database_mode": "SQLite"
    }

def get_daily_sent_count() -> int:
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            return mdb.leads.count_documents({
                "status": "SENT",
                "sent_at": {"$regex": f"^{today_str}"}
            })
        except Exception as e:
            print(f"Mongo get_daily_sent_count error: {e}")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM leads WHERE status = 'SENT' AND date(sent_at) = date('now')")
    count = cursor.fetchone()[0]
    conn.close()
    return count

def get_leads_needing_pitch(limit: int = 15) -> List[Dict[str, Any]]:
    mdb = get_mongo_db()
    if mdb is not None:
        try:
            docs = list(mdb.leads.find({
                "$or": [{"pitch_body": None}, {"pitch_body": ""}]
            }, {"_id": 0}).limit(limit))
            return docs
        except Exception as e:
            print(f"Mongo get_leads_needing_pitch error: {e}")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leads WHERE pitch_body IS NULL OR pitch_body = '' LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

init_db()
