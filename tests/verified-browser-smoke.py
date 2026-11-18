#!/usr/bin/env python3
"""End-to-end Chromium smoke for server-verified Zarya OS 2.2.1 wallet."""
from __future__ import annotations

import os
import re
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "screenshots-2.0"
SHOTS.mkdir(exist_ok=True)
with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    PORT = sock.getsockname()[1]
ORIGIN = f"http://127.0.0.1:{PORT}"
errors = []
with tempfile.TemporaryDirectory(prefix="zarya-server-e2e-") as tmp:
    env = dict(os.environ, PORT=str(PORT), HOST="127.0.0.1",
               ZARYA_STATE_FILE=str(Path(tmp) / "server-state.json"))
    server = subprocess.Popen(
        ["node", "server/verified-server.cjs"],
        cwd=ROOT, env=env, stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE, text=True
    )
    try:
        for _ in range(80):
            if server.poll() is not None:
                raise RuntimeError(f"Backend stopped: {server.stderr.read()}")
            try:
                with urllib.request.urlopen(ORIGIN + "/api/verified/health", timeout=0.5) as r:
                    if r.status == 200:
                        break
            except Exception:
                time.sleep(0.15)
        else:
            raise RuntimeError("Backend did not start on local test port")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
            page = browser.new_page(
                viewport={"width": 1366, "height": 900},
                accept_downloads=True
            )
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(ORIGIN, wait_until="load")
            page.wait_for_function(
                "typeof window.Game !== 'undefined' && typeof window.WM !== 'undefined' && "
                "typeof window.APPS['verified-lab'] !== 'undefined'"
            )
            page.locator("#lockBtn").click()
            page.wait_for_selector("#shell:not([hidden])")
            page.evaluate("window.WM.open('verified-lab')")
            page.wait_for_selector(".vl-status.connected")
            assert page.locator(".vl-case").count() == 8
            assert "0 ₡" in page.locator(".vl-stat").first.inner_text()
            page.locator(".vl-start button").click()
            page.wait_for_selector(".vl-node")
            assert page.locator(".vl-node").count() == 6

            evidence = []
            for idx in range(6):
                node = page.locator(".vl-node").nth(idx)
                name = node.locator("strong").inner_text()
                node.click()
                page.wait_for_function(
                    "(n) => document.querySelector('.vl-log span')?.textContent === n",
                    arg=name
                )
                text = page.locator(".vl-log pre").inner_text()
                evidence.append((name, text))
                assert "event=" in text

            target = next((v for v in evidence
                           if v[0].startswith("DB-") and "object=POLAR-RELEASE-4" in v[1]), None)
            assert target, "A storage log must describe the original case asset."
            marker = re.search(r"RECORD event=([A-Z0-9]+)", target[1]).group(1)
            route = {"store": target[0]}
            for zone, prefix in [("edge", "GW-"), ("relay", "SW-")]:
                match = next(v for v in evidence
                             if v[0].startswith(prefix) and f"event={marker}" in v[1])
                route[zone] = match[0]

            # The marker selector is populated only from a log that the user inspected.
            page.locator(".vl-node").filter(has_text=route["store"]).click()
            page.wait_for_function(
                "(m) => !!document.querySelector('.vl-select select') && "
                "Array.from(document.querySelector('.vl-select select').options)"
                ".some(x => x.value === m)",
                arg=marker
            )
            fields = page.locator(".vl-select select")
            assert fields.count() == 5
            fields.nth(0).select_option(marker)
            fields.nth(1).select_option(route["edge"])
            fields.nth(2).select_option(route["relay"])
            fields.nth(3).select_option(route["store"])
            fields.nth(4).select_option("observe")
            page.get_by_role("button", name="Отправить заключение на сервер").click()
            page.wait_for_function(
                "() => Array.from(document.querySelectorAll('.vl-stat strong'))"
                ".some(el=>el.textContent.includes('170'))"
            )
            assert "170" in page.locator(".vl-stat").first.inner_text()
            assert page.locator(".vl-ledger-item").count() > 0
            page.screenshot(path=str(SHOTS / "server-verified-wallet.png"), full_page=True)

            # Simulate the friend's Local Storage edit. The backend cookie and wallet
            # must remain independent even when the offline profile gets rejected.
            page.evaluate("""() => {
                const raw=JSON.parse(localStorage.getItem('zarya.game.v1'));
                raw.money=500000000;
                localStorage.setItem('zarya.game.v1',JSON.stringify(raw));
            }""")
            page.reload(wait_until="load")
            page.locator("#lockBtn").click()
            page.wait_for_selector("#shell:not([hidden])")
            assert page.evaluate("window.Game.money()") == 0
            page.evaluate("window.WM.open('verified-lab')")
            page.wait_for_selector(".vl-status.connected")
            assert "170" in page.locator(".vl-stat").first.inner_text(), (
                "Server-verified credits must not be affected by local save cheating."
            )
            assert not errors, "JavaScript errors: " + "; ".join(errors)
            browser.close()
        print("Zarya OS 2.2.1 Chromium: verified wallet, puzzle evidence, and local edit isolation passed.")
    finally:
        server.terminate()
        try:
            server.wait(timeout=8)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=8)
