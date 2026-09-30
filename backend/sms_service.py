import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

def _safe_print(*args, **kwargs):
    try:
        print(*args, **kwargs)
    except UnicodeEncodeError:
        import re
        clean = re.sub(r'[^\x00-\x7F]+', '?', ' '.join(str(a) for a in args))
        print(clean, **kwargs)

def send_sms(to_phone_number: str, message: str):
    load_dotenv(override=True)
    TWILIO_ACCOUNT_SID = (os.getenv("TWILIO_ACCOUNT_SID") or "").strip()
    TWILIO_AUTH_TOKEN = (os.getenv("TWILIO_AUTH_TOKEN") or "").strip()
    TWILIO_PHONE_NUMBER = (os.getenv("TWILIO_PHONE_NUMBER") or "").strip()

    # If no Twilio keys are set, print a mock SMS to the terminal
    if not TWILIO_ACCOUNT_SID or TWILIO_ACCOUNT_SID == "your_twilio_sid":
        _safe_print("\n" + "="*50)
        _safe_print(f"[MOCK SMS -> {to_phone_number}]:")
        _safe_print(message)
        _safe_print("="*50 + "\n")
        return
        
    try:
        # Sanitize to E.164 format. Default to +91 if no country code provided.
        clean_phone = to_phone_number.strip()
        if not clean_phone.startswith('+'):
            if clean_phone.startswith('0'):
                clean_phone = '+91' + clean_phone[1:]
            else:
                clean_phone = '+91' + clean_phone
                
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        msg = client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=clean_phone
        )
        print(f"Real SMS sent successfully: {msg.sid}")
    except Exception as e:
        print(f"Error sending SMS via Twilio: {e}")
        raise e
