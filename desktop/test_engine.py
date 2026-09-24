"""Simple test for LCA engine."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lca_engine"))

from engine import LcaEngine
from methods import LciaMethods

def main():
    print("=== LCA Engine Test ===\n")

    # Create test database
    db_path = "test_lca.db"
    engine = LcaEngine(db_path)

    # Test: list methods
    print("Available LCIA methods:")
    for m in LciaMethods.list_methods():
        print(f"  - {m['name']}: {m['description']}")
    print()

    # Test: search (empty DB)
    results = engine.search_processes("test")
    print(f"Search results: {len(results)} processes")

    # Test: health check
    print(f"Engine initialized: {engine.conn is not None}")

    engine.close()
    os.remove(db_path)
    print("\nAll tests passed!")

if __name__ == "__main__":
    main()
