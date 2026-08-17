import bcrypt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # Check against bcrypt hash
        if isinstance(hashed_password, str):
            hashed_bytes = hashed_password.encode('utf-8')
        else:
            hashed_bytes = hashed_password

        # Truncate password to 72 bytes to satisfy bcrypt requirement
        plain_bytes = plain_password.encode('utf-8')[:72]
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    # Truncate password to 72 bytes to satisfy bcrypt requirement
    plain_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_bytes, salt).decode('utf-8')
