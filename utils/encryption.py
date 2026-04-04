from jose import jwe,jwt
from utils.public_vars import PublicVars
from pwdlib import PasswordHash


class PasswordHashing:
    def __init__(self):
        self.pwdhash = PasswordHash.recommended()

    def hash(self, password: str):
        return self.pwdhash.hash(password)

    def verf(self, password: str, hashed: str):
        return self.pwdhash.verify(password,hashed)

class JWE_handle:
    def __init__(self):
        self.__signing_secret = PublicVars.JWE_encryption_key
        self.__encrypting_secret = self.__signing_secret.encode()[:32]
        self.exptime = 365

    def create_access_token(self, data: dict):
        to_sign = data.copy()
        signed_token = jwt.encode(to_sign, self.__signing_secret, algorithm="HS256")
        encrypted_token = jwe.encrypt(signed_token, self.__encrypting_secret, algorithm="dir")
        return encrypted_token.decode("utf-8")

    def verify_token(self, token: str):
        try:
            decrypted = jwe.decrypt(token, self.__encrypting_secret).decode("utf-8") # type: ignore
            payload = jwt.decode(decrypted, self.__signing_secret)
            return payload
        except:
            return False
