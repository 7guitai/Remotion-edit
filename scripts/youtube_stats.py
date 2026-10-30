"""YouTube Studio と同じ数字（再生数・視聴維持率など）を YouTube Analytics API で取得する。

環境変数 YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN が必要（取得方法は scripts/youtube_auth.py）。
結果は out/youtube-stats.json（Git 管理外）に保存し、表にして表示する。

使い方: python3 scripts/youtube_stats.py [--days 28] [--retention 10]
  --retention N : 新しい順に N 本、視聴維持率の曲線から「3秒時点」「半分」「最後」の維持率を出す
"""

import argparse
import datetime as dt
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
METRICS = [
    "views",
    "estimatedMinutesWatched",
    "averageViewDuration",
    "averageViewPercentage",
    "likes",
    "comments",
    "shares",
    "subscribersGained",
]


def access_token() -> str:
    keys = ["YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"]
    missing = [k for k in keys if not os.environ.get(k)]
    if missing:
        sys.exit(f"環境変数がありません: {', '.join(missing)}（scripts/youtube_auth.py を参照）")
    data = urllib.parse.urlencode(
        {
            "client_id": os.environ["YT_CLIENT_ID"],
            "client_secret": os.environ["YT_CLIENT_SECRET"],
            "refresh_token": os.environ["YT_REFRESH_TOKEN"],
            "grant_type": "refresh_token",
        }
    ).encode()
    with urllib.request.urlopen("https://oauth2.googleapis.com/token", data) as res:
        return json.load(res)["access_token"]


def get(url: str, params: dict, token: str) -> dict:
    req = urllib.request.Request(
        f"{url}?{urllib.parse.urlencode(params)}", headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as res:
        return json.load(res)


def uploads(token: str, limit: int = 200) -> list[dict]:
    """チャンネルの動画を新しい順に（タイトル・公開日時・長さ）"""
    ch = get("https://www.googleapis.com/youtube/v3/channels", {"part": "contentDetails", "mine": "true"}, token)
    playlist = ch["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
    videos, page = [], None
    while len(videos) < limit:
        params = {"part": "snippet", "playlistId": playlist, "maxResults": 50}
        if page:
            params["pageToken"] = page
        res = get("https://www.googleapis.com/youtube/v3/playlistItems", params, token)
        videos += [
            {
                "id": it["snippet"]["resourceId"]["videoId"],
                "title": it["snippet"]["title"],
                "published": it["snippet"]["publishedAt"],
            }
            for it in res["items"]
        ]
        page = res.get("nextPageToken")
        if not page:
            break
    return videos


def report(token: str, start: str, end: str, **params) -> dict:
    return get(
        "https://youtubeanalytics.googleapis.com/v2/reports",
        {"ids": "channel==MINE", "startDate": start, "endDate": end, **params},
        token,
    )


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--days", type=int, default=28, help="集計する日数（今日から何日前まで）")
    p.add_argument("--retention", type=int, default=10)
    args = p.parse_args()

    token = access_token()
    end = dt.date.today().isoformat()
    start = (dt.date.today() - dt.timedelta(days=args.days)).isoformat()

    videos = uploads(token)
    stats = report(
        token, start, end, metrics=",".join(METRICS), dimensions="video", sort="-views", maxResults=200
    )
    by_id = {row[0]: dict(zip(METRICS, row[1:])) for row in stats.get("rows", [])}
    for v in videos:
        v.update(by_id.get(v["id"], {}))

    # 視聴維持率の曲線（横軸＝動画の何割の位置か、縦軸＝そこまで見ている人の割合）
    for v in videos[: args.retention]:
        r = report(
            token,
            "2020-01-01",
            end,
            metrics="audienceWatchRatio",
            dimensions="elapsedVideoTimeRatio",
            filters=f"video=={v['id']}",
        )
        curve = [(row[0], row[1]) for row in r.get("rows", [])]
        v["retention"] = curve

    out = ROOT / "out" / "youtube-stats.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(
        json.dumps({"start": start, "end": end, "videos": videos}, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )

    def at(curve: list, x: float) -> str:
        if not curve:
            return "-"
        return f"{min(curve, key=lambda c: abs(c[0] - x))[1] * 100:.0f}%"

    print(f"期間 {start}〜{end}（維持率は公開からの累計）\n")
    print("公開日 | 再生 | 平均視聴率 | 高評価 | 登録+ | 維持率 5%/50%/100% | タイトル")
    for v in videos[:30]:
        curve = v.get("retention", [])
        print(
            f"{v['published'][:10]} | {v.get('views', 0)} | {v.get('averageViewPercentage', 0):.0f}% | "
            f"{v.get('likes', 0)} | {v.get('subscribersGained', 0)} | "
            f"{at(curve, 0.05)}/{at(curve, 0.5)}/{at(curve, 1.0)} | {v['title']}"
        )
    print(f"\n保存: {out}")


if __name__ == "__main__":
    main()
