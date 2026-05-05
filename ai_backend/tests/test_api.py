from __future__ import annotations

import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.clients.groq_client import get_groq_client
from app.clients.sqlite_store import SQLiteStore, get_sqlite_store
from app.clients.supabase_rest import SupabaseAPIError
from app.main import app
from app.routes.recommend import get_supabase_client
from app.schemas.analyze import LLMAnalysisPayload


class UnconfiguredGroqClient:
    is_configured = False

    def analyze_support_text(self, text, profile=None):  # pragma: no cover - defensive
        raise RuntimeError("Should not be called when unconfigured")


class ConfiguredGroqClient:
    is_configured = True

    def analyze_support_text(self, text, profile=None):
        return LLMAnalysisPayload(
            detected_language="en",
            motherhood_stage="postpartum",
            support_types=["emotional"],
            interaction_preferences=["online"],
            risk_level="low",
            keywords=["overwhelmed"],
            summary="Structured analysis for testing.",
        )

    def generate_support_reply(self, *, messages, profile=None, analysis=None):
        return "You do not have to carry this alone. A gentle next step is to speak with a trusted person and check the support directory."

    def translate_text(self, *, text, source_language, target_language):
        return f"[{target_language}] {text}"


class APITestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = Path(tempfile.mkdtemp())
        cls.store = SQLiteStore(cls.temp_dir / "test_ai.db")
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.store = None

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_analyze_input_persists_and_flags_crisis(self):
        app.dependency_overrides[get_sqlite_store] = lambda: self.store
        app.dependency_overrides[get_groq_client] = lambda: UnconfiguredGroqClient()

        response = self.client.post(
            "/analyze/input",
            json={
                "text": "I want to hurt myself and I do not feel safe.",
                "profile": {"preferred_language": "en"},
                "persist": True,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["risk_level"], "urgent")
        self.assertTrue(payload["requires_crisis_action"])
        self.assertTrue(payload["saved"])
        self.assertIn("Immediate support may be needed", payload["crisis_guidance"])

    def test_analyze_input_adds_workflow_keywords_for_text_input(self):
        app.dependency_overrides[get_sqlite_store] = lambda: self.store
        app.dependency_overrides[get_groq_client] = lambda: UnconfiguredGroqClient()

        response = self.client.post(
            "/analyze/input",
            json={
                "text": "I want Sheffield social media support through Facebook.",
                "profile": {"preferred_language": "en"},
                "persist": False,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("workflow:sheffield:social:facebook", payload["keywords"])

    def test_recommend_services_returns_ranked_items(self):
        app.dependency_overrides[get_sqlite_store] = lambda: self.store

        response = self.client.post(
            "/recommend/services",
            json={
                "profile": {
                    "motherhood_stage": "postpartum",
                    "support_types": ["emotional", "peer"],
                    "interaction_preferences": ["online"],
                    "preferred_language": "en",
                    "risk_level": "low",
                    "keywords": [],
                },
                "limit": 3,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["items"]), 1)
        self.assertIsNotNone(payload["items"][0]["recommendation_reason"])

    def test_recommend_services_allows_admin_directory_without_profile(self):
        app.dependency_overrides[get_sqlite_store] = lambda: self.store

        response = self.client.post("/recommend/services", json={"limit": 50})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["items"]), 1)

    def test_recommend_services_prefers_sheffield_branch_when_keywords_request_it(self):
        app.dependency_overrides[get_sqlite_store] = lambda: self.store

        response = self.client.post(
            "/recommend/services",
            json={
                "profile": {
                    "interaction_preferences": ["phone"],
                    "preferred_language": "en",
                    "risk_level": "low",
                    "keywords": ["sheffield", "phone"],
                },
                "limit": 5,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["items"]), 1)
        self.assertEqual(payload["items"][0]["location"], "Sheffield")

    def test_recommend_services_prefers_uk_branch_when_keywords_request_it(self):
        app.dependency_overrides[get_sqlite_store] = lambda: self.store

        response = self.client.post(
            "/recommend/services",
            json={
                "profile": {
                    "interaction_preferences": ["online"],
                    "preferred_language": "en",
                    "risk_level": "low",
                    "keywords": ["uk", "nationwide", "online"],
                },
                "limit": 5,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["items"]), 1)
        self.assertEqual(payload["items"][0]["location"], "National")

    def test_recommend_services_follows_sheffield_social_facebook_workflow(self):
        app.dependency_overrides[get_sqlite_store] = lambda: self.store

        response = self.client.post(
            "/recommend/services",
            json={
                "profile": {
                    "interaction_preferences": ["social"],
                    "preferred_language": "en",
                    "risk_level": "low",
                    "keywords": ["sheffield", "social", "workflow:sheffield:social:facebook"],
                },
                "limit": 5,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            [item["id"] for item in payload["items"][:2]],
            ["service-mat-exp", "service-birth-trauma-association-peer-support"],
        )
        self.assertTrue(all(item["is_recommended"] for item in payload["items"][:2]))

    def test_recommend_services_follows_uk_online_workflow(self):
        app.dependency_overrides[get_sqlite_store] = lambda: self.store

        response = self.client.post(
            "/recommend/services",
            json={
                "profile": {
                    "interaction_preferences": ["online"],
                    "preferred_language": "en",
                    "risk_level": "low",
                    "keywords": ["uk", "nationwide", "online", "workflow:uk:online"],
                },
                "limit": 5,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            [item["id"] for item in payload["items"][:2]],
            ["service-mind-uk", "service-right-decisions-maternal-health-tool-kit"],
        )

    def test_recommend_events_falls_back_to_local_store(self):
        app.dependency_overrides[get_sqlite_store] = lambda: self.store

        with patch("app.routes.recommend.get_supabase_client", side_effect=SupabaseAPIError("offline")):
            response = self.client.post(
                "/recommend/events",
                json={
                    "profile": {
                        "support_types": ["peer"],
                        "interaction_preferences": ["online"],
                        "preferred_language": "en",
                        "risk_level": "low",
                        "keywords": [],
                    },
                    "limit": 2,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["items"]), 1)

    def test_chat_returns_groq_backed_reply_for_low_risk_message(self):
        app.dependency_overrides[get_groq_client] = lambda: ConfiguredGroqClient()

        response = self.client.post(
            "/chat",
            json={
                "messages": [
                    {"role": "user", "content": "I feel overwhelmed after birth and need someone to talk to."},
                ],
                "profile": {"preferred_language": "en"},
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["risk_level"], "low")
        self.assertFalse(payload["used_fallback"])
        self.assertIn("gentle next step", payload["message"]["content"])

    def test_chat_keeps_safety_lock_when_recent_message_was_urgent(self):
        app.dependency_overrides[get_groq_client] = lambda: UnconfiguredGroqClient()

        response = self.client.post(
            "/chat",
            json={
                "messages": [
                    {"role": "user", "content": "I want to hurt myself and I do not feel safe."},
                    {"role": "assistant", "content": "Safety first."},
                    {"role": "user", "content": "Okay."},
                ],
                "profile": {"preferred_language": "en"},
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["risk_level"], "urgent")
        self.assertTrue(payload["used_fallback"])
        self.assertIn("urgent support", payload["message"]["content"].lower())

    def test_translate_uses_cache_after_first_translation(self):
        app.dependency_overrides[get_sqlite_store] = lambda: self.store
        app.dependency_overrides[get_groq_client] = lambda: ConfiguredGroqClient()

        request_payload = {
            "items": [
                {
                    "key": "service-a",
                    "text": "Support for mothers after birth.",
                    "source_language": "en",
                }
            ],
            "target_language": "ur",
        }

        first_response = self.client.post("/translate", json=request_payload)
        second_response = self.client.post("/translate", json=request_payload)

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        first_payload = first_response.json()["items"][0]
        second_payload = second_response.json()["items"][0]
        self.assertEqual(first_payload["translated_text"], "[ur] Support for mothers after birth.")
        self.assertFalse(first_payload["cached"])
        self.assertTrue(second_payload["cached"])

    def test_community_posts_can_be_created_liked_hidden_and_deleted(self):
        app.dependency_overrides[get_sqlite_store] = lambda: self.store

        create_response = self.client.post(
            "/community/posts",
            json={
                "content": "Today felt difficult, but I would like to hear how others cope.",
                "is_anonymous": True,
                "original_language": "en",
            },
        )

        self.assertEqual(create_response.status_code, 200)
        created_post = create_response.json()
        self.assertEqual(created_post["status"], "visible")
        self.assertTrue(created_post["is_anonymous"])

        like_response = self.client.post(f"/community/posts/{created_post['id']}/like", json={"liked": True})
        self.assertEqual(like_response.status_code, 200)
        self.assertEqual(like_response.json()["like_count"], 1)

        hide_response = self.client.patch(f"/community/posts/{created_post['id']}", json={"status": "hidden"})
        self.assertEqual(hide_response.status_code, 200)
        self.assertEqual(hide_response.json()["status"], "hidden")

        visible_posts_response = self.client.get("/community/posts")
        self.assertEqual(visible_posts_response.status_code, 200)
        self.assertNotIn(created_post["id"], [post["id"] for post in visible_posts_response.json()["items"]])

        all_posts_response = self.client.get("/community/posts?include_hidden=true")
        self.assertEqual(all_posts_response.status_code, 200)
        self.assertIn(created_post["id"], [post["id"] for post in all_posts_response.json()["items"]])

        delete_response = self.client.delete(f"/community/posts/{created_post['id']}")
        self.assertEqual(delete_response.status_code, 204)


if __name__ == "__main__":
    unittest.main()
