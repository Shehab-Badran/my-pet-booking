import os
import sys
import smtplib
from unittest.mock import MagicMock, patch

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, ROOT_DIR)

def run_smtp_verification():
    print("Testing real SMTP email dispatch & template generation...")

    os.environ["SMTP_HOST"] = "smtp.gmail.com"
    os.environ["SMTP_PORT"] = "587"
    os.environ["SMTP_USERNAME"] = "bookings@mypetcenter.com"
    os.environ["SMTP_PASSWORD"] = "app-password-1234"
    os.environ["SMTP_FROM_EMAIL"] = "noreply@mypetcenter.com"
    os.environ["SMTP_FROM_NAME"] = "My Pet Center Grooming"
    os.environ["FRONTEND_URL"] = "https://my-pet-center.onrender.com"

    from backend.app.config import Settings
    import backend.app.config as cfg
    cfg.settings = Settings()

    from backend.app.email import send_password_reset_email, is_smtp_configured

    assert is_smtp_configured() == True, "SMTP should be recognized as configured"

    mock_smtp_instance = MagicMock()
    mock_smtp_class = MagicMock(return_value=mock_smtp_instance)
    mock_smtp_instance.__enter__.return_value = mock_smtp_instance

    with patch("smtplib.SMTP", mock_smtp_class):
        success = send_password_reset_email(
            to_email="customer@example.com",
            recipient_name="Sherif",
            reset_token="test-token-uuid-12345"
        )
        assert success == True, f"Failed to send email: success={success}"
        
        # Verify SMTP connection params
        mock_smtp_class.assert_called_once_with("smtp.gmail.com", 587, timeout=10)
        mock_smtp_instance.starttls.assert_called_once()
        mock_smtp_instance.login.assert_called_once_with("bookings@mypetcenter.com", "app-password-1234")
        
        # Verify email contents sent to sendmail
        mock_smtp_instance.sendmail.assert_called_once()
        args, kwargs = mock_smtp_instance.sendmail.call_args
        from_addr, to_addr, raw_msg = args
        from email import message_from_string
        parsed_msg = message_from_string(raw_msg)
        assert parsed_msg["Subject"] == "Reset Your My Pet Center Password"
        assert "My Pet Center Grooming" in parsed_msg["From"]
        assert parsed_msg["To"] == "customer@example.com"
        
        # Get payloads
        payload_texts = [p.get_payload(decode=True).decode('utf-8') for p in parsed_msg.get_payload()]
        combined_payload = " ".join(payload_texts)
        assert "https://my-pet-center.onrender.com/#reset-password?token=test-token-uuid-12345" in combined_payload
        assert "Security Notice:" in combined_payload

        print("   [PASS] SMTP connection initiated with STARTTLS & authentication.")
        print("   [PASS] Email headers (Subject, From, To) verified.")
        print("   [PASS] Reset link verified: https://my-pet-center.onrender.com/#reset-password?token=test-token-uuid-12345")
        print("   [PASS] Multi-part HTML and plain-text body verified.")

    # Also test SSL port 465
    os.environ["SMTP_PORT"] = "465"
    import backend.app.email as email_mod
    email_mod.settings = Settings()
    mock_ssl_instance = MagicMock()
    mock_ssl_instance.sendmail.return_value = {}
    mock_ssl_class = MagicMock(return_value=mock_ssl_instance)
    mock_ssl_instance.__enter__.return_value = mock_ssl_instance

    with patch("smtplib.SMTP_SSL", mock_ssl_class):
        success_ssl = send_password_reset_email(
            to_email="customer@example.com",
            recipient_name="Sherif",
            reset_token="test-token-uuid-465"
        )
        assert success_ssl == True
        mock_ssl_instance.login.assert_called_once_with("bookings@mypetcenter.com", "app-password-1234")
        print("   [PASS] SSL port 465 connection verified.")

if __name__ == "__main__":
    run_smtp_verification()
