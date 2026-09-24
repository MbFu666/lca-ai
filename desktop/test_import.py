import sys
import os
import sqlite3
import xml.etree.ElementTree as ET
import glob
from pathlib import Path

sys.path.insert(0, '.')

DB_PATH = os.path.expanduser("~/.lca-app/lca.db")
DATA_DIR = r"C:\Users\Administrator\Desktop\site\TianGong-LCA-Data-main\tiangong_lca_data"

NS = {
    'process': 'http://lca.jrc.it/ILCD/Process',
    'common': 'http://lca.jrc.it/ILCD/Common',
}

# Init DB
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
conn = sqlite3.connect(DB_PATH)
conn.executescript(Path("lca_engine/schema.sql").read_text(encoding="utf-8"))

# Get process files
processes_dir = os.path.join(DATA_DIR, 'processes')
xml_files = sorted(glob.glob(os.path.join(processes_dir, '*.xml')))
print(f"Found {len(xml_files)} process files")

# Import first 20
imported = 0
for i, xml_file in enumerate(xml_files[:20]):
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()

        uuid_el = root.find('.//common:UUID', NS)
        if uuid_el is None or not uuid_el.text:
            continue
        uuid = uuid_el.text.strip()

        # Name
        name_els = root.findall('.//process:name/process:baseName', NS)
        name_el = None
        for el in name_els:
            lang = el.get('{http://www.w3.org/XML/1998/namespace}lang', '')
            if lang == 'en':
                name_el = el
                break
        if name_el is None and name_els:
            name_el = name_els[0]
        name = name_el.text.strip() if name_el is not None and name_el.text else ""

        # Location
        loc_el = root.find('.//process:geography/process:locationOfOperationSupplyOrProduction', NS)
        location = loc_el.get('location', '') if loc_el is not None else ""

        # Category
        classes = root.findall('.//process:classificationInformation/common:classification/common:class', NS)
        category = ' > '.join(c.text for c in classes if c.text) if classes else ""

        conn.execute(
            "INSERT OR REPLACE INTO processes (id, name, category, location, process_type, ref_id) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (uuid, name, category, location, "Unit process", uuid),
        )

        # Exchanges
        for ex_el in root.findall('.//process:exchanges/process:exchange', NS):
            ref_flow = ex_el.find('process:referenceToFlowDataSet', NS)
            if ref_flow is None:
                continue
            ref_id = ref_flow.get('refObjectId', '')
            ref_uri = ref_flow.get('uri', '')

            amount_el = ex_el.find('process:meanAmount', NS)
            amount = float(amount_el.text) if amount_el is not None and amount_el.text else 0.0

            unit_el = ex_el.find('process:unitName', NS)
            unit = unit_el.text if unit_el is not None and unit_el.text else "kg"

            input_group = ex_el.find('process:inputGroup', NS)

            flow_id = ref_id or ref_uri.split('/')[-1].replace('.xml', '')

            conn.execute(
                "INSERT OR IGNORE INTO flows (id, name, flow_type, ref_id) VALUES (?, ?, ?, ?)",
                (flow_id, "", "elementary", flow_id),
            )
            conn.execute(
                "INSERT INTO exchanges (process_id, flow_id, amount, unit, is_input) VALUES (?, ?, ?, ?, ?)",
                (uuid, flow_id, amount, unit, 1 if input_group is not None else 0),
            )

        imported += 1
        if (i + 1) % 5 == 0:
            print(f"  Processed {i+1}/20...")

    except Exception as e:
        print(f"  Error: {e}")

conn.commit()

# Stats
p_count = conn.execute("SELECT COUNT(*) FROM processes").fetchone()[0]
f_count = conn.execute("SELECT COUNT(*) FROM flows").fetchone()[0]
e_count = conn.execute("SELECT COUNT(*) FROM exchanges").fetchone()[0]
conn.close()

print(f"\nDone! Imported {imported} processes")
print(f"DB: {p_count} processes, {f_count} flows, {e_count} exchanges")
print(f"Database path: {DB_PATH}")
