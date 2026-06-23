import resend
import os
from dotenv import load_dotenv

load_dotenv()
resend.api_key = os.getenv("RESEND_API_KEY")

def send_email(to, summary):
    r = resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": [to],
        "subject": "New Video Summary",
        "html": f"<p>Here is the summary of the video you requested:</p><p>{summary}</p>"
    })
    return r