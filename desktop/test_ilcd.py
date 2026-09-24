import sys
sys.path.insert(0, '.')
from lca_engine.ilcd_importer import parse_process

proc = parse_process(r'C:\Users\Administrator\Desktop\site\TianGong-LCA-Data-main\tiangong_lca_data\processes\000333f8-f13a-4805-9515-2f1e870e8cfb.xml')
if proc:
    print("Name:", proc["name"])
    print("Location:", proc["location"])
    print("Category:", proc["category"])
    print("Exchanges:", len(proc["exchanges"]))
    for ex in proc["exchanges"][:3]:
        print("  ", ex["flow_name"][:50], ":", ex["amount"], ex["unit"])
else:
    print("Failed to parse")
