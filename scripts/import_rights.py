#!/usr/bin/env python3
# ponytail: one-off Excel -> JSON converter for the health-rights reference data.
# Avoids an xlsx npm dependency. Re-run when the sheet updates, then `npx prisma db seed`.
#   python3 scripts/import_rights.py "06.04.69 Mock_Health_Navigator_Full(1).xlsx"
import json
import sys
import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else "06.04.69 Mock_Health_Navigator_Full(1).xlsx"
OUT = "prisma/rights-data.json"


def rows(ws):
    """Yield non-empty data rows (skip the header) as trimmed string lists."""
    it = ws.iter_rows(values_only=True)
    next(it, None)  # header
    for r in it:
        cells = ["" if c is None else str(c).strip() for c in r]
        if any(cells):
            yield cells


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)

    rights = [
        {"id": r[0], "name": r[1], "eligibleUsers": r[2], "facility": r[3],
         "monthlyCost": r[4], "coverageLevel": r[5]}
        for r in rows(wb["HealthRights"]) if r[0].startswith("R")
    ]
    services = [
        {"id": r[0], "name": r[1], "category": r[2]}
        for r in rows(wb["Services"]) if r[0].startswith("S")
    ]
    agencies = [
        {"id": r[0], "name": r[1], "responsibility": r[2]}
        for r in rows(wb["Agencies"]) if r[0].startswith("A")
    ]
    facilities = [
        {"id": r[0], "code": r[1], "name": r[2], "district": r[3], "type": r[4],
         "lat": float(r[5]) if r[5] else None, "lng": float(r[6]) if r[6] else None}
        for r in rows(wb["Bangkok_Facilities"]) if r[0].startswith("F")
    ]
    rules = [
        {"serviceName": r[0], "right": r[1], "facility": r[2], "condition": r[3],
         "category": r[4]}
        for r in rows(wb["RecommendationRules"]) if r[0]
    ]
    docs = [
        {"service": r[0], "docs": r[1]}
        for r in rows(wb["Documents"]) if r[0]
    ]

    data = {"rights": rights, "services": services, "agencies": agencies,
            "facilities": facilities, "rules": rules, "docs": docs}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"wrote {OUT}: " + ", ".join(f"{k}={len(v)}" for k, v in data.items()))


if __name__ == "__main__":
    main()
