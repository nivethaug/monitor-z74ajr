"""
Terminal WebSocket proxy routes.
Proxies terminal commands to external SSH gateway using environment tokens.
"""
import os
import json
import asyncio
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from pydantic import BaseModel
import websockets

router = APIRouter(prefix="/api/terminal", tags=["Terminal"])

# Environment tokens for VPS access
MAIN_VPS_TOKEN = os.getenv("MAIN_VPS_TOKEN", "")
WORKER_VPS_TOKEN = os.getenv("WORKER_VPS_TOKEN", "")
MAIN_VPS_URL = os.getenv("MAIN_VPS_URL", "https://api.dreamagent.cloud")
WORKER_VPS_URL = os.getenv("WORKER_VPS_URL", "http://187.55.225.39:8003")

# Token mapping
VPS_TOKENS = {
    "main": MAIN_VPS_TOKEN,
    "worker": WORKER_VPS_TOKEN,
}
VPS_URLS = {
    "main": MAIN_VPS_URL,
    "worker": WORKER_VPS_URL,
}


class ExecRequest(BaseModel):
    command: str
    host: str = "main"


class ExecResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: int


@router.post("/exec", response_model=ExecResponse)
async def execute_command(request: ExecRequest):
    """
    Execute a single command and return the result.
    Non-streaming alternative for quick commands.
    """
    host = request.host.lower()
    if host not in VPS_TOKENS:
        raise HTTPException(status_code=400, detail=f"Invalid host: {host}. Use 'main' or 'worker'.")

    token = VPS_TOKENS[host]
    if not token:
        raise HTTPException(status_code=503, detail=f"No token configured for host: {host}")

    base_url = VPS_URLS[host]
    # Convert http(s):// to ws(s):// for WebSocket connection
    ws_base = base_url.replace("https://", "wss://").replace("http://", "ws://")
    ws_url = f"{ws_base}/ws/terminal/{host}?token={token}"

    start_time = datetime.now()
    stdout_lines = []
    stderr_lines = []
    exit_code = 0

    try:
        async with websockets.connect(ws_url, ping_interval=30, ping_timeout=10) as ws:
            # Send the command
            await ws.send(json.dumps({"command": request.command}))

            # Collect all output
            while True:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=60.0)
                    data = json.loads(msg)

                    if data.get("type") == "stdout":
                        stdout_lines.append(data.get("data", ""))
                    elif data.get("type") == "stderr":
                        stderr_lines.append(data.get("data", ""))
                    elif data.get("type") == "exit":
                        exit_code = data.get("code", 0)
                        break
                    elif data.get("type") == "killed":
                        exit_code = -1
                        break
                except asyncio.TimeoutError:
                    break

    except Exception as e:
        stderr_lines.append(f"Connection error: {str(e)}")
        exit_code = 1

    duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

    return ExecResponse(
        stdout="".join(stdout_lines),
        stderr="".join(stderr_lines),
        exit_code=exit_code,
        duration_ms=duration_ms
    )


@router.websocket("/ws/{host}")
async def terminal_websocket(websocket: WebSocket, host: str):
    """
    WebSocket endpoint for streaming terminal output.
    Frontend connects here, and we proxy to the external SSH gateway.
    """
    await websocket.accept()

    host = host.lower()
    if host not in VPS_TOKENS:
        await websocket.send_json({"type": "error", "message": f"Invalid host: {host}"})
        await websocket.close()
        return

    token = VPS_TOKENS[host]
    if not token:
        await websocket.send_json({"type": "error", "message": f"No token configured for host: {host}"})
        await websocket.close()
        return

    base_url = VPS_URLS[host]
    # Convert http(s):// to ws(s):// for WebSocket connection
    ws_base = base_url.replace("https://", "wss://").replace("http://", "ws://")
    ws_url = f"{ws_base}/ws/terminal/{host}?token={token}"

    external_ws = None
    reconnect_attempts = 0
    max_reconnects = 3

    try:
        while True:
            try:
                # Connect to external terminal gateway
                external_ws = await websockets.connect(
                    ws_url,
                    ping_interval=30,
                    ping_timeout=10,
                    close_timeout=5
                )

                reconnect_attempts = 0
                await websocket.send_json({"type": "connected", "host": host})

                # Create tasks for bidirectional communication
                async def forward_to_external():
                    """Forward messages from frontend to external gateway."""
                    try:
                        while True:
                            data = await websocket.receive_text()
                            msg = json.loads(data)

                            if "command" in msg:
                                await external_ws.send(json.dumps({"command": msg["command"]}))
                            elif msg.get("action") == "ctrl_c":
                                await external_ws.send(json.dumps({"action": "ctrl_c"}))
                    except WebSocketDisconnect:
                        pass
                    except Exception:
                        pass

                async def forward_from_external():
                    """Forward messages from external gateway to frontend."""
                    try:
                        while True:
                            msg = await external_ws.recv()
                            data = json.loads(msg)

                            # Pass through all message types
                            await websocket.send_json(data)
                    except websockets.ConnectionClosed:
                        await websocket.send_json({"type": "disconnected", "reason": "connection_lost"})
                    except Exception as e:
                        await websocket.send_json({"type": "error", "message": str(e)})

                # Run both tasks
                await asyncio.gather(
                    forward_to_external(),
                    forward_from_external()
                )

            except websockets.ConnectionClosed:
                reconnect_attempts += 1
                if reconnect_attempts >= max_reconnects:
                    await websocket.send_json({"type": "error", "message": "Max reconnection attempts reached"})
                    break

                await websocket.send_json({"type": "reconnecting", "attempt": reconnect_attempts})
                await asyncio.sleep(2)

            except Exception as e:
                await websocket.send_json({"type": "error", "message": str(e)})
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        if external_ws:
            try:
                await external_ws.close()
            except:
                pass
        try:
            await websocket.close()
        except:
            pass
