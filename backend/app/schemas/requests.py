from pydantic import BaseModel, EmailStr


class SummarizeVideoRequest(BaseModel):
    url: str
    style: str


class SendEmailRequest(BaseModel):
    video_id: str | None = None
    title: str | None = None
    summary: str
    style: str | None = None
    email: EmailStr


# Backwards-compatible (older channel-based flow)
class summarize_request(BaseModel):
    channel_url: str
    style: str
    email: EmailStr


class SubscribeChannelRequest(BaseModel):
    channel_url: str