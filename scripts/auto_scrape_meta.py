#!/usr/bin/env python3
"""
Auto MetaRoll Scraper for PokeChamp
====================================
Fetches Pokemon Champions meta statistics from MetaRoll's official API
and transforms them into the format expected by the PokeChamp frontend.

Doubles data: Fetched from MetaRoll API (https://metaroll.app/api/v1/all.json)
Singles data: Scraped via Selenium from the MetaRoll website (singles tab)

The script outputs:
  - src/data/metaroll_stats.json  (wrapper with doubles and metadata)

Schedule: Designed to run every 4 hours via cron or launchd.

Usage:
  python3 scripts/auto_scrape_meta.py
"""

import json
import os
import sys
import urllib.request
from datetime import datetime, timezone


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, "..")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "src", "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "metaroll_stats.json")

API_BASE = "https://metaroll.app/api/v1"
ALL_JSON_URL = f"{API_BASE}/all.json"

HEADERS = {
    "User-Agent": "PokeChamp/1.0 (https://pokechamp.app; meta-scraper)",
    "Accept": "application/json",
}


def fetch_json(url: str) -> dict:
    """Fetch JSON from a URL with proper headers."""
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


_MOVE_TYPE_CACHE: dict[str, str] = {}


def normalize_move_name(name: str) -> str:
    return name.lower().replace("-", "").replace(" ", "")


def _build_move_type_cache():
    """Build a move name -> type lookup from the championsdex data."""
    if _MOVE_TYPE_CACHE:
        return

    dex_file = os.path.join(OUTPUT_DIR, "pokemon_championsdex_full.json")
    if not os.path.exists(dex_file):
        return

    try:
        with open(dex_file, "r", encoding="utf-8") as f:
            dex = json.load(f)

        for _key, mon in dex.items():
            for move in mon.get("moves", []):
                name = move.get("name", "")
                move_type = move.get("type", "")
                if name and move_type:
                    norm_name = normalize_move_name(name)
                    if norm_name not in _MOVE_TYPE_CACHE:
                        _MOVE_TYPE_CACHE[norm_name] = move_type
    except Exception as e:
        print(f"  ⚠ Failed to build move type cache: {e}")


def get_move_type_from_name(move_name: str) -> str | None:
    """
    Look up a move's type from the championsdex data.
    Returns None if not found.
    """
    _build_move_type_cache()
    return _MOVE_TYPE_CACHE.get(normalize_move_name(move_name))


def transform_api_entry(entry: dict) -> dict:
    """
    Transform a single MetaRoll API entry into the format our frontend expects.

    API format (entry):
      { id, name, rank, previousRank, abilities: [{name, percent}],
        items: [{name, percent}], moves: [{name, percent}],
        natures: [{name, percent}], teammates: [{name, percent}],
        matchups: { beats: [str], beatsWith: [{name, percent}],
                    losesTo: [str], beatenBy: [{name, percent}] },
        spreads: [{ statPoints: {hp, atk, def, spa, spd, spe}, percent }] }

    Frontend format:
      { rank, pokemon, types, moves: [{name, type, usage}],
        items: [{name, usage}], abilities: [{name, usage}],
        natures: [{name, usage}], stat_points: [{spread: {HP, Atk, Def, SpA, SpD, Spe}, usage}],
        teammates: [{rank, name}], beats: [{rank, name}], loses_to: [{rank, name}],
        won_with: [{name, type, usage}], beaten_by: [{name, type, usage}] }
    """
    rank = entry.get("rank", 0)
    name = entry.get("name", "Unknown")

    # Moves with type lookup
    moves = []
    for m in entry.get("moves", []):
        move_type = get_move_type_from_name(m["name"])
        moves.append({
            "name": m["name"],
            "type": move_type,
            "usage": f"{m['percent']}%"
        })

    # Items
    items = [{"name": i["name"], "usage": f"{i['percent']}%"} for i in entry.get("items", [])]

    # Abilities
    abilities = [{"name": a["name"], "usage": f"{a['percent']}%"} for a in entry.get("abilities", [])]

    # Natures
    natures = [{"name": n["name"], "usage": f"{n['percent']}%"} for n in entry.get("natures", [])]

    # Stat point spreads
    stat_points = []
    for sp in entry.get("spreads", []):
        points = sp.get("statPoints", {})
        stat_points.append({
            "spread": {
                "HP": str(points.get("hp", 0)),
                "Atk": str(points.get("atk", 0)),
                "Def": str(points.get("def", 0)),
                "SpA": str(points.get("spa", 0)),
                "SpD": str(points.get("spd", 0)),
                "Spe": str(points.get("spe", 0)),
            },
            "usage": f"{sp['percent']}%"
        })

    # Matchups
    matchups = entry.get("matchups", {})

    teammates = []
    for idx, tm in enumerate(entry.get("teammates", []), start=1):
        teammates.append({"rank": str(idx), "name": tm["name"]})

    beats = []
    for idx, b in enumerate(matchups.get("beats", []), start=1):
        beats.append({"rank": str(idx), "name": b})

    loses_to = []
    for idx, lt in enumerate(matchups.get("losesTo", []), start=1):
        loses_to.append({"rank": str(idx), "name": lt})

    won_with = []
    for bw in matchups.get("beatsWith", []):
        move_type = get_move_type_from_name(bw["name"])
        won_with.append({
            "name": bw["name"],
            "type": move_type,
            "usage": f"{bw['percent']}%"
        })

    beaten_by = []
    for bb in matchups.get("beatenBy", []):
        move_type = get_move_type_from_name(bb["name"])
        beaten_by.append({
            "name": bb["name"],
            "type": move_type,
            "usage": f"{bb['percent']}%"
        })

    return {
        "rank": f"#{rank}",
        "pokemon": name,
        "types": [],  # API doesn't provide types directly, will be enriched by the frontend
        "moves": moves,
        "items": items,
        "abilities": abilities,
        "natures": natures,
        "stat_points": stat_points,
        "teammates": teammates,
        "beats": beats,
        "loses_to": loses_to,
        "won_with": won_with,
        "beaten_by": beaten_by,
    }


def enrich_types(entries: list[dict]) -> list[dict]:
    """
    Enrich entries with type data from our local championsdex data.
    """
    dex_file = os.path.join(OUTPUT_DIR, "pokemon_championsdex_full.json")
    if not os.path.exists(dex_file):
        print("  ⚠ Could not find championsdex for type enrichment")
        return entries

    try:
        with open(dex_file, "r", encoding="utf-8") as f:
            dex = json.load(f)

        # Build a lookup by name (case-insensitive)
        type_lookup = {}
        for _key, mon in dex.items():
            name = mon.get("pokemon", "").lower()
            type_lookup[name] = mon.get("types", [])

        for entry in entries:
            pokemon_name = entry["pokemon"].lower()
            if pokemon_name in type_lookup:
                entry["types"] = type_lookup[pokemon_name]

    except Exception as e:
        print(f"  ⚠ Type enrichment failed: {e}")

    return entries


def fetch_doubles_from_api() -> tuple[list[dict], str]:
    """
    Fetch doubles meta data from MetaRoll's official API.
    Returns (entries, captured_at_iso_string).
    """
    print("📡 Fetching doubles data from MetaRoll API...")
    data = fetch_json(ALL_JSON_URL)

    captured_at = data.get("capturedAt", datetime.now(timezone.utc).isoformat())
    api_entries = data.get("entries", [])
    season = data.get("season", "Unknown")
    count = data.get("count", len(api_entries))

    print(f"  ✅ Received {count} Pokémon for Season {season}")
    print(f"  📅 Data captured at: {captured_at}")

    transformed = [transform_api_entry(e) for e in api_entries]
    transformed = enrich_types(transformed)

    return transformed, captured_at


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load existing data to preserve what we can
    existing_data = {"doubles": [], "meta": {}}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                raw = json.load(f)
                # Handle legacy format (plain array)
                if isinstance(raw, list):
                    existing_data["doubles"] = raw
                elif isinstance(raw, dict):
                    existing_data = raw
        except Exception:
            pass

    # Fetch doubles
    try:
        doubles_entries, doubles_captured_at = fetch_doubles_from_api()
        print(f"  📊 Transformed {len(doubles_entries)} doubles entries")
    except Exception as e:
        print(f"  ❌ Failed to fetch doubles: {e}")
        doubles_entries = existing_data.get("doubles", [])
        doubles_captured_at = existing_data.get("meta", {}).get("doubles_updated", "")

    # Build output
    now = datetime.now(timezone.utc).isoformat()
    output = {
        "doubles": doubles_entries,
        "meta": {
            "last_updated": now,
            "doubles_updated": doubles_captured_at,
            "doubles_count": len(doubles_entries),
            "source": "MetaRoll (https://metaroll.app)",
        }
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=4, ensure_ascii=False)

    print(f"\n✅ Successfully saved to {OUTPUT_FILE}")
    print(f"   Doubles: {len(doubles_entries)} Pokémon")
    print(f"   Updated: {now}")


if __name__ == "__main__":
    main()
