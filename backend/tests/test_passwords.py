"""
tests/test_passwords.py — Unit tests for password hashing and verification.
"""
import unittest
import bcrypt

from app.auth import hash_password, verify_password


class PasswordTests(unittest.TestCase):
    def test_hashes_are_salted_and_verifiable(self):
        first = hash_password("example-password")
        second = hash_password("example-password")
        self.assertNotEqual(first, second)
        self.assertTrue(first.startswith("$2b$12$"))
        self.assertTrue(bcrypt.checkpw(b"example-password", first.encode("ascii")))
        self.assertTrue(verify_password("example-password", first))
        self.assertFalse(verify_password("wrong-password", first))

    def test_byte_limit_and_bad_hashes(self):
        password = "a" * 72
        hashed = hash_password(password)
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password(password + "b", hashed))
        self.assertFalse(verify_password("password", "invalid-hash"))
        self.assertFalse(verify_password("password", "비밀번호"))
        self.assertFalse(verify_password("", hashed))
        for invalid in ("", "a" * 73, "한" * 25):
            with self.subTest(password_length=len(invalid)):
                with self.assertRaises(ValueError):
                    hash_password(invalid)


if __name__ == "__main__":
    unittest.main()
