"""
Email delivery service for Hupkeep.

Development mode (MAIL_CONSOLE_MODE=True, the default):
    Emails are NOT sent via SMTP. Instead, the full email content is printed
    to the server console (stdout). This lets you see verification links and
    reset links during local development without any SMTP configuration.

Production mode (MAIL_CONSOLE_MODE=False):
    Emails are sent through the Resend HTTP API using RESEND_API_KEY.

The functions in this module are async so they can be awaited directly from
async FastAPI route handlers without blocking the event loop.
"""

import logging
import re

import resend

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _deliver(to: str, subject: str, html_body: str) -> None:
    if settings.MAIL_CONSOLE_MODE:
        plain = re.sub(r"<[^>]+>", " ", html_body)
        plain = re.sub(r"\s+", " ", plain).strip()
        logger.info(
            "\n%s\n[EMAIL] To: %s\n[EMAIL] Subject: %s\n[EMAIL] Body (plain): %s\n%s",
            "=" * 70,
            to,
            subject,
            plain,
            "=" * 70,
        )
        return

    if not settings.RESEND_API_KEY:
        raise RuntimeError(
            "RESEND_API_KEY must be configured when MAIL_CONSOLE_MODE is false"
        )

    resend.api_key = settings.RESEND_API_KEY

    params: resend.Emails.SendParams = {
        "from": f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>",
        "to": [to],
        "subject": subject,
        "html": html_body,
    }

    try:
        await resend.Emails.send_async(params)
    except Exception:
        logger.exception("Failed to send email via Resend to %s", to)
        raise


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def send_verification_email(to_email: str, raw_token: str) -> None:
    """
    Send (or log) an email asking the user to verify their email address.

    The verification link directs the user to the React app which then calls
    POST /auth/verify-email with the token.  The frontend URL is taken from
    FRONTEND_URL in settings.
    """
    verify_link = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}"
    subject = "Verify your Hupkeep email address"
    html_body = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Verify your email</title></head>
    <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 40px;">
      <div style="max-width: 520px; margin: 0 auto; background: #fff;
                  border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,.08);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Welcome to Hupkeep 🏠</h2>
        <p style="color: #444; line-height: 1.6;">
          Thanks for signing up! Please verify your email address to activate
          your account.
        </p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="{verify_link}"
             style="background: #4f46e5; color: #fff; text-decoration: none;
                    padding: 14px 28px; border-radius: 6px; font-weight: bold;
                    display: inline-block;">
            Verify Email Address
          </a>
        </p>
        <p style="color: #888; font-size: 13px;">
          This link expires in 24 hours. If you didn't create an account,
          you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          Hupkeep · Keep your home maintenance organized.
        </p>
      </div>
    </body>
    </html>
    """
    await _deliver(to_email, subject, html_body)


async def send_password_reset_email(to_email: str, raw_token: str) -> None:
    """
    Send (or log) a password reset email.

    The reset link directs the user to the React app which then calls
    POST /auth/password-reset/confirm with the token and new password.
    Tokens expire after PASSWORD_RESET_TOKEN_EXPIRE_HOURS (default 2 hours).
    """
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
    subject = "Reset your Hupkeep password"
    html_body = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Reset your password</title></head>
    <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 40px;">
      <div style="max-width: 520px; margin: 0 auto; background: #fff;
                  border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,.08);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #444; line-height: 1.6;">
          We received a request to reset the password for your Hupkeep
          account. Click below to choose a new password.
        </p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="{reset_link}"
             style="background: #4f46e5; color: #fff; text-decoration: none;
                    padding: 14px 28px; border-radius: 6px; font-weight: bold;
                    display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #888; font-size: 13px;">
          This link expires in 2 hours. If you didn't request a password reset,
          please ignore this email — your password will not change.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          Hupkeep · Keep your home maintenance organized.
        </p>
      </div>
    </body>
    </html>
    """
    await _deliver(to_email, subject, html_body)
