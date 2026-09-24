"""Import TianGong LCA ILCD XML data into SQLite."""
import sqlite3
import xml.etree.ElementTree as ET
import os
import glob
import sys
from pathlib import Path

NS = {
    'process': 'http://lca.jrc.it/ILCD/Process',
    'common': 'http://lca.jrc.it/ILCD/Common',
    'flow': 'http://lca.jrc.it/ILCD/Flow',
    'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
}

DB_PATH = os.path.expanduser("~/.lca-app/lca.db")
DATA_DIR = r"C:\Users\Administrator\Desktop\site\TianGong-LCA-Data-main\tiangong_lca_data"


def init_db(db_path):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.executescript(Path(__file__).parent.joinpath("schema.sql").read_text(encoding="utf-8"))
    return conn


def parse_process(xml_path):
    """Parse a single ILCD process XML file."""
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except ET.ParseError:
        return None

    # UUID
    uuid_el = root.find('.//common:UUID', NS)
    if uuid_el is None or not uuid_el.text:
        return None
    uuid = uuid_el.text.strip()

    # Name — find by lang attribute (xml:lang not supported in ElementTree xpath)
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

    # Classification
    classes = root.findall('.//process:classificationInformation/common:classification/common:class', NS)
    category = ' > '.join(c.text for c in classes if c.text) if classes else ""

    # Process type
    type_el = root.find('.//process:modellingAndValidation/process:LCIMethodAndAllocation/process:typeOfDataSet', NS)
    process_type = type_el.text if type_el is not None and type_el.text else "Unit process"

    # Comment — find by lang
    comment_els = root.findall('.//process:processInformation/process:dataSetInformation/common:generalComment', NS)
    comment_el = None
    for el in comment_els:
        lang = el.get('{http://www.w3.org/XML/1998/namespace}lang', '')
        if lang == 'en':
            comment_el = el
            break
    if comment_el is None and comment_els:
        comment_el = comment_els[0]
    comment = comment_el.text.strip() if comment_el is not None and comment_el.text else ""

    # Exchanges
    exchanges = []
    for ex_el in root.findall('.//process:exchanges/process:exchange', NS):
        ref_flow = ex_el.find('process:referenceToFlowDataSet', NS)
        if ref_flow is None:
            continue
        ref_uri = ref_flow.get('uri', '')
        ref_id = ref_flow.get('refObjectId', '')

        amount_el = ex_el.find('process:meanAmount', NS)
        amount = float(amount_el.text) if amount_el is not None and amount_el.text else 0.0

        unit_el = ex_el.find('process:unitName', NS)
        unit = unit_el.text if unit_el is not None and unit_el.text else "kg"

        is_input = ex_el.get('dataSetInternalID', '0') != '0'
        # Check inputGroup for output identification
        input_group = ex_el.find('process:inputGroup', NS)
        output_group = ex_el.find('process:outputGroup', NS)

        # Reference to flow name (from URI or we'll resolve later)
        flow_name = ""
        flow_type = "elementary"
        if ref_uri:
            # Use ref_id as flow identifier (resolve names later)
            pass

        exchanges.append({
            'flow_id': ref_id or ref_uri.split('/')[-1].replace('.xml', ''),
            'flow_name': flow_name,
            'flow_type': flow_type,
            'amount': amount,
            'unit': unit,
            'is_input': input_group is not None,  # rough heuristic
        })

    return {
        'id': uuid,
        'name': name,
        'category': category,
        'location': location,
        'process_type': process_type,
        'comment': comment,
        'exchanges': exchanges,
    }


def import_all(db_path=DB_PATH, data_dir=DATA_DIR, limit=None):
    """Import all ILCD process XML files into SQLite."""
    conn = init_db(db_path)
    processes_dir = os.path.join(data_dir, 'processes')
    flows_dir = os.path.join(data_dir, 'flows')

    # Collect all process XMLs
    xml_files = sorted(glob.glob(os.path.join(processes_dir, '*.xml')))
    if limit:
        xml_files = xml_files[:limit]

    total = len(xml_files)
    imported = 0
    errors = 0

    print(f"Importing {total} processes from TianGong LCA...")

    # First, import all flows
    print("Importing flows...")
    flow_files = glob.glob(os.path.join(flows_dir, '*.xml'))
    flow_count = 0
    for ff in flow_files:
        try:
            tree = ET.parse(ff)
            root = tree.getroot()
            uuid_el = root.find('.//common:UUID', NS)
            if uuid_el is None or not uuid_el.text:
                continue
            flow_id = uuid_el.text.strip()

            name_el = root.find('.//flow:name/flow:baseName[@xml:lang="en"]', NS)
            if name_el is None:
                name_el = root.find('.//flow:name/flow:baseName', NS)
            name = name_el.text.strip() if name_el is not None and name_el.text else ""

            cat_el = root.find('.//flow:dataSetInformation/flow:category', NS)
            category = cat_el.text if cat_el is not None and cat_el.text else ""

            ft_el = root.find('.//flow:dataSetInformation/flow:type', NS)
            flow_type = ft_el.text if ft_el is not None and ft_el.text else "elementary"

            conn.execute(
                "INSERT OR IGNORE INTO flows (id, name, category, flow_type, ref_id) VALUES (?, ?, ?, ?, ?)",
                (flow_id, name, category, flow_type, flow_id),
            )
            flow_count += 1
        except (ET.ParseError, Exception):
            pass

    conn.commit()
    print(f"  Imported {flow_count} flows")

    # Then import processes
    print("Importing processes...")
    for i, xml_file in enumerate(xml_files):
        if (i + 1) % 500 == 0 or i == 0:
            print(f"  Processing {i+1}/{total}...")

        proc = parse_process(xml_file)
        if not proc:
            errors += 1
            continue

        try:
            conn.execute(
                "INSERT OR REPLACE INTO processes (id, name, category, location, process_type, ref_id) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (proc['id'], proc['name'], proc['category'], proc['location'], proc['process_type'], proc['id']),
            )

            for ex in proc['exchanges']:
                # Ensure flow exists
                conn.execute(
                    "INSERT OR IGNORE INTO flows (id, name, flow_type, ref_id) VALUES (?, ?, ?, ?)",
                    (ex['flow_id'], ex['flow_name'], ex['flow_type'], ex['flow_id']),
                )
                conn.execute(
                    "INSERT INTO exchanges (process_id, flow_id, amount, unit, is_input) VALUES (?, ?, ?, ?, ?)",
                    (proc['id'], ex['flow_id'], ex['amount'], ex['unit'], 1 if ex['is_input'] else 0),
                )

            imported += 1
        except sqlite3.Error as e:
            errors += 1
            if errors <= 5:
                print(f"  Error importing {proc['name']}: {e}")

    conn.commit()
    conn.close()

    print(f"\nDone! Imported {imported} processes, {errors} errors")
    print(f"Database: {db_path}")

    # Stats
    conn2 = sqlite3.connect(db_path)
    p_count = conn2.execute("SELECT COUNT(*) FROM processes").fetchone()[0]
    f_count = conn2.execute("SELECT COUNT(*) FROM flows").fetchone()[0]
    e_count = conn2.execute("SELECT COUNT(*) FROM exchanges").fetchone()[0]
    conn2.close()
    print(f"Total in DB: {p_count} processes, {f_count} flows, {e_count} exchanges")

    return imported


if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    import_all(limit=limit)
