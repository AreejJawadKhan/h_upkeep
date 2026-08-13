from slowapi import Limiter
from slowapi.util import get_remote_address

# Single Limiter instance shared across the entire application.
# key_func=get_remote_address buckets requests by the client IP.
# Import this instance in any router file that needs rate limiting.
limiter = Limiter(key_func=get_remote_address)
