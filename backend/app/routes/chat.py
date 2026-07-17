import bootstrap  # noqa: F401

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq, RateLimitError
from dotenv import load_dotenv
import os

from backend.app.services.transcript_cache import transcript_cache

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    video_id: str
    message: str
    history: list[ChatMessage] = []


SYSTEM_PROMPT = """\
You are RECAP AI, a smart assistant embedded in a YouTube video summarizer app.
The user has just watched a video and read its summary. Your job is to answer
their follow-up questions helpfully and accurately.

Use the video transcript below as your primary source of truth.
You may also draw on your general knowledge to give fuller, more complete answers —
especially when the user asks for deeper explanations, examples, or context that
goes beyond what the video covered. Always be clear and concise.

VIDEO TRANSCRIPT:
{transcript}
"""


@router.post("/chat")
def chat(request: ChatRequest):
    transcript = transcript_cache.get(request.video_id)

    if not transcript:
        raise HTTPException(
            status_code=404,
            detail="Video session expired or not found. Please re-summarize the video first.",
        )

    system_prompt = SYSTEM_PROMPT.format(transcript=transcript[:12000])  # cap at ~12k chars

    messages = [{"role": "system", "content": system_prompt}]

    # Append conversation history (last 10 turns max to stay within context limits)
    for msg in request.history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    # Add the new user message
    messages.append({"role": "user", "content": request.message})

    try:
        response = client.chat.completions.create(
            model=model_name,
            temperature=0.5,
            messages=messages,
        )
        reply = response.choices[0].message.content
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Rate limit reached. Please wait a moment and try again.")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(exc)}")

    return {"reply": reply}
