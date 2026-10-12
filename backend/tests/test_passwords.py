"""Run from backend: python -m unittest discover -s tests -v."""

import unittest

import bcrypt
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import hash_password, verify_password
from app.database import Base, get_db
from app.models import User
from app.routers import auth, users


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


class PasswordStorageTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)

        def test_db():
            with self.sessions() as session:
                yield session

        app = FastAPI()
        app.include_router(auth.router, prefix="/api")
        app.include_router(users.router, prefix="/api")
        app.dependency_overrides[get_db] = test_db
        self.client = TestClient(app)
        self.payload = {
            "email": "student@example.com", "password": "example-password",
            "full_name": "Test Student", "role": "field_inspector",
        }

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def test_registration_persists_only_hash_and_login_verifies_it(self):
        response = self.client.post("/api/auth/register", json=self.payload)
        self.assertEqual(response.status_code, 201, response.text)
        self.assertNotIn("hashed_pw", response.json())
        with self.sessions() as session:
            user = session.scalar(select(User))
            self.assertNotEqual(user.hashed_pw, self.payload["password"])
            self.assertTrue(verify_password(self.payload["password"], user.hashed_pw))
            user_id = user.id

        # A new request/session must verify the stored hash, not transient state.
        response = self.client.post("/api/auth/token", data={
            "username": self.payload["email"], "password": self.payload["password"],
        })
        self.assertEqual(response.status_code, 200, response.text)
        headers = {"Authorization": "Bearer " + response.json()["access_token"]}
        for endpoint in ("/api/auth/me", f"/api/users/{user_id}"):
            profile = self.client.get(endpoint, headers=headers)
            self.assertEqual(profile.status_code, 200, profile.text)
            self.assertNotIn("hashed_pw", profile.json())
            self.assertNotIn("password", profile.json())

        for password in ("wrong-password", "a" * 73):
            response = self.client.post("/api/auth/token", data={
                "username": self.payload["email"], "password": password,
            })
            self.assertEqual(response.status_code, 401)
        duplicate = self.client.post("/api/auth/register", json=self.payload)
        self.assertEqual(duplicate.status_code, 400)
        with self.sessions() as session:
            self.assertEqual(len(session.scalars(select(User)).all()), 1)

    def test_invalid_passwords_are_not_stored(self):
        for password in ("", "short", "a" * 73, "한" * 25):
            with self.subTest(password_length=len(password)):
                payload = dict(self.payload, password=password)
                response = self.client.post("/api/auth/register", json=payload)
                self.assertEqual(response.status_code, 422, response.text)
        with self.sessions() as session:
            self.assertIsNone(session.scalar(select(User)))

    def test_user_list_and_update_exclude_hashes(self):
        # Seed an admin directly; this test concerns response serialization.
        with self.sessions() as session:
            admin = User(
                email="admin@example.com", full_name="Admin", role="admin",
                hashed_pw=hash_password("admin-password"),
            )
            session.add(admin)
            session.commit()
            user_id = admin.id
        login = self.client.post("/api/auth/token", data={
            "username": "admin@example.com", "password": "admin-password",
        })
        self.assertEqual(login.status_code, 200, login.text)
        headers = {"Authorization": "Bearer " + login.json()["access_token"]}
        listed = self.client.get("/api/users/", headers=headers)
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertNotIn("hashed_pw", listed.json()[0])
        updated = self.client.patch(
            f"/api/users/{user_id}", headers=headers, json={"full_name": "New Name"},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["full_name"], "New Name")
        self.assertNotIn("hashed_pw", updated.json())


if __name__ == "__main__":
    unittest.main()
