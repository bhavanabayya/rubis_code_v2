"""
Notifications routes
Bell notifications for candidate and recruiter dashboards
"""

import json
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.models import Notification, User
from app.security import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _get_user(session: Session, current_user: dict) -> User:
    user = session.exec(select(User).where(User.email == (current_user.get("email") or current_user.get("sub")))).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("")
def get_notifications(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
    unread_only: bool = False,
    limit: int = 50,
):
    user = _get_user(session, current_user)
    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc()).limit(limit)
    notifications = session.exec(query).all()

    result = []
    for n in notifications:
        payload = None
        if n.payload_json:
            try:
                payload = json.loads(n.payload_json)
            except Exception:
                payload = None
        result.append({
            "id": n.id,
            "event_type": n.event_type,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "payload": payload,
        })
    return result


@router.get("/unread-count")
def get_unread_count(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user = _get_user(session, current_user)
    unread = session.exec(
        select(Notification).where(Notification.user_id == user.id, Notification.is_read == False)
    ).all()
    return {"unread_count": len(unread)}


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user = _get_user(session, current_user)
    notification = session.get(Notification, notification_id)
    if not notification or notification.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    session.add(notification)
    session.commit()
    return {"ok": True}


@router.post("/read-all")
def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user = _get_user(session, current_user)
    items = session.exec(
        select(Notification).where(Notification.user_id == user.id, Notification.is_read == False)
    ).all()
    for item in items:
        item.is_read = True
        session.add(item)
    session.commit()
    return {"ok": True, "updated": len(items)}
