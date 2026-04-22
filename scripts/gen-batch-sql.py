#!/usr/bin/env python3
"""Outputs INSERT SQL for a specific batch (20 businesses) by state index 0-49."""
import json, sys

def esc(s):
    if s is None: return None
    return str(s).replace("'", "''").replace('\\', '\\\\')

def sql_val(v):
    if v is None: return 'NULL'
    return f"'{esc(v)}'"

data = json.load(open('scripts/businesses-seed.json'))
idx = int(sys.argv[1])
batch = data[idx * 20 : (idx + 1) * 20]

rows = []
for b in batch:
    tags = 'ARRAY[' + ','.join(f"'{esc(t)}'" for t in b['tags']) + "]::text[]" if b['tags'] else "ARRAY[]::text[]"
    hours_str = json.dumps(b.get('hours') or {}).replace("'", "''")
    lat = str(b['lat']) if b.get('lat') is not None else 'NULL'
    lng = str(b['lng']) if b.get('lng') is not None else 'NULL'
    rows.append(
        f"({sql_val(b['name'])}, {sql_val(b['category'])}, {sql_val(b['description'])}, "
        f"{sql_val(b['address'])}, {sql_val(b['phone'])}, {sql_val(b['website'])}, "
        f"{sql_val(b['image_url'])}, {b['avg_rating']}, {b['review_count']}, "
        f"{tags}, '{hours_str}'::jsonb, {lat}, {lng}, 'approved')"
    )

sql = ("INSERT INTO businesses (name, category, description, address, phone, website, "
       "image_url, avg_rating, review_count, tags, hours, lat, lng, status)\nVALUES\n"
       + ',\n'.join(rows)
       + "\nON CONFLICT DO NOTHING;")

print(sql)
