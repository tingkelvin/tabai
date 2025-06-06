import jwt
from datetime import datetime, timezone, timedelta
import os

import dotenv

# Load environment variables from .env file
dotenv.load_dotenv()

# --- Configuration (MUST match your app/core/config.py and .env) ---
# It's crucial that this secret key is the SAME as the one used by your FastAPI app
# For testing, you can temporarily hardcode it or load it from a test .env
# APP_SECRET_KEY = os.getenv("APP_SECRET_KEY", "YOUR_SUPER_SECRET_KEY_FOR_JWT") # Replace with your actual key or load from .env
APP_SECRET_KEY="kflsngsfd;nrpobjnsfjg;q1284784^5620^^)12v"
print(APP_SECRET_KEY)

# --- Token Payload Data ---
# This is the data that will be "inside" your fake token.
# Adjust these values as needed for your test scenarios.
TEST_USER_ID = "test_google_id_12345"
TEST_USER_EMAIL = "test.user@example.com"
TEST_USER_NAME = "Test User"

# --- Token Expiration ---
# Set a reasonable expiration time for your test token (e.g., 1 hour from now)
# Ensure it's in UTC, consistent with your application's token creation.
EXPIRATION_HOURS = 100
expiration_time = datetime.now(timezone.utc) + timedelta(hours=EXPIRATION_HOURS)

# --- Create the Payload ---
# This dictionary will be encoded into the JWT.
# It should mimic the structure your app's Security class uses.
payload = {
    "user_id": TEST_USER_ID,
    "email": TEST_USER_EMAIL,
    "name": TEST_USER_NAME,
    "exp": expiration_time,
    "iat": datetime.utcnow(), # Issued At time
}

# --- Encode the Token ---
# Use the same algorithm ("HS256") as your application.
try:
    fake_token = jwt.encode(payload, APP_SECRET_KEY, algorithm="HS256")
    print(f"Successfully generated fake JWT token for user: {TEST_USER_EMAIL}")
    print("\n--- YOUR FAKE JWT TOKEN ---")
    print(fake_token)
    print("---------------------------")
    print(f"\nToken will expire at: {expiration_time.isoformat()}")

    # Optional: Decode to verify (for debugging purposes)
    print("\n--- Decoded Payload (for verification) ---")
    decoded_payload = jwt.decode(fake_token, APP_SECRET_KEY, algorithms=["HS256"])
    print(decoded_payload)
    print("------------------------------------------")

except Exception as e:
    print(f"An error occurred while generating the token: {e}")
    print("Please ensure your APP_SECRET_KEY is correctly set.")