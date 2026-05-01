#!/usr/bin/env python3
"""
Run Roboflow workflow over WebRTC against a Roboflow Inference Server (default http://127.0.0.1:9080).

SSH / headless VPS:
  - Typical cloud servers have no webcam and no X11 → use --video /path/to/clip.mp4 and --no-display.
  - Ensure Inference is listening (often Docker map HOST 9080 → container 9001). Avoid host port 9001 when MinIO is there.
  - API key should come from the environment only (never checked in):

      export ROBOFLOW_API_KEY="your_private_api_key"

  Install deps:
      pip install -r scripts/requirements-roboflow-webrtc.txt

Examples:
    python scripts/roboflow_workflow_webrtc.py \\
      --video /tmp/clip.mp4 --no-display \\
      --api-url http://127.0.0.1:9080 \\
      --workspace zeroxleonardos-workspace \\
      --workflow mangrove-planting-proof-verifier-1777557655867

    python scripts/roboflow_workflow_webrtc.py --webcam \\
      --api-url http://127.0.0.1:9080 \\
      --workspace zeroxleonardos-workspace \\
      --workflow mangrove-planting-proof-verifier-1777557655867
"""

from __future__ import annotations

import argparse
import logging
import os
import sys

log = logging.getLogger(__name__)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Roboflow workflow via WebRTC (Inference SDK)")
    parser.add_argument(
        "--api-url",
        default=os.environ.get("INFERENCE_API_URL", "http://127.0.0.1:9080"),
        help=(
            "Roboflow Inference Server base URL. "
            "Avoid host port 9001 if MinIO/other services occupy it — use e.g. 9080 "
            "(set INFERENCE_API_URL)."
        ),
    )
    parser.add_argument(
        "--workflow",
        default="mangrove-planting-proof-verifier-1777557655867",
    )
    parser.add_argument(
        "--workspace",
        default="zeroxleonardos-workspace",
    )
    parser.add_argument("--image-input", default="image")
    parser.add_argument("--webcam", action="store_true", help="Use WebcamSource (needs /dev/video*)")
    parser.add_argument("--video", default="", help="Path to video file (headless VPS recommended)")
    parser.add_argument("--no-display", action="store_true", help="Do not cv2.imshow (required on headless)")
    parser.add_argument("--processing-timeout", type=int, default=3600)
    args = parser.parse_args()

    api_key = os.environ.get("ROBOFLOW_API_KEY", "").strip()
    if not api_key:
        log.error(
            "Set ROBOFLOW_API_KEY in the environment (same private key Roboflow uses for workflows)."
        )
        sys.exit(1)

    try:
        import cv2  # noqa: F401 — verify import before heavy webrtc deps
        from inference_sdk import InferenceHTTPClient
        from inference_sdk.webrtc import StreamConfig, VideoMetadata, VideoFileSource, WebcamSource
    except ImportError as e:
        log.error(
            "Missing dependency: pip install -r scripts/requirements-roboflow-webrtc.txt (%s)",
            e,
        )
        sys.exit(1)

    use_display = (
        os.environ.get("DISPLAY")
        and not args.no_display
        and sys.stdout.isatty()
    )

    client = InferenceHTTPClient.init(api_url=args.api_url, api_key=api_key)

    if args.video and args.webcam:
        log.error("Use either --video or --webcam, not both.")
        sys.exit(1)

    if args.video:
        if not os.path.isfile(args.video):
            log.error("Video file not found: %s", args.video)
            sys.exit(1)
        source: object = VideoFileSource(args.video)
    elif args.webcam:
        source = WebcamSource(resolution=(1280, 720))
    else:
        log.error("Provide --video PATH (VPS/SSH) or --webcam (laptop with camera).")
        sys.exit(1)

    config = StreamConfig(
        data_output=["verification_json"],
        processing_timeout=args.processing_timeout,
    )

    session = client.webrtc.stream(
        source=source,
        workflow=args.workflow,
        workspace=args.workspace,
        image_input=args.image_input,
        config=config,
    )

    frame_count = 0

    @session.on_frame
    def on_frame(frame, metadata):  # type: ignore[no-untyped-def]
        nonlocal frame_count
        frame_count += 1
        if use_display:
            cv2.imshow("Workflow Output", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                session.close()
        elif frame_count <= 3 or frame_count % 120 == 0:
            log.info("frame #%s md=%s", frame_count, metadata)

    @session.on_data()
    def on_data(value, metadata: VideoMetadata):  # noqa: N802
        if isinstance(value, dict):
            preview = list(value.keys())[:20]
            log.info("data frame=%s dict_keys=%s", metadata.frame_id, preview)
        elif value is not None:
            log.info("data frame=%s payload_type=%s", metadata.frame_id, type(value).__name__)
        else:
            log.debug("data frame=%s payload=None", metadata.frame_id)

    try:
        log.info(
            "Starting WebRTC workflow session → %s / %s (api_url=%s)",
            args.workspace,
            args.workflow,
            args.api_url,
        )
        session.run()
    finally:
        if use_display:
            cv2.destroyAllWindows()
        log.info("Done (%s frames).", frame_count)


if __name__ == "__main__":
    main()
