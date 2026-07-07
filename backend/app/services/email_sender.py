import resend
import os
import html
from dotenv import load_dotenv
from resend.exceptions import ResendError

load_dotenv()
resend.api_key = os.getenv("RESEND_API_KEY")

def format_summary_html(summary, title=None, style=None):
        safe_summary = html.escape(summary or "")
        safe_title = html.escape(title or "New Video Summary")
        safe_style = html.escape(style or "")

        style_badge = f'<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:600;margin-left:8px;">{safe_style}</span>' if safe_style else ""

        bullet_items = []
        for line in (summary or "").splitlines():
            stripped_line = line.strip()
            if not stripped_line:
                continue
            if stripped_line.startswith("-"):
                stripped_line = stripped_line.lstrip("-• ").strip()
            bullet_items.append(f'<li style="margin:0 0 10px 0;">{html.escape(stripped_line)}</li>')

        if bullet_items:
            summary_block = f'<ul style="margin:0;padding-left:22px;font-size:15px;line-height:1.7;color:#111827;">{"".join(bullet_items)}</ul>'
        else:
            summary_block = f'<div style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;font-size:15px;line-height:1.7;">{safe_summary.replace("\n", "<br>")}</div>'

        return f"""
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:760px;margin:0 auto;padding:18px;background:linear-gradient(180deg,#f8fafc 0%,#ffffff 100%);">
            <div style="border:1px solid #e5e7eb;border-radius:18px;padding:28px;background:#ffffff;box-shadow:0 8px 30px rgba(15,23,42,0.06);">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
                    <h1 style="margin:0;font-size:26px;line-height:1.2;color:#0f172a;">{safe_title}</h1>
                    {style_badge}
                </div>
                <p style="margin:0 0 18px 0;color:#475569;font-size:14px;">Here is the summary of the video you requested:</p>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
                    {summary_block}
                </div>
            </div>
        </div>
        """


def send_email(to, summary, title=None, style=None):
    try:
        r = resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": [to],
            "subject": f"New Video Summary{f' - {title}' if title else ''}",
            "html": format_summary_html(summary, title=title, style=style)
        })
        return True, r
    except ResendError as exc:
        return False, str(exc)