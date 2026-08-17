import logging
import json
from typing import Dict, List, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("medinsight.vitals_ws")

router = APIRouter(tags=["Real-Time Vitals Feed (WebSocket)"])


class VitalsConnectionManager:
    """Manages active WebSocket subscriptions scoped to patient_id and encounter_id."""

    def __init__(self):
        # Key: "patient_id:encounter_id" -> set of WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    def _get_key(self, patient_id: int, encounter_id: int | str) -> str:
        return f"{patient_id}:{encounter_id}"

    async def connect(self, websocket: WebSocket, patient_id: int, encounter_id: int | str):
        await websocket.accept()
        key = self._get_key(patient_id, encounter_id)
        if key not in self.active_connections:
            self.active_connections[key] = set()
        self.active_connections[key].add(websocket)
        logger.info(f"WebSocket client connected to vitals feed: {key} (Total: {len(self.active_connections[key])})")

    def disconnect(self, websocket: WebSocket, patient_id: int, encounter_id: int | str):
        key = self._get_key(patient_id, encounter_id)
        if key in self.active_connections:
            self.active_connections[key].discard(websocket)
            if not self.active_connections[key]:
                del self.active_connections[key]
        logger.info(f"WebSocket client disconnected from vitals feed: {key}")

    async def broadcast_observation(self, patient_id: int, encounter_id: int | str, observation: dict):
        key = self._get_key(patient_id, encounter_id)
        if key in self.active_connections:
            dead_connections = set()
            payload = json.dumps({
                "type": "OBSERVATION_RECORDED",
                "patient_id": patient_id,
                "encounter_id": encounter_id,
                "data": observation
            })
            for connection in self.active_connections[key]:
                try:
                    await connection.send_text(payload)
                except Exception as e:
                    logger.warning(f"Failed to send to WebSocket connection: {e}")
                    dead_connections.add(connection)
            for dead in dead_connections:
                self.disconnect(dead, patient_id, encounter_id)


vitals_ws_manager = VitalsConnectionManager()


@router.websocket("/ws/patients/{patient_id}/encounters/{encounter_id}/vitals")
async def vitals_websocket_endpoint(websocket: WebSocket, patient_id: int, encounter_id: str):
    await vitals_ws_manager.connect(websocket, patient_id, encounter_id)
    try:
        while True:
            # Keep connection alive and listen for client heartbeats/pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        vitals_ws_manager.disconnect(websocket, patient_id, encounter_id)
    except Exception as e:
        logger.warning(f"WebSocket error on feed {patient_id}:{encounter_id}: {e}")
        vitals_ws_manager.disconnect(websocket, patient_id, encounter_id)
