"""YouTube Studio の数字（YouTube Analytics API）を読むための「リフレッシュトークン」を取得する。

★ これは自分のパソコンで1回だけ実行する（クラウド環境ではブラウザが開けないため）。
   Python 3 だけで動く（追加のインストール不要）。

使い方:
  python3 youtube_auth.py
  → クライアントID とクライアントシークレットを聞かれるので入力
  → ブラウザが開くので、チャンネルの Google アカウントでログインして許可
  → 表示された 3 つの値を、Claude の環境設定の環境変数に入れる（チャットには貼らない）

読み取り専用の権限（yt-analytics.readonly / youtube.readonly）だけを求める。動画の削除や投稿はできない。
"""

import getpass
import http.server
import json
import secrets
import urllib.parse
import urllib.request
import webbrowser

SCOPES = [
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/youtube.readonly",
]


def main() -> None:
    client_id = input("クライアントID: ").strip()
    client_secret = getpass.getpass("クライアントシークレット（入力は表示されません）: ").strip()

    state = secrets.token_urlsafe(16)
    result: dict[str, str] = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if q.get("state", [""])[0] == state and "code" in q:
                result["code"] = q["code"][0]
                body = "許可できました。このタブを閉じて、ターミナルに戻ってください。"
            else:
                body = "許可できませんでした。ターミナルの表示を確認してください。"
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(f"<p>{body}</p>".encode())

        def log_message(self, *args) -> None:
            pass

    server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
    redirect = f"http://127.0.0.1:{server.server_port}"
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect,
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
    )
    print("\nブラウザで次のページを開きます（開かないときはコピーして開いてください）:\n" + url + "\n")
    webbrowser.open(url)
    while "code" not in result:
        server.handle_request()

    data = urllib.parse.urlencode(
        {
            "code": result["code"],
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect,
            "grant_type": "authorization_code",
        }
    ).encode()
    with urllib.request.urlopen("https://oauth2.googleapis.com/token", data) as res:
        token = json.load(res)
    if "refresh_token" not in token:
        raise SystemExit("リフレッシュトークンが返ってきませんでした。もう一度実行してください。")

    print("次の 3 つを Claude の環境設定の環境変数に入れてください（チャットには貼らないでください）:\n")
    print(f"YT_CLIENT_ID={client_id}")
    print(f"YT_CLIENT_SECRET={client_secret}")
    print(f"YT_REFRESH_TOKEN={token['refresh_token']}")


if __name__ == "__main__":
    main()
