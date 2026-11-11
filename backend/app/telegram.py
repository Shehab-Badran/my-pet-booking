import logging
import threading
import urllib.request
import urllib.parse
import json
from typing import Optional
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app import models
from backend.app.config import settings

logger = logging.getLogger("telegram_service")

def _get_telegram_config(db: Optional[Session] = None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        def get_val(key: str, default: str = "") -> str:
            rec = db.query(models.Setting).filter(models.Setting.key == key).first()
            return rec.value.strip() if rec and rec.value else default

        enabled_str = get_val("telegram_notifications_enabled", "false").lower()
        enabled = enabled_str in ["true", "1", "yes"]

        bot_token = get_val("telegram_bot_token", getattr(settings, "TELEGRAM_BOT_TOKEN", "") or "")
        chat_id = get_val("telegram_chat_id", getattr(settings, "TELEGRAM_CHAT_ID", "") or "")

        return enabled, bot_token, chat_id
    finally:
        if close_db:
            db.close()


def send_telegram_raw_message(bot_token: str, chat_id: str, text: str) -> bool:
    """Send message directly via Telegram Bot API using urllib (safe and zero extra dependency)."""
    if not bot_token or not chat_id or not text:
        return False

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            return response.status == 200
    except Exception as exc:
        logger.warning(f"Telegram notification dispatch error: {exc}")
        return False


def _async_send_worker(bot_token: str, chat_id: str, message: str):
    """Background worker with 1 retry on timeout."""
    success = send_telegram_raw_message(bot_token, chat_id, message)
    if not success:
        # Retry once after a brief pause
        import time
        time.sleep(2)
        send_telegram_raw_message(bot_token, chat_id, message)


def dispatch_telegram_notification(message: str, db: Optional[Session] = None):
    """
    Safely dispatch a Telegram notification in a background thread.
    Guarantees booking or API operations will NEVER fail or stall.
    """
    try:
        enabled, bot_token, chat_id = _get_telegram_config(db)
        if not enabled or not bot_token or not chat_id:
            return

        thread = threading.Thread(
            target=_async_send_worker,
            args=(bot_token, chat_id, message),
            daemon=True
        )
        thread.start()
    except Exception as exc:
        logger.warning(f"Failed to queue Telegram notification: {exc}")


def notify_new_booking(booking: models.Booking, db: Optional[Session] = None):
    """Format and send New Booking notification."""
    cust_name = booking.customer_name or (booking.user.name if booking.user else "Guest")
    cust_phone = booking.customer_phone or (booking.user.phone if booking.user else "—")
    date_str = booking.booking_date.strftime("%B %d, %Y")
    time_str = booking.start_time.strftime("%I:%M %p")
    source_str = (booking.booking_source or "website").capitalize()

    text = (
        f"<b>🐾 My Pet Center — New Booking</b>\n\n"
        f"<b>Booking ID:</b> <code>{booking.booking_id}</code>\n"
        f"<b>Customer:</b> {cust_name}\n"
        f"<b>Phone:</b> <code>{cust_phone}</code>\n"
        f"<b>Date:</b> {date_str}\n"
        f"<b>Time:</b> {time_str}\n"
        f"<b>Source:</b> {source_str}\n"
        f"<b>Status:</b> Confirmed"
    )
    if booking.special_notes:
        text += f"\n<b>Notes:</b> <i>{booking.special_notes}</i>"

    dispatch_telegram_notification(text, db)


def notify_booking_cancelled(booking: models.Booking, reason: Optional[str] = None, cancelled_by: Optional[str] = None, db: Optional[Session] = None):
    """Format and send Booking Cancelled notification."""
    cust_name = booking.customer_name or (booking.user.name if booking.user else "Guest")
    cust_phone = booking.customer_phone or (booking.user.phone if booking.user else "—")
    date_str = booking.booking_date.strftime("%B %d, %Y")
    time_str = booking.start_time.strftime("%I:%M %p")
    reason_str = reason or booking.cancellation_reason or "Customer request"

    text = (
        f"<b>❌ My Pet Center — Booking Cancelled</b>\n\n"
        f"<b>Booking ID:</b> <code>{booking.booking_id}</code>\n"
        f"<b>Customer:</b> {cust_name}\n"
        f"<b>Phone:</b> <code>{cust_phone}</code>\n"
        f"<b>Original Date:</b> {date_str} at {time_str}\n"
        f"<b>Reason:</b> {reason_str}\n"
        f"<b>Action By:</b> {cancelled_by or 'Staff'}"
    )
    dispatch_telegram_notification(text, db)


def notify_booking_rescheduled(booking: models.Booking, old_date_str: str, old_time_str: str, rescheduled_by: Optional[str] = None, db: Optional[Session] = None):
    """Format and send Booking Rescheduled notification."""
    cust_name = booking.customer_name or (booking.user.name if booking.user else "Guest")
    cust_phone = booking.customer_phone or (booking.user.phone if booking.user else "—")
    new_date_str = booking.booking_date.strftime("%B %d, %Y")
    new_time_str = booking.start_time.strftime("%I:%M %p")

    text = (
        f"<b>🔄 My Pet Center — Booking Rescheduled</b>\n\n"
        f"<b>Booking ID:</b> <code>{booking.booking_id}</code>\n"
        f"<b>Customer:</b> {cust_name}\n"
        f"<b>Phone:</b> <code>{cust_phone}</code>\n"
        f"<b>Previous:</b> {old_date_str} at {old_time_str}\n"
        f"<b>New Date:</b> {new_date_str}\n"
        f"<b>New Time:</b> {new_time_str}\n"
        f"<b>Updated By:</b> {rescheduled_by or 'Staff'}"
    )
    dispatch_telegram_notification(text, db)

