from pydantic import BaseModel


class summarize_request(BaseModel):
    channel_url: str
    style: str
    email: str