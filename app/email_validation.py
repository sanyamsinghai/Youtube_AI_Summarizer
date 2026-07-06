from email_validator import EmailNotValidError, validate_email


DISPOSABLE_EMAIL_DOMAINS = {
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    "temp-mail.org",
    "yopmail.com",
    "trashmail.com",
    "throwawaymail.com",
    "fakeinbox.com",
    "getnada.com",
    "mintemail.com",
    "moakt.com",
    "sharklasers.com",
    "maildrop.cc",
    "dispostable.com",
}


def is_disposable_email(domain):
    if not domain:
        return False

    domain = domain.lower().strip()
    return any(domain == disposable or domain.endswith(f".{disposable}") for disposable in DISPOSABLE_EMAIL_DOMAINS)


def validate_recipient_email(email):
    """
    Validate syntax, domain deliverability, and common disposable-email domains.
    Returns (is_valid, message).
    """
    try:
        normalized = validate_email(email, check_deliverability=True)
    except EmailNotValidError as exc:
        return False, str(exc)

    domain = normalized.domain
    if is_disposable_email(domain):
        return False, "Disposable or temporary email addresses are not allowed."

    return True, normalized.email