from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.auth import user_id_from_token
from app.db import SessionLocal
from app.models import Lot, User
from app.services.ws_manager import ws_manager

router = APIRouter(tags=["websockets"])


@router.websocket("/ws/lots/{lot_id}")
async def lot_socket(websocket: WebSocket, lot_id: int):
    with SessionLocal() as db:
        if db.get(Lot, lot_id) is None:
            await websocket.close(code=4404)
            return
    await ws_manager.connect_lot(lot_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_lot(lot_id, websocket)


@router.websocket("/ws/me")
async def user_socket(websocket: WebSocket, token: str):
    try:
        user_id = user_id_from_token(token)
    except Exception:
        await websocket.close(code=4401)
        return
    with SessionLocal() as db:
        if db.scalar(select(User.id).where(User.id == user_id)) is None:
            await websocket.close(code=4401)
            return
    await ws_manager.connect_user(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_user(user_id, websocket)
