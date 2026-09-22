#!/usr/bin/env python3
"""Lokaler Server fuer Icebound.

Zwei Betriebsarten, die automatisch gewaehlt werden:

* Eigenstaendig (der Normalfall, wenn du dieses Repo geklont hast): liefert die
  Dateien direkt per HTTP aus. Ueber ``localhost`` erlauben Browser auch ohne
  HTTPS einen Service Worker, die PWA ist also vollstaendig testbar.
* Ueber den zentralen Rehost: nur in dem Workspace, in dem dieses Projekt
  entstanden ist. Dort liegt eine gemeinsame Infrastruktur, die eine lokale CA
  verwaltet und ein Zertifikat fuer die aktuelle WLAN-IP ausstellt, damit die
  App auf dem Handy im Heimnetz installiert werden kann.

Beide Wege brauchen nur die Python-Standardbibliothek.
"""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import functools
import os
import ssl
import subprocess
import sys


PROJECT_DIR = Path(__file__).resolve().parent
# Nur im Ursprungs-Workspace vorhanden: dort liegt dieses Projekt unter
# <workspace>/Project_icebound_defense/extern/, die gemeinsame
# Hosting-Infrastruktur daneben. Fehlt sie, laeuft der eigenstaendige Modus.
CENTRAL_REHOST = PROJECT_DIR.parents[1] / "pwa-hosting" / "rehost.py"
HOST = os.environ.get("HOST")  # None = je nach Betriebsart entscheiden
PORT = int(os.environ.get("ICEBOUND_PORT", "8446"))


class IceboundHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
    }

    def do_GET(self):
        if self.path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def end_headers(self):
        if self.path in {"/service-worker.js", "/manifest.webmanifest"}:
            self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def log_message(self, fmt, *args):
        print(f"{self.address_string()} - {fmt % args}", flush=True)


def serve(host, port, certfile=None, keyfile=None):
    handler = functools.partial(IceboundHandler, directory=str(PROJECT_DIR))
    server = ThreadingHTTPServer((host, port), handler)
    scheme = "http"
    if certfile and keyfile:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile, keyfile)
        server.socket = context.wrap_socket(server.socket, server_side=True)
        scheme = "https"
    print(f"Icebound: {scheme}://{host}:{port}/", flush=True)
    server.serve_forever()


def rehost(host, port, serve_ca=False, renew_cert=False):
    if not CENTRAL_REHOST.exists():
        if serve_ca or renew_cert:
            raise SystemExit(
                "--serve-ca und --renew-cert brauchen die Hosting-Infrastruktur des\n"
                "Ursprungs-Workspace (lokale CA plus Zertifikat fuer die WLAN-IP).\n"
                "Eigenstaendig geht nur HTTP ueber localhost: python3 rehost_icebound.py"
            )
        # Eigenstaendiger Betrieb: kein zentraler Rehost in der Naehe, also
        # direkt ausliefern. Fuer localhost akzeptieren Browser den Service
        # Worker auch ohne HTTPS.
        print("Eigenstaendiger Modus (keine zentrale Hosting-Infrastruktur gefunden).")
        print(f"Oeffne http://localhost:{port}/ im Browser.")
        return serve(host or "127.0.0.1", port)
    command = [sys.executable, str(CENTRAL_REHOST), "--app", "icebound"]
    if serve_ca:
        command.append("--serve-ca")
    if renew_cert:
        command.append("--renew-cert")
    env = os.environ.copy()
    env["HOST"] = host or "0.0.0.0"
    env["ICEBOUND_PORT"] = str(port)
    workspace_dir = CENTRAL_REHOST.parents[1]
    raise SystemExit(subprocess.run(command, cwd=workspace_dir, env=env, check=False).returncode)


def main():
    parser = argparse.ArgumentParser(
        description="Icebound lokal ausliefern. Ohne Argumente: HTTP auf localhost."
    )
    # Default bewusst leer: eigenstaendig wird daraus 127.0.0.1 (nur dieser
    # Rechner), im Workspace 0.0.0.0, damit das Handy im WLAN drankommt.
    parser.add_argument("--host", default=HOST)
    parser.add_argument("--port", default=PORT, type=int)
    parser.add_argument("--certfile")
    parser.add_argument("--keyfile")
    parser.add_argument("--serve", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--serve-ca", action="store_true", help="Gemeinsame CA fuer das iPhone bereitstellen")
    parser.add_argument("--renew-cert", action="store_true", help="Zertifikat fuer die aktuelle WLAN-IP erneuern")
    args = parser.parse_args()

    if args.serve:
        serve(args.host or "127.0.0.1", args.port, certfile=args.certfile, keyfile=args.keyfile)
    else:
        rehost(args.host, args.port, serve_ca=args.serve_ca, renew_cert=args.renew_cert)


if __name__ == "__main__":
    main()
