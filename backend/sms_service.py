import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

def send_sms(to_phone_number: str, message: str):
    # If no Twilio keys are set, print a mock SMS to the terminal
    if not TWILIO_ACCOUNT_SID or TWILIO_ACCOUNT_SID == "your_twilio_sid":
        print("\n" + "="*50)
        print(f"📱 MOCK SMS SENT TO {to_phone_number}:")
        print(message)
        print("="*50 + "\n")
        return
        
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        msg = client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=to_phone_number
        )
        print(f"Real SMS sent successfully: {msg.sid}")
    except Exception as e:
        print(f"Error sending SMS via Twilio: {e}")
