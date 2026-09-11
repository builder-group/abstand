"""Exercise CLI control against a running matching Abstand build."""

import json
from pathlib import Path
import subprocess
import sys
import time
import uuid


def main():
    binary = str(Path(sys.argv[1]).resolve())
    prefix = "CLI smoke " + uuid.uuid4().hex[:8]
    created = []

    def invoke(*args, payload=None, fails=False):
        result = subprocess.run(
            [binary, *args],
            input=json.dumps(payload) if payload is not None else None,
            text=True,
            capture_output=True,
            timeout=35,
        )
        if fails:
            assert result.returncode == 1, (args, result.stdout, result.stderr)
            assert result.stderr.strip(), args
            return result.stderr
        assert result.returncode == 0, (args, result.stderr)
        return json.loads(result.stdout)

    def configuration(mode="casual", duration=1500):
        return {
            "name": prefix + " " + mode,
            "behavior": {
                "type": "block",
                "enforcementMode": mode,
                "balancedDelayMs": 15000,
                "scope": "blockTargets",
                "targets": [{
                    "type": "app", "action": "block",
                    "stableId": "org.example.abstand.cli-smoke-nonexistent",
                    "bundleId": "org.example.abstand.cli-smoke-nonexistent",
                }],
            },
            "conditions": [
                {"transition": "start", "rule": {"type": "manual"}},
                {"transition": "end", "rule": {
                    "type": "afterTransition", "anchorTransition": "start", "offsetMs": duration,
                }},
            ],
        }

    def create(payload):
        intention = invoke("intention", "create", "--file", "-", payload=payload)
        created.append(intention["id"])
        return str(intention["id"])

    def active(id_):
        return any(s["intentionId"] == int(id_) for s in invoke("status")["sessions"])

    def await_completion(id_):
        deadline = time.monotonic() + 10
        while active(id_):
            assert time.monotonic() < deadline, "Session did not complete on schedule"
            time.sleep(0.2)

    try:
        invoke("status")
        id_ = create(configuration(duration=30000))
        assert not active(id_), "Creation started a session"
        assert invoke("intention", "show", id_)["name"].startswith(prefix)
        assert any(i["id"] == int(id_) for i in invoke("intention", "list"))
        payload = configuration(duration=30000)
        payload["name"] = prefix + " updated"
        assert invoke("intention", "update", id_, "--file", "-", payload=payload)["name"] == payload["name"]
        session = invoke("intention", "start", id_)
        assert session["status"] == "active"
        assert active(id_)
        repeated = invoke("intention", "start", id_)
        assert repeated["id"] == session["id"]
        assert repeated["startedAt"] == session["startedAt"], "Repeated start reset the timer"
        assert invoke("intention", "stop", id_)["status"] == "stopped"
        assert not active(id_)
        invoke("intention", "stop", id_, fails=True)
        invalid = configuration()
        invalid["name"] = " "
        invoke("intention", "create", "--file", "-", payload=invalid, fails=True)
        print("PASS create/show/list/update/start/status/stop and invalid inputs")

        for mode in ("balanced", "strict"):
            id_ = create(configuration(mode, duration=4000))
            invoke("intention", "start", id_)
            invoke("intention", "stop", id_, fails=True)
            invoke("intention", "delete", id_, fails=True)
            invoke("intention", "update", id_, "--file", "-", payload=configuration("casual", duration=1000), fails=True)
            assert active(id_)
            await_completion(id_)
            print("PASS " + mode + " enforcement and automatic completion")
    finally:
        for id_ in created:
            if active(id_):
                # Protected test sessions expire within four seconds.
                try:
                    invoke("intention", "stop", str(id_))
                except AssertionError:
                    await_completion(id_)
            invoke("intention", "delete", str(id_))
        assert not any(i["name"].startswith(prefix) for i in invoke("intention", "list"))
        print("PASS cleanup")


if __name__ == "__main__":
    main()
