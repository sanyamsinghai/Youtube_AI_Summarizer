import resend
import os
import html
import re
from dotenv import load_dotenv
from resend.exceptions import ResendError

load_dotenv()
resend.api_key = os.getenv("RESEND_API_KEY")

def format_summary_html(summary, title=None, style=None):
    safe_title = html.escape(title or "New Video Summary")
    safe_style = html.escape(style or "")

    # Style definitions for color themes
    style_colors = {
        "bullets": {"bg": "#eff6ff", "text": "#1d4ed8", "border": "#bfdbfe", "label": "Bullet Points"},
        "brief": {"bg": "#f0fdf4", "text": "#15803d", "border": "#bbf7d0", "label": "Executive Brief"},
        "student_notes": {"bg": "#faf5ff", "text": "#7e22ce", "border": "#e9d5ff", "label": "Student Notes"},
        "narrative": {"bg": "#fff7ed", "text": "#c2410c", "border": "#fed7aa", "label": "Narrative Recap"},
        "action_items": {"bg": "#fdf2f8", "text": "#be185d", "border": "#fbcfe8", "label": "Action Items"},
    }

    colors = style_colors.get(style, {"bg": "#f8fafc", "text": "#475569", "border": "#e2e8f0", "label": safe_style.title()})

    style_badge = f"""
    <span style="display:inline-block;padding:5px 12px;border-radius:999px;background-color:{colors['bg']};color:{colors['text']};border:1px solid {colors['border']};font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-top:4px;">
        {colors['label']}
    </span>
    """

    # Parse inline markdown: **bold** -> <strong>bold</strong>
    def parse_inline_html(text):
        escaped = html.escape(text)
        return re.sub(r'\*\*(.*?)\*\*', r'<strong style="color:#0f172a;">\1</strong>', escaped)

    lines = (summary or "").splitlines()
    rendered_blocks = []
    current_list_type = None  # None | "ul" | "ol"
    current_list_items = []

    def close_list():
        nonlocal current_list_type, current_list_items
        if not current_list_type:
            return ""
        items_html = "".join(current_list_items)
        if current_list_type == "ul":
            res = f'<ul style="margin:0 0 20px 0;padding-left:22px;color:#334155;font-size:15px;line-height:1.7;">{items_html}</ul>'
        else:
            res = f'<ol style="margin:0 0 20px 0;padding-left:22px;color:#334155;font-size:15px;line-height:1.7;">{items_html}</ol>'
        current_list_type = None
        current_list_items = []
        return res

    for line in lines:
        trimmed = line.strip()
        if not trimmed:
            if current_list_type:
                rendered_blocks.append(close_list())
            continue

        # Header 2: ## Header
        if trimmed.startswith("## "):
            if current_list_type:
                rendered_blocks.append(close_list())
            header_text = parse_inline_html(trimmed[3:])
            rendered_blocks.append(
                f'<h2 style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;'
                f'font-size:18px;font-weight:700;color:#0f172a;margin:28px 0 12px 0;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">'
                f'{header_text}</h2>'
            )
            continue

        # Header 3: ### Header
        if trimmed.startswith("### "):
            if current_list_type:
                rendered_blocks.append(close_list())
            header_text = parse_inline_html(trimmed[4:])
            rendered_blocks.append(
                f'<h3 style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;'
                f'font-size:15px;font-weight:700;color:#1e293b;margin:20px 0 8px 0;">'
                f'{header_text}</h3>'
            )
            continue

        # Bullet lists: * item or - item
        bullet_match = re.match(r'^[\*\-]\s+(.*)$', trimmed)
        if bullet_match:
            if current_list_type != "ul":
                if current_list_type:
                    rendered_blocks.append(close_list())
                current_list_type = "ul"
            item_text = parse_inline_html(bullet_match.group(1))
            current_list_items.append(f'<li style="margin-bottom:8px;line-height:1.6;">{item_text}</li>')
            continue

        # Numbered lists: 1. item
        num_match = re.match(r'^(\d+)\.\s+(.*)$', trimmed)
        if num_match:
            if current_list_type != "ol":
                if current_list_type:
                    rendered_blocks.append(close_list())
                current_list_type = "ol"
            item_text = parse_inline_html(num_match.group(2))
            current_list_items.append(f'<li style="margin-bottom:8px;line-height:1.6;">{item_text}</li>')
            continue

        # Normal paragraph
        if current_list_type:
            rendered_blocks.append(close_list())
        para_text = parse_inline_html(trimmed)
        rendered_blocks.append(f'<p style="margin:0 0 12px 0;color:#334155;font-size:15px;line-height:1.6;">{para_text}</p>')

    if current_list_type:
        rendered_blocks.append(close_list())

    summary_html_content = "".join(rendered_blocks)

    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f1f5f9;padding:40px 20px;margin:0;">
        <div style="max-width:640px;margin:0 auto;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(15,23,42,0.05);overflow:hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; color: #ffffff;">
                <div style="margin-bottom: 12px;">{style_badge}</div>
                <h1 style="margin:0;font-size:24px;font-weight:800;line-height:1.3;letter-spacing:-0.02em;color:#ffffff;">{safe_title}</h1>
                <p style="margin:8px 0 0 0;font-size:13px;color:#94a3b8;font-weight:400;">YouTube Video AI Summary Report</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 32px; background-color: #ffffff;">
                <div style="margin-bottom: 24px; font-size:14px; color:#64748b; font-style:italic;">
                    Here is the summary you requested:
                </div>
                
                <div style="color: #334155;">
                    {summary_html_content}
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                    This summary was generated automatically by <strong>YouTube AI Summarizer</strong>.<br/>
                    Please do not reply directly to this email.
                </p>
            </div>
        </div>
    </div>
    """

def send_email(to, summary, title=None, style=None):
    try:
        r = resend.Emails.send({
            "from": os.getenv("RESEND_FROM_EMAIL"),
            "to": [to],
            "subject": f"New Video Summary{f' - {title}' if title else ''}",
            "html": format_summary_html(summary, title=title, style=style)
        })
        return True, r
    except ResendError as exc:
        return False, str(exc)
