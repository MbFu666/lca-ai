import sys
sys.path.insert(0, '.')
from lca_engine.engine import LcaEngine
from lca_engine.methods import LciaMethods

db_path = r"C:\Users\Administrator\.lca-app\lca.db"
engine = LcaEngine(db_path)

print("=== LCA Engine — Full TianGong Dataset ===\n")

# Stats
p_count = engine.conn.execute("SELECT COUNT(*) FROM processes").fetchone()[0]
f_count = engine.conn.execute("SELECT COUNT(*) FROM flows").fetchone()[0]
e_count = engine.conn.execute("SELECT COUNT(*) FROM exchanges").fetchone()[0]
print(f"Database: {p_count} processes, {f_count} flows, {e_count} exchanges\n")

# Search examples
searches = ["electricity", "steel", "cement", "transport", "waste"]
for q in searches:
    results = engine.search_processes(q, limit=3)
    print(f"Search '{q}': {len(results)} results")
    for r in results[:2]:
        print(f"  - {r['name'][:70]} ({r['location']})")

# Categories
cats = engine.list_categories()
print(f"\nCategories: {len(cats)}")
for c in cats[:8]:
    print(f"  - {c}")

# Methods
print("\nLCIA Methods:")
for m in LciaMethods.list_methods():
    print(f"  - {m['name']}: {m['description']}")

engine.close()
print("\nFull dataset test passed!")
