#!/usr/bin/env python3
"""Headless browser smoke check for Zarya OS 2.0. Uses an ephemeral localhost server."""
from __future__ import annotations

import functools
import http.server
import json
import tempfile
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SCREENSHOTS = ROOT / "screenshots-2.0"
SCREENSHOTS.mkdir(exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        return

handler = functools.partial(QuietHandler, directory=str(ROOT))
httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
thread = threading.Thread(target=httpd.serve_forever, daemon=True)
thread.start()
url = f"http://127.0.0.1:{httpd.server_address[1]}/"
errors = []

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1440, "height": 900}, accept_downloads=True)
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.goto(url, wait_until="load")
        page.wait_for_function("typeof window.WM !== 'undefined' && " +
                               "typeof window.Game.companyJobs === 'function' && " +
                               "typeof window.SaveCenterCore.makeBackup === 'function'")
        page.locator("#lockBtn").wait_for(state="visible", timeout=20000)
        page.locator("#lockBtn").click()
        page.wait_for_selector("#shell:not([hidden])", timeout=10000)
        page.evaluate("(window.WM.open('company'), true)")
        page.wait_for_selector(".hq-app")
        assert page.locator(".hq-tabs button").count() == 4
        assert page.locator(".hq-rank-panel").count() == 1
        assert page.evaluate("window.Game.companyJobs().length") == 3
        page.screenshot(path=str(SCREENSHOTS / "company-dashboard.png"), full_page=True)
        page.locator('[data-hq-tab="contracts"]').click()
        assert page.locator(".hq-job-item").count() == 3
        page.locator(".hq-job-item").first.click()
        page.locator(".hq-job-detail .btn").first.click()
        assert page.locator(".hq-choices button").count() == 3
        assert page.evaluate("window.Game.companyState().active.id") == "co-000001"
        page.evaluate("window.Game.companyCancel()")
        page.locator('[data-hq-tab="achievements"]').click()
        assert page.locator(".hq-ach-card").count() == 12
        # A brand-new profile does not write zarya.game.v1 until the first game action.
        # Persist a harmless zero-cost action to exercise a real game backup.
        assert page.evaluate("window.Game.spendFunds(0).ok")
        page.evaluate("(window.WM.open('save-center'), true)")
        page.wait_for_selector(".sv-app")
        assert page.locator('[data-save="export"]').count() == 1
        with tempfile.TemporaryDirectory() as tmp:
            with page.expect_download() as d:
                page.locator('[data-save="export"]').click()
            download = d.value
            assert download.suggested_filename.startswith("zarya-os-backup-")
            exported = Path(tmp) / "save.json"
            download.save_as(str(exported))
            content = json.loads(exported.read_text(encoding="utf-8"))
            assert content["format"] == "zarya-os-save"
            assert "zarya.game.v1" in content["data"]
            assert "zarya.company.v1" in content["data"]
            page.locator('[data-save="file"]').set_input_files(str(exported))
            page.wait_for_selector(".sv-preview")
            assert page.locator('[data-save="restore"]').is_enabled()
            assert page.evaluate(
                "window.SaveCenterCore.validate(window.SaveCenterCore.makeBackup()).ok"
            )
        page.screenshot(path=str(SCREENSHOTS / "save-center.png"), full_page=True)
        assert not errors, "JavaScript page errors: " + "; ".join(errors)
        browser.close()
finally:
    httpd.shutdown()
    httpd.server_close()
print("Zarya OS 2.0 browser smoke: company, contracts, achievements and backup UI passed.")
