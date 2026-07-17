import time
from fastapi import HTTPException, Request

class TokenBucketLimiter:
    """
    A lightweight, in-memory Token Bucket rate limiter.
    Does not require Redis or extra third-party libraries.
    """
    def __init__(self, rate: float, capacity: int):
        self.rate = rate          # Tokens added per second (e.g. 0.1 = 1 token per 10 seconds)
        self.capacity = capacity  # Maximum tokens the bucket can hold (burst capacity)
        self.buckets = {}         # client_ip -> [tokens, last_update_time]

    def _replenish_and_get(self, ip: str) -> list[float]:
        now = time.time()
        if ip not in self.buckets:
            return [float(self.capacity), now]

        tokens, last_update = self.buckets[ip]
        elapsed = now - last_update
        
        # Add new tokens based on elapsed time
        new_tokens = tokens + (elapsed * self.rate)
        
        # If bucket is fully replenished back to max capacity, evict the entry to prevent memory creep
        if new_tokens >= self.capacity:
            del self.buckets[ip]
            return [float(self.capacity), now]
            
        return [new_tokens, now]

    def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "127.0.0.1"
        tokens, now = self._replenish_and_get(client_ip)

        if tokens < 1.0:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please wait a moment before making another request."
            )

        # Consume 1 token
        self.buckets[client_ip] = [tokens - 1.0, now]


# Summarization: 1 request per 15 seconds, max burst of 2 (prevents spamming Groq/YouTube)
summarize_limiter = TokenBucketLimiter(rate=1.0 / 15.0, capacity=2)

# Chatbot: 1 request per 3 seconds, max burst of 5 (allows natural conversation back-and-forth)
chat_limiter = TokenBucketLimiter(rate=1.0 / 3.0, capacity=5)

# Email sending: 1 request per 20 seconds, max burst of 2 (prevents inbox spamming via Resend)
email_limiter = TokenBucketLimiter(rate=1.0 / 20.0, capacity=2)
