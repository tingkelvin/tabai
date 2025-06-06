import requests

import time
from typing import List, Dict, Optional
from datetime import datetime
import threading
from functools import wraps

from app.utils.logger import get_logger

logger = get_logger(__name__)


# currently not used
class ProxyManager:
    def __init__(self, api_token: str, initial_fetch_country: Optional[str] = "US"):
        if not api_token:
            raise ValueError("API token cannot be empty.")

        self.api_token = api_token
        self.base_url = "https://proxy.webshare.io/api/v2/proxy/list/"
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        self._stop_event = threading.Event()
        self._proxy_list: List[Dict] = []
        self._last_update: Optional[datetime] = None
        self._lock = threading.Lock() # For thread safety

        # Perform an initial fetch to populate the list immediately
        if initial_fetch_country:
            logger.info(f"Performing initial proxy fetch for country: {initial_fetch_country}")
            self.fetch_proxies(country_code=initial_fetch_country)

    def _validate_token(self) -> bool:
        """Validate the API token by making a test request."""
        try:
            params = {
                "mode": "direct",
                "page": 1,
                "page_size": 1,
                "token": self.api_token # Add token to query params
            }
            response = requests.get(
                self.base_url,
                headers=self.headers,
                params=params,
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Token validation failed: {str(e)}")
            return False

    def fetch_proxies(self, country_code: str = "US") -> List[Dict]:
        """
        Fetch proxies from Webshare API filtered by country code.

        Args:
            country_code (str): Country code to filter proxies (default: "US")

        Returns:
            List[Dict]: List of proxy dictionaries
        """
        try:
            # Validate token before making the request
            if not self._validate_token():
                logger.error("Invalid API token")
                return []

            params = {
                "mode": "direct",
                "country_code__in": country_code,
                "page": 1,
                "page_size": 25 # You might want to increase this if you need more proxies
            }

            logger.debug(f"Fetching proxies from {self.base_url} with params: {params}")
            response = requests.get(
                self.base_url,
                headers=self.headers,
                params=params,
                timeout=10 # Add a timeout for network requests
            )
            response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

            data = response.json()
            fetched_proxies = data.get("results", [])

            with self._lock: # Protect shared state during update
                self._proxy_list = fetched_proxies
                print(self._proxy_list)
                self._last_update = datetime.now()

            logger.info(f"Successfully fetched {len(self._proxy_list)} proxies for {country_code}")
            return self._proxy_list

        except requests.exceptions.Timeout:
            logger.error(f"Timeout occurred while fetching proxies for {country_code}.")
            return []
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error fetching proxies for {country_code}: {e.response.status_code} - {e.response.text}")
            return []
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error fetching proxies for {country_code}: {e}")
            return []
        except requests.exceptions.RequestException as e:
            logger.error(f"Generic request error fetching proxies for {country_code}: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in fetch_proxies for {country_code}: {str(e)}", exc_info=True)
            return []

    def get_proxy_list(self) -> List[Dict]:
        """Get a copy of the current proxy list."""
        with self._lock: # Protect shared state during read
            return list(self._proxy_list) # Return a copy

    def get_last_update(self) -> Optional[datetime]:
        """Get the timestamp of the last successful update."""
        with self._lock: # Protect shared state during read
            return self._last_update

    def start_background_update(self, interval: int = 60, country_code: str = "US"):
        """
        Start background thread to update proxies periodically.

        Args:
            interval (int): Update interval in seconds (default: 60)
            country_code (str): Country code for proxies to fetch in background (default: "US")
        """
        def update_loop():
            # Initial fetch is done in __init__ now, so loop just sleeps and fetches
            while not self._stop_event.is_set():
                # Sleep first to avoid immediate double-fetch if __init__ also fetched
                time.sleep(interval)
                if not self._stop_event.is_set(): # Check again after sleep
                    self.fetch_proxies(country_code=country_code)

        if hasattr(self, '_update_thread') and self._update_thread.is_alive():
            logger.warning("Background update thread already running.")
            return

        self._stop_event.clear() # Ensure the event is clear before starting
        self._update_thread = threading.Thread(target=update_loop, daemon=True)
        self._update_thread.start()
        logger.info(f"Started background proxy update (interval: {interval}s, country: {country_code})")

    def stop_background_update(self):
        """Stop the background update thread."""
        self._stop_event.set()
        if hasattr(self, '_update_thread') and self._update_thread.is_alive():
            self._update_thread.join(timeout=5) # Add a timeout for join
            if self._update_thread.is_alive():
                logger.warning("Background update thread did not terminate gracefully.")
        logger.info("Stopped background proxy update.")

# Example usage:
if __name__ == "__main__":
    from app.utils.logger import setup_logging
    setup_logging()
    logger.info("Starting proxy manager")
    # Replace with your actual API token
    API_TOKEN = "your_api_token_here"
    
    proxy_manager = ProxyManager(API_TOKEN)
    
    # Start background updates
    proxy_manager.start_background_update()
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        proxy_manager.stop_background_update()
