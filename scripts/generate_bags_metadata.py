#!/usr/bin/env python3
"""Generate Bags.fm-compatible metadata CSV from Abraxas verified assets."""

import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

HEADERS = [
    "asset_id",
    "display_name",
    "symbol",
    "asset_class",
    "verification_authority",
    "mint_timestamp",
    "immutable_uri",
    "royalty_basis_points",
]


def generate_asset_metadata_csv(
    verified_assets: list[dict],
    output_filepath: str = "bags_submission_metadata.csv",
) -> bool:
    """Transform verified asset records into flat CSV for social launchpad indexing."""
    try:
        with open(output_filepath, mode="w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow(HEADERS)

            for asset in verified_assets:
                ipfs_hash = asset.get("ipfs_hash", "")
                uri = f"https://ipfs.io/ipfs/{ipfs_hash}" if ipfs_hash else asset.get("metadata_uri", "")

                writer.writerow([
                    asset.get("did", asset.get("asset_id", "")),
                    asset.get("name", "Unnamed Asset"),
                    asset.get("symbol", "RWA"),
                    asset.get("class", asset.get("asset_class", "Generic")),
                    asset.get("verifier", "Abraxas_Engine_V5"),
                    datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    uri,
                    asset.get("royalty_bps", "100"),
                ])

        print(f"Successfully exported {len(verified_assets)} assets to {output_filepath}")
        return True
    except OSError as e:
        print(f"File error: {e}")
        return False


if __name__ == "__main__":
    input_path = sys.argv[1] if len(sys.argv) > 1 else None
    output_path = sys.argv[2] if len(sys.argv) > 2 else "bags_submission_metadata.csv"

    if input_path and Path(input_path).exists():
        with open(input_path, encoding="utf-8") as f:
            registry = json.load(f)
    else:
        registry = [
            {
                "did": "did:sui:cielo-abx-re-hosp-001",
                "name": "Cielo Sunrise Estate",
                "symbol": "CIELO",
                "class": "RealEstate.Hospitality",
                "verifier": "Abraxas_Engine_V5",
                "ipfs_hash": "",
                "metadata_uri": "https://abraxas-app.vercel.app/flagship",
                "royalty_bps": "100",
            }
        ]

    ok = generate_asset_metadata_csv(registry, output_path)
    sys.exit(0 if ok else 1)
