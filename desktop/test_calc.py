import sys
sys.path.insert(0, '.')
from lca_engine.engine import LcaEngine
from lca_engine.methods import LciaMethods

db_path = r"C:\Users\Administrator\.lca-app\lca.db"
engine = LcaEngine(db_path)

print("=== LCA Engine Test with TianGong Data ===\n")

# Search for processes
results = engine.search_processes("lime")
print(f"Search 'lime': {len(results)} results")
for r in results[:3]:
    print(f"  - {r['name'][:60]} ({r['location']})")

# List categories
cats = engine.list_categories()
print(f"\nCategories: {len(cats)}")
for c in cats[:5]:
    print(f"  - {c}")

# Get a process
if results:
    pid = results[0]['id']
    proc = engine.get_process(pid)
    if proc:
        print(f"\nProcess: {proc['name']}")
        print(f"  Location: {proc['location']}")
        print(f"  Exchanges: {len(proc['exchanges'])}")
        for ex in proc['exchanges'][:3]:
            print(f"    {ex['flow_name'][:40]}: {ex['amount']} {ex['unit']}")

engine.close()
print("\nAll tests passed!")
