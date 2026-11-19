"""Start PurchaseLens locally and open it when the server is ready."""
import threading
import time
import urllib.error
import urllib.request
import webbrowser

import uvicorn

URL = "http://127.0.0.1:8000"


def open_when_ready():
    for _ in range(60):
        try:
            with urllib.request.urlopen(URL + "/api/health", timeout=1) as response:
                if response.status == 200:
                    webbrowser.open(URL)
                    return
        except (urllib.error.URLError, TimeoutError, OSError):
            time.sleep(0.5)
    print("Browser could not open automatically. Visit " + URL)


if __name__ == "__main__":
    threading.Thread(target=open_when_ready, daemon=True).start()
    uvicorn.run("server:app", host="127.0.0.1", port=8000)
