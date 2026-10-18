import aiosmtplib
from email.message import EmailMessage
from datetime import datetime
from typing import Dict, Any, Tuple
from ..database import get_setting, log_activity, update_lead, get_db

async def send_cold_email(lead: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Sends an autonomous cold email to the target lead via Gmail / SMTP.
    If simulation mode is active or credentials are empty, simulates success safely.
    """
    lead_id = lead["id"]
    to_email = lead.get("contact_email", "").strip()
    subject = lead.get("pitch_subject", "").strip()
    body = lead.get("pitch_body", "").strip()
    biz_name = lead.get("business_name", "Lead")

    if not to_email:
        err = "Cannot send email: Lead has no valid contact email address."
        update_lead(lead_id, {"status": "FAILED", "error_message": err})
        log_activity("EMAIL_SENDER", f"Skipped lead #{lead_id} ({biz_name}): No email address found.", "WARNING")
        return False, err

    smtp_user = get_setting("smtp_user", "").strip()
    smtp_pass = get_setting("smtp_pass", "").strip()
    smtp_host = get_setting("smtp_host", "smtp.gmail.com").strip()
    smtp_port = int(get_setting("smtp_port", "587"))
    from_name = get_setting("from_name", "Solutions Architect").strip()
    simulation_mode = get_setting("simulation_mode", "false").lower() == "true"

    # Check daily quota
    daily_limit = int(get_setting("daily_send_limit", "30"))
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM leads WHERE status = 'SENT' AND date(sent_at) = date('now')")
    today_sent = cursor.fetchone()[0]
    conn.close()

    if today_sent >= daily_limit:
        msg = f"Daily send limit of {daily_limit} emails reached. Pausing autonomous send until tomorrow."
        log_activity("EMAIL_SENDER", msg, "WARNING")
        return False, msg

    # If simulation mode is active OR no SMTP credentials yet configured:
    if simulation_mode or not smtp_user or not smtp_pass:
        now = datetime.utcnow().isoformat()
        update_lead(lead_id, {
            "status": "SENT",
            "sent_at": now,
            "error_message": "Delivered via AutoLead Sandbox Simulator (Configure Gmail SMTP in Settings for live sending)"
        })
        log_activity("EMAIL_SENDER", f"[SIMULATION] Autonomous cold email dispatched to {to_email} for '{biz_name}'! Subject: '{subject[:40]}...'", "SUCCESS")
        return True, "Simulated delivery successful"

    # Real SMTP Delivery via Gmail / Custom SMTP
    try:
        msg = EmailMessage()
        msg["From"] = f"{from_name} <{smtp_user}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)

        # Connect with STARTTLS
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_pass,
            start_tls=True,
            timeout=20
        )

        now = datetime.utcnow().isoformat()
        update_lead(lead_id, {
            "status": "SENT",
            "sent_at": now,
            "error_message": None
        })
        log_activity("EMAIL_SENDER", f"Live Email SENT successfully to {to_email} ({biz_name})!", "SUCCESS")
        return True, "Email sent successfully"

    except Exception as e:
        err_msg = str(e)
        update_lead(lead_id, {
            "status": "FAILED",
            "error_message": err_msg
        })
        log_activity("EMAIL_SENDER", f"SMTP delivery failed for {to_email}: {err_msg}", "ERROR")
        return False, err_msg
