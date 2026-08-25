from __future__ import annotations

import io
from pathlib import Path
import sys
import unittest
from unittest import mock
import urllib.error


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import repository_updates as updates  # noqa: E402


def entry(title: str, slug: str) -> str:
    return f"""
      <li>
        <details class="paper-entry">
          <summary>
            <span class="paper-title">{title}</span>
            <a class="paper-pdf" href="repo/{slug}/paper.pdf">PDF</a>
          </summary>
        </details>
      </li>
    """


def page(*entries: str) -> str:
    return '<ol class="paper-list">' + "".join(entries) + "</ol>"


class RepositoryPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source = (ROOT / "repository.html").read_text(encoding="utf-8")

    def test_subscription_form_posts_directly_to_buttondown(self) -> None:
        form = (
            '<form class="repository-subscribe-form" '
            'action="https://buttondown.com/api/emails/embed-subscribe/yangpliu" '
            'method="post" accept-charset="UTF-8">'
        )
        self.assertIn(form, self.source)
        self.assertIn('name="email" type="email" autocomplete="email"', self.source)
        self.assertIn('aria-describedby="repository-subscribe-note" required', self.source)
        self.assertIn('<input type="hidden" name="embed" value="1">', self.source)
        self.assertIn('<label for="repository-email">Email address</label>', self.source)
        self.assertIn('id="repository-email"', self.source)
        self.assertIn('<button class="btn btn-dark btn-block" type="submit">Subscribe</button>', self.source)

    def test_subscription_form_is_only_on_repository_page(self) -> None:
        self.assertLess(
            self.source.index('<section class="repository-subscribe"'),
            self.source.index('<ol class="paper-list">'),
        )
        for filename in ("index.html", "research.html", "teaching.html"):
            other = (ROOT / filename).read_text(encoding="utf-8")
            self.assertNotIn("embed-subscribe/yangpliu", other)

    def test_site_identity_is_unchanged(self) -> None:
        self.assertIn('<meta name="author" content="Yang P. Liu">', self.source)
        self.assertIn('<title>Repository | Yang P. Liu</title>', self.source)
        self.assertIn('>Yang P. Liu</a>', self.source)

    def test_page_has_no_rss_or_atom_dependency(self) -> None:
        self.assertNotIn("repository.xml", self.source)
        self.assertNotIn("application/atom+xml", self.source)
        self.assertFalse((ROOT / "repository.xml").exists())

    def test_all_listed_pdfs_parse_and_exist(self) -> None:
        papers = updates.parse_papers(self.source)
        self.assertGreater(len(papers), 0)
        self.assertEqual(len({paper.pdf_href for paper in papers}), len(papers))
        for paper in papers:
            self.assertTrue((ROOT / paper.pdf_href).is_file(), paper.pdf_href)


class DetectionTests(unittest.TestCase):
    def test_only_a_new_pdf_link_triggers(self) -> None:
        old = entry("Old paper", "old-paper")
        new = entry("A <i>new</i> &amp; exact paper", "new-paper")
        papers = updates.find_new_papers(page(old), page(new, old))
        self.assertEqual(
            papers,
            [updates.Paper("A new & exact paper", "repo/new-paper/paper.pdf")],
        )

    def test_title_or_markup_revision_does_not_trigger(self) -> None:
        before = page(entry("Original title", "same-paper"))
        after = page(entry("Revised title", "same-paper"))
        self.assertEqual(updates.find_new_papers(before, after), [])

    def test_deletion_does_not_trigger(self) -> None:
        before = page(
            entry("First", "first"),
            entry("Second", "second"),
        )
        after = page(entry("Second", "second"))
        self.assertEqual(updates.find_new_papers(before, after), [])

    def test_initial_setup_never_sends_the_back_catalog(self) -> None:
        after = page(entry("Existing paper", "existing-paper"))
        self.assertEqual(updates.find_new_papers(None, after), [])

    def test_unsafe_pdf_link_is_rejected(self) -> None:
        unsafe = entry("Unsafe", "../outside")
        with self.assertRaisesRegex(updates.UpdateError, "unsafe paper PDF link"):
            updates.parse_papers(page(unsafe))


class AnnouncementTests(unittest.TestCase):
    def setUp(self) -> None:
        self.first = updates.Paper("First *result*", "repo/first/paper.pdf")
        self.second = updates.Paper("Second result", "repo/second/paper.pdf")

    def test_idempotency_key_is_order_independent(self) -> None:
        self.assertEqual(
            updates.announcement_key([self.first, self.second]),
            updates.announcement_key([self.second, self.first]),
        )

    def test_single_paper_message_links_to_pdf_and_repository(self) -> None:
        subject, body = updates.announcement_content([self.first])
        self.assertEqual(subject, "New repository paper: First *result*")
        self.assertIn("**First \\*result\\***", body)
        self.assertIn("https://yangpliu.github.io/repo/first/paper.pdf", body)
        self.assertIn(updates.REPOSITORY_URL, body)

    def test_multiple_papers_are_batched(self) -> None:
        subject, body = updates.announcement_content([self.first, self.second])
        self.assertEqual(subject, "2 new repository papers")
        self.assertEqual(body.count("[Read the paper]"), 2)

    def test_sending_creates_then_queues_one_idempotent_draft(self) -> None:
        with mock.patch.object(
            updates,
            "_buttondown_request",
            side_effect=[{"id": "em_test"}, {}],
        ) as request:
            email_id = updates.send_announcement([self.first], "secret-token")
        self.assertEqual(email_id, "em_test")
        self.assertEqual(request.call_count, 2)
        create = request.call_args_list[0].args
        send = request.call_args_list[1].args
        self.assertEqual(create[:3], ("POST", "/emails", "secret-token"))
        self.assertEqual(create[3]["status"], "draft")
        self.assertEqual(create[3]["archival_mode"], "disabled")
        self.assertEqual(send[:3], ("PATCH", "/emails/em_test", "secret-token"))
        self.assertEqual(send[3], {"status": "about_to_send"})
        self.assertTrue(create[4].startswith("repository-draft-"))
        self.assertTrue(send[4].startswith("repository-send-"))

    def test_missing_api_key_is_rejected(self) -> None:
        with self.assertRaisesRegex(updates.UpdateError, "GitHub secret"):
            updates.send_announcement([self.first], "  ")

    def test_buttondown_request_pins_api_version(self) -> None:
        response = mock.MagicMock()
        response.__enter__.return_value.read.return_value = b'{"id": "em_test"}'
        with mock.patch.object(updates.urllib.request, "urlopen", return_value=response) as urlopen:
            result = updates._buttondown_request(
                "POST", "/emails", "token", {"status": "draft"}, "stable-key"
            )
        request = urlopen.call_args.args[0]
        headers = {key.lower(): value for key, value in request.header_items()}
        self.assertEqual(result, {"id": "em_test"})
        self.assertEqual(headers["x-api-version"], updates.BUTTONDOWN_API_VERSION)
        self.assertEqual(headers["x-idempotency-key"], "stable-key")

    def test_buttondown_request_retries_transient_server_error(self) -> None:
        failure = urllib.error.HTTPError(
            "https://api.buttondown.com/v1/emails",
            503,
            "Unavailable",
            {},
            io.BytesIO(b"temporarily unavailable"),
        )
        response = mock.MagicMock()
        response.__enter__.return_value.read.return_value = b'{"id": "em_test"}'
        with (
            mock.patch.object(
                updates.urllib.request,
                "urlopen",
                side_effect=[failure, response],
            ) as urlopen,
            mock.patch.object(updates.time, "sleep") as sleep,
        ):
            result = updates._buttondown_request(
                "POST", "/emails", "token", {"status": "draft"}, "stable-key"
            )
        self.assertEqual(result, {"id": "em_test"})
        self.assertEqual(urlopen.call_count, 2)
        sleep.assert_called_once_with(1.0)

    def test_buttondown_request_honors_rate_limit_delay(self) -> None:
        failure = urllib.error.HTTPError(
            "https://api.buttondown.com/v1/emails",
            429,
            "Rate limited",
            {"Retry-After": "7"},
            io.BytesIO(b"rate limited"),
        )
        response = mock.MagicMock()
        response.__enter__.return_value.read.return_value = b'{"id": "em_test"}'
        with (
            mock.patch.object(
                updates.urllib.request,
                "urlopen",
                side_effect=[failure, response],
            ),
            mock.patch.object(updates.time, "sleep") as sleep,
        ):
            updates._buttondown_request(
                "POST", "/emails", "token", {"status": "draft"}, "stable-key"
            )
        sleep.assert_called_once_with(7.0)

    def test_buttondown_request_does_not_retry_permanent_error(self) -> None:
        failure = urllib.error.HTTPError(
            "https://api.buttondown.com/v1/emails",
            403,
            "Forbidden",
            {},
            io.BytesIO(b"insufficient permissions"),
        )
        with (
            mock.patch.object(updates.urllib.request, "urlopen", side_effect=failure) as urlopen,
            mock.patch.object(updates.time, "sleep") as sleep,
            self.assertRaisesRegex(updates.UpdateError, "failed \\(403\\)"),
        ):
            updates._buttondown_request(
                "POST", "/emails", "token", {"status": "draft"}, "stable-key"
            )
        self.assertEqual(urlopen.call_count, 1)
        sleep.assert_not_called()


class WorkflowTests(unittest.TestCase):
    def test_direct_push_workflow_is_narrow_and_uses_a_secret(self) -> None:
        source = (ROOT / ".github" / "workflows" / "repository-updates.yml").read_text(
            encoding="utf-8"
        )
        self.assertIn("paths:\n      - repository.html", source)
        self.assertIn("contents: read", source)
        self.assertIn("fetch-depth: 0", source)
        self.assertIn("persist-credentials: false", source)
        self.assertIn("secrets.BUTTONDOWN_API_KEY", source)
        self.assertNotIn("pull_request:", source)
        self.assertNotIn("repository_dispatch", source)

    def test_automated_publication_notification_survives_deploy_cancellation(self) -> None:
        workflow = ROOT / ".github" / "workflows" / "paper-approval.yml"
        if not workflow.exists():
            self.skipTest("the optional automated paper-intake workflow is not installed")
        source = workflow.read_text(encoding="utf-8")
        notify_job = source[source.index("  notify:\n") : source.index("  deploy:\n")]
        deploy_job = source[source.index("  deploy:\n") :]
        self.assertIn("needs: publish", notify_job)
        self.assertNotIn("concurrency:", notify_job)
        self.assertIn("Notify subscribers when the paper is visible", notify_job)
        self.assertIn("cancel-in-progress: true", deploy_job)
        self.assertNotIn("BUTTONDOWN_API_KEY", deploy_job)
        self.assertIn("steps.repository_page.outputs.notification_before_sha", source)
        self.assertIn("steps.repository_page.outputs.notification_after_sha", source)
        self.assertIn("secrets.BUTTONDOWN_API_KEY", notify_job)
        self.assertIn("notification/scripts/repository_updates.py", notify_job)


if __name__ == "__main__":
    unittest.main()
