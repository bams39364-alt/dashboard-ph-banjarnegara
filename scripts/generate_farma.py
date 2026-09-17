import csv
import json
import re
from datetime import datetime

# Read user provided data
with open('scripts/raw_farma.csv', 'r', encoding='utf-8') as f:
    lines = f.readlines()

records = []

# Month names in Indonesian to numbers
month_map = {
    'januari': 1, 'februari': 2, 'maret': 3, 'april': 4,
    'mei': 5, 'juni': 6, 'juli': 7, 'agustus': 8,
    'september': 9, 'oktober': 10, 'november': 11, 'desember': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}

def clean_money(val):
    if not val:
        return 0
    clean = re.sub(r'[^\d]', '', str(val))
    if not clean:
        return 0
    num = int(clean)
    # Check if format was 8.000 -> 8000
    if num < 1000 and '.' in str(val):
        num = num * 1000
    return num

def parse_date(date_str):
    if not date_str:
        return None
    s = str(date_str).strip()
    # Try M/D/YYYY
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', s)
    if m:
        month = int(m.group(1))
        day = int(m.group(2))
        year = int(m.group(3))
        return f"{year:04d}-{month:02d}-{day:02d}", day, month, year
    
    # Try D Month YYYY (e.g. 29 Mei 2026 or 1 September 2026)
    m = re.match(r'^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$', s)
    if m:
        day = int(m.group(1))
        m_name = m.group(2).lower()
        year = int(m.group(3))
        month = month_map.get(m_name, 5)
        return f"{year:04d}-{month:02d}-{day:02d}", day, month, year

    return None

reader = csv.reader(lines)
row_idx = 0
header_found = False

for row in reader:
    row_idx += 1
    if not row or len(row) < 7:
        continue
    
    # Look for header line containing 'Timestamp'
    if 'Timestamp' in row:
        header_found = True
        continue
    
    if not header_found:
        continue

    # Pad row to at least 16 columns
    while len(row) < 16:
        row.append('')

    # Left side: COD columns: 1: Timestamp, 2: Nama Pasien, 3: Alamat, 4: Kecamatan, 5: Nama Kurir, 6: Gratis/COD, 7: Ongkir
    cod_time = row[1].strip() if len(row) > 1 else ''
    cod_name = row[2].strip() if len(row) > 2 else ''
    cod_addr = row[3].strip() if len(row) > 3 else ''
    cod_kec = row[4].strip().upper() if len(row) > 4 else ''
    cod_kurir = row[5].strip() if len(row) > 5 else ''
    cod_type = row[6].strip().upper() if len(row) > 6 else 'COD'
    cod_ongkir = row[7].strip() if len(row) > 7 else ''

    if cod_time and cod_name:
        parsed = parse_date(cod_time)
        if parsed:
            dt_str, day, month, year = parsed
        else:
            dt_str, day, month, year = '2026-05-29', 29, 5, 2026
        
        records.append({
            'id': f"COD-{len(records)+1}",
            'rawTimestamp': cod_time,
            'date': dt_str,
            'day': day,
            'month': month,
            'year': year,
            'patientName': cod_name,
            'address': cod_addr,
            'kecamatan': cod_kec or 'BANJARNEGARA',
            'courierName': cod_kurir.title() or 'Kurir',
            'paymentType': 'COD',
            'ongkir': clean_money(cod_ongkir) or 8000
        })

    # Right side: GRATIS columns: 9: Timestamp, 10: Nama Pasien, 11: Alamat, 12: Kecamatan, 13: Nama Kurir, 14: Gratis/COD, 15: Ongkir
    gratis_time = row[9].strip() if len(row) > 9 else ''
    gratis_name = row[10].strip() if len(row) > 10 else ''
    gratis_addr = row[11].strip() if len(row) > 11 else ''
    gratis_kec = row[12].strip().upper() if len(row) > 12 else ''
    gratis_kurir = row[13].strip() if len(row) > 13 else ''
    gratis_type = row[14].strip().upper() if len(row) > 14 else 'GRATIS'
    gratis_ongkir = row[15].strip() if len(row) > 15 else ''

    if gratis_time and gratis_name:
        parsed = parse_date(gratis_time)
        if parsed:
            dt_str, day, month, year = parsed
        else:
            dt_str, day, month, year = '2026-05-29', 29, 5, 2026

        records.append({
            'id': f"GRATIS-{len(records)+1}",
            'rawTimestamp': gratis_time,
            'date': dt_str,
            'day': day,
            'month': month,
            'year': year,
            'patientName': gratis_name,
            'address': gratis_addr,
            'kecamatan': gratis_kec or 'BANJARNEGARA',
            'courierName': gratis_kurir.title() or 'Kurir',
            'paymentType': 'GRATIS',
            'ongkir': clean_money(gratis_ongkir) or 8000
        })

# Sort by date
records.sort(key=lambda x: x['date'])

print(f"Total parsed records: {len(records)}")

# Write to TypeScript file
with open('src/data/paxelFarmaData.ts', 'w', encoding='utf-8') as f:
    f.write("import { FarmaDeliveryRecord } from '../types';\n\n")
    f.write("export const DEFAULT_FARMA_RECORDS: FarmaDeliveryRecord[] = ")
    f.write(json.dumps(records, indent=2, ensure_ascii=False))
    f.write(";\n")

print("Successfully written to src/data/paxelFarmaData.ts")
