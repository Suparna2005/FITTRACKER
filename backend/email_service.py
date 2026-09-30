import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

def _configured() -> bool:
    load_dotenv(override=True)
    user = os.getenv("SMTP_USER", "")
    return bool(os.getenv("SMTP_HOST") and user and os.getenv("SMTP_PASS") and user != "your_smtp_user")

def _safe_print(*args, **kwargs):
    try:
        print(*args, **kwargs)
    except UnicodeEncodeError:
        import re
        clean = re.sub(r'[^\x00-\x7F]+', '?', ' '.join(str(a) for a in args))
        print(clean, **kwargs)


def send_email(to_email: str, subject: str, body: str, html: bool = False) -> dict:
    """Send an email. Mock-prints to terminal when SMTP is not configured."""
    if not _configured():
        _safe_print("\n" + "=" * 50)
        _safe_print(f"[MOCK EMAIL -> {to_email}]:")
        _safe_print(f"Subject: {subject}")
        _safe_print(body)
        _safe_print("=" * 50 + "\n")
        return {"status": "mock", "detail": "SMTP not configured — printed to terminal"}

    load_dotenv(override=True)
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587") or 587)
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "IronForge AI Gym <no-reply@ironforge.ai>")

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = smtp_from
        msg["To"] = to_email
        msg["Subject"] = subject
        # plain-text fallback always included
        msg.attach(MIMEText(body, "html" if html else "plain"))

        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, [to_email], msg.as_string())
        print(f"Real email sent successfully to {to_email}")
        return {"status": "sent"}
    except Exception as e:
        print(f"Error sending email: {e}")
        return {"status": "error", "detail": str(e)}
