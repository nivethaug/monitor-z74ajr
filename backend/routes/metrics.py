import os
import httpx
from fastapi import APIRouter, Header, HTTPException

router = APIRouter()

LOGIN_TOKEN = os.getenv("LOGIN_TOKEN", "")
MAIN_VPS_URL = os.getenv("MAIN_VPS_URL", "")
WORKER_VPS_URL = os.getenv("WORKER_VPS_URL", "")
MAIN_VPS_TOKEN = os.getenv("MAIN_VPS_TOKEN", "")
WORKER_VPS_TOKEN = os.getenv("WORKER_VPS_TOKEN", "")


METRICS_PATH = "/admin/system-metrics"


async def _fetch_vps(url: str, token: str, timeout: float = 15.0):
    if not url:
        return {"error": "VPS URL not configured"}
    target = url.rstrip("/") + METRICS_PATH
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(target, headers=headers)
            if resp.status_code != 200:
                return {"error": f"Upstream returned {resp.status_code}"}
            try:
                return resp.json()
            except Exception:
                return {"error": "Invalid JSON from upstream"}
    except httpx.TimeoutException:
        return {"error": "Request timed out"}
    except Exception as e:
        return {"error": f"Fetch failed: {e}"}


@router.get("/metrics")
async def get_metrics(authorization: str | None = Header(default=None)):
    if not LOGIN_TOKEN:
        raise HTTPException(status_code=500, detail="LOGIN_TOKEN not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    if token != LOGIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")

    main = await _fetch_vps(MAIN_VPS_URL, MAIN_VPS_TOKEN)
    worker = await _fetch_vps(WORKER_VPS_URL, WORKER_VPS_TOKEN)

    return {"main": main, "worker": worker}
