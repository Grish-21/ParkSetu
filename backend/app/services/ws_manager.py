import asyncio
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.lot_connections: dict[int, set[WebSocket]] = defaultdict(set)
        self.user_connections: dict[int, set[WebSocket]] = defaultdict(set)
        self.loop: asyncio.AbstractEventLoop | None = None

    async def connect_lot(self, lot_id: int, websocket: WebSocket):
        await websocket.accept()
        self.lot_connections[lot_id].add(websocket)

    async def connect_user(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.user_connections[user_id].add(websocket)

    def disconnect_lot(self, lot_id: int, websocket: WebSocket):
        self.lot_connections[lot_id].discard(websocket)

    def disconnect_user(self, user_id: int, websocket: WebSocket):
        self.user_connections[user_id].discard(websocket)

    async def _send(self, sockets: set[WebSocket], payload: dict):
        for socket in list(sockets):
            try:
                await socket.send_json(payload)
            except Exception:
                sockets.discard(socket)

    async def broadcast(self, lot_id: int, payload: dict):
        await self._send(self.lot_connections[lot_id], payload)

    async def send_user(self, user_id: int, payload: dict):
        await self._send(self.user_connections[user_id], payload)

    def schedule_user(self, user_id: int, payload: dict):
        if self.loop and self.loop.is_running():
            asyncio.run_coroutine_threadsafe(self.send_user(user_id, payload), self.loop)


ws_manager = ConnectionManager()
