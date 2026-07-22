#!/usr/bin/env python3
"""Inspect code node state in n8n SQLite database."""
import json
import sqlite3
import sys

DB = "/root/.n8n/database.sqlite"
WORKFLOW_ID = "ubMLhhPmLSj1YPqc"

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row

# 1. Get workflow_entity
row = conn.execute(
    "SELECT name, active, activeVersionId, versionId, nodes FROM workflow_entity WHERE id = ?",
    (WORKFLOW_ID,)
).fetchone()
if not row:
    print(f"Workflow {WORKFLOW_ID} not found!")
    sys.exit(1)

print("=" * 60)
print("WORKFLOW_ENTITY")
print("=" * 60)
print(f"name: {row['name']}")
print(f"active: {row['active']}")
print(f"activeVersionId: {row['activeVersionId']}")
print(f"versionId: {row['versionId']}")

def inspect_code_node(nodes_json, label):
    nodes = json.loads(nodes_json)
    for node in nodes:
        if node.get('name') == 'Filtrar y Decidir':
            print(f"\n--- Filtrar y Decidir ({label}) ---")
            print(f"type: {node.get('type')}")
            print(f"typeVersion: {node.get('typeVersion')}")
            params = node.get('parameters', {})
            print(f"Parameters keys: {list(params.keys())}")
            if 'jsCode' in params:
                js = params['jsCode']
                print(f"jsCode length: {len(js)} chars")
                print(f"jsCode first line: {js.split(chr(10))[0]}")
            if 'code' in params:
                print(f"!!! WRONG PARAM: 'code' found instead of 'jsCode' (len={len(params['code'])})")
            if 'language' in params:
                print(f"language: {params['language']}")
            if 'mode' in params:
                print(f"mode: {params['mode']}")
            else:
                print("mode: MISSING")
            return
    print(f"\n--- Filtrar y Decidir NOT FOUND in ({label}) ---")

# Inspect workflow_entity nodes
inspect_code_node(row['nodes'], "workflow_entity")

# 2. Get workflow_history by activeVersionId
if row['activeVersionId']:
    hist = conn.execute(
        "SELECT versionId, workflowId, nodes FROM workflow_history WHERE versionId = ?",
        (row['activeVersionId'],)
    ).fetchone()
    if hist:
        print(f"\n{'=' * 60}")
        print(f"WORKFLOW_HISTORY (activeVersionId = {row['activeVersionId']})")
        print(f"{'=' * 60}")
        print(f"versionId: {hist['versionId']}")
        inspect_code_node(hist['nodes'], "workflow_history")
    else:
        print(f"\n!!! workflow_history with versionId={row['activeVersionId']} NOT FOUND!")
        print("This is critical - activeVersionId points to dead record")

        # List all history versions
        all_hist = conn.execute(
            "SELECT versionId, updatedAt, nodes FROM workflow_history WHERE workflowId = ? ORDER BY updatedAt DESC",
            (WORKFLOW_ID,)
        ).fetchall()
        print(f"\nTotal workflow_history versions: {len(all_hist)}")
        for h in all_hist[:5]:
            print(f"  versionId: {h['versionId']}, updatedAt: {h['updatedAt']}")
            inspect_code_node(h['nodes'], f"history {h['versionId'][:12]}")
else:
    print("\nactiveVersionId is NULL!")

# 3. Check workflow_published_version (it stores the published versionId)
pub = conn.execute(
    "SELECT publishedVersionId FROM workflow_published_version WHERE workflowId = ?",
    (WORKFLOW_ID,)
).fetchone()
if pub:
    print(f"\n{'=' * 60}")
    print(f"WORKFLOW_PUBLISHED_VERSION")
    print(f"{'=' * 60}")
    print(f"publishedVersionId: {pub['publishedVersionId']}")
else:
    print(f"\nworkflow_published_version: NULL (workflow was saved but not published)")

conn.close()
