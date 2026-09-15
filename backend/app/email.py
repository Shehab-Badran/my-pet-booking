import smtplib
import ssl
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.app.config import settings

logger = logging.getLogger("mypetcenter.email")

def is_smtp_configured() -> bool:
    """Check if SMTP credentials and host are fully configured."""
    return bool(
        settings.SMTP_HOST
        and str(settings.SMTP_HOST).strip()
        and settings.SMTP_FROM_EMAIL
        and str(settings.SMTP_FROM_EMAIL).strip()
    )

def send_password_reset_email(to_email: str, recipient_name: str, reset_token: str) -> bool:
    """
    Send a secure password reset email with a one-time link.
    Never exposes the raw token or credentials in logs.
    """
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    reset_url = f"{frontend_url}/#reset-password?token={reset_token}"

    if not is_smtp_configured():
        logger.warning(
            f"[EMAIL SERVICE] SMTP host not configured. Password reset email requested for: {to_email}. "
            "To enable live email delivery to customer inboxes, configure SMTP_HOST, SMTP_PORT, "
            "SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL, and FRONTEND_URL environment variables."
        )
        return False

    sender_name = settings.SMTP_FROM_NAME or "My Pet Center"
    sender_email = settings.SMTP_FROM_EMAIL.strip()
    from_header = f"{sender_name} <{sender_email}>"

    subject = "Reset Your My Pet Center Password"

    # Plain text version
    text_content = f"""Hello {recipient_name},

We received a request to reset your password for your My Pet Center account.

To choose a new password, click the link below (valid for 15 minutes):
{reset_url}

If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
My Pet Center Team
Sheikh Zayed City, Egypt
Phone: 01200888841
"""

    # HTML version
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password - My Pet Center</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #FAF8FC;
      color: #26132C;
      margin: 0;
      padding: 24px;
    }}
    .container {{
      max-width: 540px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 20px;
      border: 1px solid #E5D7EB;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(38, 19, 44, 0.06);
    }}
    .header {{
      background: linear-gradient(135deg, #26132C 0%, #492752 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }}
    .header h1 {{
      margin: 0;
      font-size: 24px;
      letter-spacing: -0.5px;
    }}
    .content {{
      padding: 32px 24px;
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
    }}
    .btn {{
      display: inline-block;
      background: linear-gradient(135deg, #784283 0%, #492752 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 800;
      font-size: 14px;
      padding: 14px 32px;
      border-radius: 12px;
      margin: 20px 0;
      text-align: center;
    }}
    .footer {{
      border-top: 1px solid #E5D7EB;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748B;
      background-color: #FAF8FC;
    }}
    .note {{
      background-color: #F6EAFB;
      border: 1px solid #E5D7EB;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 12px;
      color: #492752;
      margin-top: 20px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐾 My Pet Center</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #5EEAD4; font-weight: 600;">Premier Grooming & Pet Care</p>
    </div>
    <div class="content">
      <p>Hello <strong>{recipient_name}</strong>,</p>
      <p>We received a request to reset the password for your My Pet Center grooming account. Click the button below to set a new password:</p>
      <div style="text-align: center;">
        <a href="{reset_url}" class="btn" target="_blank">Reset My Password</a>
      </div>
      <div class="note">
        ⏱️ <strong>Security Notice:</strong> This reset link is single-use and will expire in <strong>15 minutes</strong>. If you did not make this request, you can safely ignore this email.
      </div>
      <p style="margin-top: 24px; font-size: 12px; color: #94A3B8; word-break: break-all;">
        If the button above does not work, copy and paste this link into your browser:<br>
        <a href="{reset_url}" style="color: #0D9488;">{reset_url}</a>
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 4px 0; font-weight: 700; color: #26132C;">My Pet Center — Sheikh Zayed</p>
      <p style="margin: 0; font-size: 11px;">الشيخ زايد – زايد 4 – Chill Out | 📞 01200888841</p>
    </div>
  </div>
</body>
</html>
"""

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = from_header
    message["To"] = to_email

    part1 = MIMEText(text_content, "plain", "utf-8")
    part2 = MIMEText(html_content, "html", "utf-8")
    message.attach(part1)
    message.attach(part2)

    try:
        smtp_port = int(settings.SMTP_PORT) if settings.SMTP_PORT else 587
        smtp_host = str(settings.SMTP_HOST).strip()

        if smtp_port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=15) as server:
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(str(settings.SMTP_USERNAME).strip(), str(settings.SMTP_PASSWORD).strip())
                server.sendmail(sender_email, [to_email], message.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.ehlo()
                try:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                    server.ehlo()
                except Exception as tls_err:
                    logger.debug(f"[EMAIL SERVICE] STARTTLS notice: {tls_err}")

                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(str(settings.SMTP_USERNAME).strip(), str(settings.SMTP_PASSWORD).strip())
                server.sendmail(sender_email, [to_email], message.as_string())

        logger.info(f"[EMAIL SERVICE] Successfully dispatched password reset email to: {to_email}")
        return True
    except Exception as e:
        # Safe logging of error reason without revealing passwords
        err_msg = str(e).replace(str(settings.SMTP_PASSWORD or ""), "******")
        logger.error(f"[EMAIL SERVICE ERROR] Failed to deliver password reset email to {to_email} via {settings.SMTP_HOST}: {type(e).__name__} ({err_msg})")
        return False
