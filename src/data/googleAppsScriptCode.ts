export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT (kode.gs) - INTEGRASI DASHBOARD PAXEL FARMA
 * (MENDUKUNG SHEET 'RSUD' & SHEET 'RSI' SECARA OTOMATIS)
 * =========================================================================
 * Script ini secara otomatis membaca data pengiriman dari:
 * 1. Sheet bernama "RSUD" / "RSUD BANJARNEGARA"
 * 2. Sheet bernama "RSI" / "RSI BANJARNEGARA"
 * 
 * Script ini secara cerdas mendeteksi:
 * - Format Dua Tabel Bersebelahan (Tabel COD & Tabel GRATIS)
 * - Format Satu Tabel Standar (Kolom: Tanggal, Pasien, Alamat, Kecamatan, Kurir, dsb.)
 * - Posisi header baris (baris 1 s/d 10) secara otomatis.
 *
 * CARA MEMASANG / MEMPERBARUI:
 * 1. Buka Google Spreadsheet Anda.
 * 2. Klik menu: "Ekstensi" (Extensions) > "Apps Script".
 * 3. Hapus seluruh isi file 'Code.gs' / 'kode.gs', lalu tempel (paste) kode ini.
 * 4. Klik tombol Simpan (Save / Ctrl+S).
 * 5. PENTING UNTUK MEMPERBARUI:
 *    Klik tombol biru "Terapkan" (Deploy) di kanan atas > "Kelola deployment" (Manage deployments).
 *    Klik ikon Pensil (Edit) pada deployment aktif.
 *    Pada pilihan "Versi" (Version), pilih "Versi baru" (New version).
 *    Klik tombol "Terapkan" (Deploy).
 *    (Catatan: Akses wajib diset ke "Siapa saja" / "Anyone").
 * 6. Buka kembali dashboard dan klik "Sinkronkan Sekarang".
 */

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    const paramSheet = (e && e.parameter && e.parameter.sheet) ? String(e.parameter.sheet).trim().toUpperCase() : "ALL";
    const paramAction = (e && e.parameter && e.parameter.action) ? String(e.parameter.action).trim().toLowerCase() : "";

    const sheetSummaries = [];
    let allRecords = [];
    let processedSheets = [];

    // Mode Debug / Cek Sheet yang ada di Spreadsheet
    if (paramAction === "debug" || paramAction === "sheets") {
      const debugList = sheets.map(function(s) {
        const lastR = s.getLastRow();
        const lastC = s.getLastColumn();
        return {
          name: s.getName(),
          rows: lastR,
          cols: lastC,
          previewHeaders: lastR > 0 && lastC > 0 ? s.getRange(1, 1, Math.min(5, lastR), Math.min(10, lastC)).getValues() : []
        };
      });
      return ContentService
        .createTextOutput(JSON.stringify({ status: "debug", sheets: debugList }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }

    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      const sheetName = sheet.getName().trim();
      const sNameUpper = sheetName.toUpperCase();
      sheetSummaries.push(sheetName);

      let targetFaskes = "";
      if (sNameUpper === "RSI" || sNameUpper.indexOf("RSI") !== -1) {
        targetFaskes = "RSI BANJARNEGARA";
      } else if (sNameUpper === "RSUD" || sNameUpper.indexOf("RSUD") !== -1) {
        targetFaskes = "RSUD BANJARNEGARA";
      }

      // Filter spesifik jika parameter ?sheet=... digunakan
      if (paramSheet !== "ALL") {
        if (sNameUpper !== paramSheet && sNameUpper.indexOf(paramSheet) === -1) {
          continue;
        }
      }

      // Ekstraksi sheet yang sesuai
      if (targetFaskes || paramSheet !== "ALL") {
        const faskesName = targetFaskes || (sNameUpper.indexOf("RSI") !== -1 ? "RSI BANJARNEGARA" : "RSUD BANJARNEGARA");
        const recs = extractFarmaRecords(sheet, faskesName);
        allRecords = allRecords.concat(recs);
        processedSheets.push({
          name: sheetName,
          faskes: faskesName,
          count: recs.length
        });
      }
    }

    // Fallback jika tidak ada sheet bernama 'RSUD' atau 'RSI'
    if (allRecords.length === 0 && sheets.length > 0) {
      for (let j = 0; j < sheets.length; j++) {
        const sheet = sheets[j];
        const sName = sheet.getName().trim();
        const faskesName = sName.toUpperCase().indexOf("RSI") !== -1 ? "RSI BANJARNEGARA" : "RSUD BANJARNEGARA";
        const recs = extractFarmaRecords(sheet, faskesName);
        if (recs.length > 0) {
          allRecords = allRecords.concat(recs);
          processedSheets.push({
            name: sName,
            faskes: faskesName,
            count: recs.length
          });
        }
      }
    }

    const response = {
      status: "success",
      allSheetsInSpreadsheet: sheetSummaries,
      processedSheets: processedSheets,
      totalRecords: allRecords.length,
      updatedAt: new Date().toISOString(),
      data: allRecords
    };

    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Ekstraktor data otomatis yang mendukung dua model sheet:
 * Model A: Tabel Bersebelahan (Side-by-Side: Kolom COD & Kolom GRATIS)
 * Model B: Tabel Tunggal (Single Unified Table)
 */
function extractFarmaRecords(sheet, faskesName) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 2) return [];

  const maxScan = Math.min(20, lastRow);
  const sampleValues = sheet.getRange(1, 1, maxScan, Math.min(25, lastCol)).getValues();

  // 1. Uji apakah ini format Dua Tabel Bersebelahan (seperti RSUD)
  let isDualTable = false;
  let headerRowIdx = -1;

  for (let r = 0; r < sampleValues.length; r++) {
    const rowStr = sampleValues[r].map(function(c) { return String(c || "").trim().toUpperCase(); }).join(" ");
    if (rowStr.indexOf("COD") !== -1 && (rowStr.indexOf("GRATIS") !== -1 || rowStr.indexOf("FREE") !== -1 || rowStr.indexOf("NON COD") !== -1)) {
      isDualTable = true;
      headerRowIdx = r;
      break;
    }
  }

  if (!isDualTable && lastCol >= 10) {
    for (let r = 0; r < sampleValues.length; r++) {
      let pasienMatches = 0;
      for (let c = 0; c < sampleValues[r].length; c++) {
        if (String(sampleValues[r][c] || "").toUpperCase().indexOf("PASIEN") !== -1) {
          pasienMatches++;
        }
      }
      if (pasienMatches >= 2) {
        isDualTable = true;
        headerRowIdx = r;
        break;
      }
    }
  }

  if (isDualTable) {
    return parseDualTable(sheet, lastRow, headerRowIdx, faskesName);
  } else {
    return parseSingleTable(sheet, lastRow, lastCol, sampleValues, faskesName);
  }
}

/**
 * Parsing Format Tabel Bersebelahan (COD di kolom kiri, GRATIS di kolom kanan)
 */
function parseDualTable(sheet, lastRow, headerRowIdx, faskesName) {
  const startRow = (headerRowIdx >= 0 ? headerRowIdx + 2 : 6);
  if (startRow > lastRow) return [];
  const numRows = lastRow - startRow + 1;
  const values = sheet.getRange(startRow, 1, numRows, Math.min(18, sheet.getLastColumn())).getValues();
  const records = [];
  const prefix = faskesName.indexOf("RSI") !== -1 ? "RSI" : "RSUD";

  for (let i = 0; i < values.length; i++) {
    const row = values[i];

    // Ekstraksi Kolom COD (B=1, C=2, D=3, E=4, F=5, H=7)
    const codTime = row[1];
    const codName = row[2];
    const codAddr = row[3];
    const codKec = row[4];
    const codKurir = row[5];
    const codOngkir = row[7];

    if (isValidRow(codName, codTime)) {
      const parsedCodDate = parseSmartDate(codTime);
      records.push({
        id: prefix + "-COD-" + (startRow + i),
        rawTimestamp: String(codTime),
        date: parsedCodDate.dateStr,
        day: parsedCodDate.day,
        month: parsedCodDate.month,
        year: parsedCodDate.year,
        faskes: faskesName,
        patientName: cleanName(codName),
        address: String(codAddr || "").trim(),
        kecamatan: cleanKecamatan(codKec),
        courierName: cleanCourier(codKurir),
        paymentType: "COD",
        ongkir: cleanOngkir(codOngkir, 8000)
      });
    }

    // Ekstraksi Kolom GRATIS (J=9, K=10, L=11, M=12, N=13, P=15)
    if (row.length >= 12) {
      const gratisTime = row[9];
      const gratisName = row[10];
      const gratisAddr = row[11];
      const gratisKec = row[12];
      const gratisKurir = row[13];
      const gratisOngkir = row[15];

      if (isValidRow(gratisName, gratisTime)) {
        const parsedGratisDate = parseSmartDate(gratisTime);
        records.push({
          id: prefix + "-GRATIS-" + (startRow + i),
          rawTimestamp: String(gratisTime),
          date: parsedGratisDate.dateStr,
          day: parsedGratisDate.day,
          month: parsedGratisDate.month,
          year: parsedGratisDate.year,
          faskes: faskesName,
          patientName: cleanName(gratisName),
          address: String(gratisAddr || "").trim(),
          kecamatan: cleanKecamatan(gratisKec),
          courierName: cleanCourier(gratisKurir),
          paymentType: "GRATIS",
          ongkir: cleanOngkir(gratisOngkir, 8000)
        });
      }
    }
  }

  return records;
}

/**
 * Parsing Format Satu Tabel Standar (Header tunggal, baris berisi 1 pasien per baris)
 */
function parseSingleTable(sheet, lastRow, lastCol, sampleValues, faskesName) {
  let headerRowIdx = -1;
  let colMap = {
    time: 0,
    name: 1,
    addr: 2,
    kec: -1,
    desa: -1,
    courier: -1,
    payment: -1,
    ongkir: -1
  };

  // Cari baris header berdasarkan kata kunci
  for (let r = 0; r < sampleValues.length; r++) {
    const row = sampleValues[r];
    let score = 0;
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || "").trim().toLowerCase();
      if (cell.match(/(timestamp|tanggal|tgl|waktu|date)/)) score += 2;
      if (cell.match(/(kurir|pengantar|driver|courier)/)) score += 2;
      else if (cell.match(/(pasien|nama|penerima)/)) score += 3;
      if (cell.match(/(alamat|tujuan|desa)/)) score += 2;
      if (cell.match(/(kecamatan|kec\\b|wilayah)/)) score += 2;
      if (cell.match(/(reg|vip|regular|pembayaran|bayar|jenis|tipe|metode|status)/)) score += 2;
      if (cell.match(/(ongkir|tarif|biaya|ongkos)/)) score += 1;
    }
    if (score >= 4) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx !== -1) {
    const hRow = sampleValues[headerRowIdx];
    for (let c = 0; c < hRow.length; c++) {
      const val = String(hRow[c] || "").trim().toLowerCase();
      if (val.match(/(timestamp|tanggal|tgl|waktu|date)/)) {
        colMap.time = c;
      } else if (val.match(/(kurir|pengantar|driver|courier)/)) {
        // Penting: Deteksi kurir terlebih dahulu agar tidak tertukar dengan "Nama Kurir"
        colMap.courier = c;
      } else if (val.match(/(pasien|penerima)/) || (val.match(/nama/) && !val.match(/kurir/))) {
        colMap.name = c;
      } else if (val.match(/(reg|vip|regular)/)) {
        // Kolom REG/VIP (khusus RSI)
        colMap.payment = c;
      } else if (val.match(/(pembayaran|bayar|jenis|tipe|metode|status)/)) {
        colMap.payment = c;
      } else if (val.match(/(kecamatan|kec\\b|wilayah)/)) {
        colMap.kec = c;
      } else if (val.match(/(desa|kelurahan)/)) {
        colMap.desa = c;
      } else if (val.match(/(alamat|tujuan)/)) {
        colMap.addr = c;
      } else if (val.match(/(ongkir|tarif|biaya|ongkos)/)) {
        colMap.ongkir = c;
      }
    }
  }

  const startRow = (headerRowIdx !== -1 ? headerRowIdx + 2 : 2);
  if (startRow > lastRow) return [];
  const numRows = lastRow - startRow + 1;
  const values = sheet.getRange(startRow, 1, numRows, lastCol).getValues();
  const records = [];
  const isRsi = faskesName.indexOf("RSI") !== -1;
  const prefix = isRsi ? "RSI" : "RSUD";

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rawTime = row[colMap.time];
    const rawName = colMap.name !== -1 ? row[colMap.name] : row[1];
    let rawAddr = colMap.addr !== -1 ? row[colMap.addr] : "";
    let rawKec = colMap.kec !== -1 ? row[colMap.kec] : "";
    const rawKurir = colMap.courier !== -1 ? row[colMap.courier] : "Kurir";
    const rawPayment = colMap.payment !== -1 ? String(row[colMap.payment] || "").trim().toUpperCase() : "";
    const rawOngkir = colMap.ongkir !== -1 ? row[colMap.ongkir] : (isRsi ? 13000 : 8000);

    // Penyesuaian khusus jika sheet RSI memiliki kolom "Alamat" (Kecamatan) & "Desa" (Alamat detail)
    if (colMap.desa !== -1) {
      const desaStr = String(row[colMap.desa] || "").trim();
      if (colMap.addr !== -1) {
        const addrStr = String(row[colMap.addr] || "").trim();
        // Pada sheet RSI: kolom Alamat berisi nama Kecamatan (misal BANJARNEGARA, BAWANG)
        if (!rawKec) rawKec = addrStr;
        rawAddr = desaStr ? desaStr + (addrStr ? ", " + addrStr : "") : addrStr;
      } else {
        rawAddr = desaStr;
      }
    }

    if (isValidRow(rawName, rawTime)) {
      const parsedDate = parseSmartDate(rawTime);
      let payType = "COD";
      if (isRsi) {
        // Tipe pembayaran RSI: REGULER atau VIP
        if (rawPayment.indexOf("VIP") !== -1) {
          payType = "VIP";
        } else {
          payType = "REGULER";
        }
      } else {
        // Tipe pembayaran RSUD: COD atau GRATIS
        if (rawPayment.match(/(GRATIS|FREE|NON COD|NON-COD|BPJS|SUBSIDI|LUNAS|FASKES)/)) {
          payType = "GRATIS";
        } else {
          payType = "COD";
        }
      }

      records.push({
        id: prefix + "-" + (startRow + i),
        rawTimestamp: String(rawTime),
        date: parsedDate.dateStr,
        day: parsedDate.day,
        month: parsedDate.month,
        year: parsedDate.year,
        faskes: faskesName,
        patientName: cleanName(rawName),
        address: String(rawAddr || "").trim(),
        kecamatan: cleanKecamatan(rawKec),
        courierName: cleanCourier(rawKurir),
        paymentType: payType,
        ongkir: cleanOngkir(rawOngkir, payType === "GRATIS" ? 0 : (isRsi ? 13000 : 8000))
      });
    }
  }

  return records;
}

function isValidRow(name, time) {
  if (!name || !time) return false;
  const n = String(name).trim().toLowerCase();
  const t = String(time).trim().toLowerCase();
  if (n === "" || t === "") return false;
  if (n === "nama pasien" || n === "nama" || n === "pasien" || n.indexOf("total") !== -1 || n.indexOf("jumlah") !== -1) return false;
  if (t === "timestamp" || t === "tanggal" || t === "waktu") return false;
  return true;
}

function cleanName(val) {
  return String(val || "").trim();
}

function cleanKecamatan(val) {
  let k = String(val || "").trim().toUpperCase();
  if (!k || k === "-" || k === "null" || k === "undefined") return "BANJARNEGARA";
  return k.replace(/^KEC\\.?\\s*/i, "").trim();
}

function cleanCourier(val) {
  let c = String(val || "").trim();
  if (!c || c === "-" || c.toLowerCase() === "kurir" || c.toLowerCase() === "nama kurir") return "Kurir";
  return c.replace(/\\w\\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function cleanOngkir(val, fallback) {
  if (val === 0) return 0;
  if (!val) return fallback || 8000;
  if (typeof val === "number") return val;
  const cleanStr = String(val).replace(/[^0-9]/g, "");
  let num = parseInt(cleanStr, 10);
  if (isNaN(num)) return fallback || 8000;
  if (num < 1000 && String(val).indexOf(".") !== -1) num = num * 1000;
  return num;
}

/**
 * Parser tanggal pintar yang mendukung format Indonesia (DD/MM/YYYY),
 * format ISO (YYYY-MM-DD), Date object bawaan Google Sheets, dan teks bulan.
 */
function parseSmartDate(val) {
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = val.getMonth() + 1;
    const d = val.getDate();
    return {
      dateStr: y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d),
      day: d, month: m, year: y
    };
  }

  const s = String(val || "").trim();

  // Format YYYY-MM-DD atau YYYY/MM/DD
  const isoMatch = s.match(/^(\\d{4})[-/](\\d{1,2})[-/](\\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    return {
      dateStr: y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d),
      day: d, month: m, year: y
    };
  }

  // Format Indonesia DD/MM/YYYY atau DD-MM-YYYY
  const idMatch = s.match(/^(\\d{1,2})[-/](\\d{1,2})[-/](\\d{4})/);
  if (idMatch) {
    const part1 = parseInt(idMatch[1], 10);
    const part2 = parseInt(idMatch[2], 10);
    const y = parseInt(idMatch[3], 10);
    // Di Indonesia, angka pertama adalah Hari, angka kedua adalah Bulan
    let d = part1;
    let m = part2;
    if (part2 > 12 && part1 <= 12) {
      // Kasus MM/DD/YYYY
      m = part1;
      d = part2;
    }
    return {
      dateStr: y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d),
      day: d, month: m, year: y
    };
  }

  // Format teks (contoh: 29 Mei 2026 atau 29 May 2026)
  const monthsMap = {
    "januari": 1, "jan": 1, "january": 1,
    "februari": 2, "feb": 2, "february": 2,
    "maret": 3, "mar": 3, "march": 3,
    "april": 4, "apr": 4,
    "mei": 5, "may": 5,
    "juni": 6, "jun": 6, "june": 6,
    "juli": 7, "jul": 7, "july": 7,
    "agustus": 8, "agu": 8, "august": 8, "aug": 8,
    "september": 9, "sep": 9,
    "oktober": 10, "okt": 10, "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "desember": 12, "des": 12, "december": 12, "dec": 12
  };
  const textMatch = s.match(/^(\\d{1,2})\\s+([A-Za-z]+)\\s+(\\d{4})/);
  if (textMatch) {
    const d = parseInt(textMatch[1], 10);
    const m = monthsMap[textMatch[2].toLowerCase()] || 5;
    const y = parseInt(textMatch[3], 10);
    return {
      dateStr: y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d),
      day: d, month: m, year: y
    };
  }

  // Coba parse dengan native Date jika memungkinkan
  const dTry = new Date(s);
  if (!isNaN(dTry.getTime())) {
    const y = dTry.getFullYear();
    const m = dTry.getMonth() + 1;
    const d = dTry.getDate();
    return {
      dateStr: y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d),
      day: d, month: m, year: y
    };
  }

  // Fallback standar tanggal hari ini
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  return {
    dateStr: y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d),
    day: d, month: m, year: y
  };
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🚀 Paxel Farma API")
    .addItem("🔍 Tes Ekstraksi Data (RSUD & RSI)", "testEkstraksiData")
    .addToUi();
}

function testEkstraksiData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let msg = "Hasil Pengecekan Sheet di Spreadsheet Anda:\\n\\n";
  let total = 0;

  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i];
    const name = s.getName();
    const upper = name.toUpperCase();
    const faskes = upper.indexOf("RSI") !== -1 ? "RSI BANJARNEGARA" : "RSUD BANJARNEGARA";
    const records = extractFarmaRecords(s, faskes);
    msg += "• Sheet '" + name + "': " + records.length + " transaksi terbaca (" + faskes + ")\\n";
    if (records.length > 0) {
      msg += "   Contoh: Pasien '" + records[0].patientName + "', Tgl: " + records[0].date + ", Kurir: " + records[0].courierName + "\\n";
    }
    total += records.length;
  }
  msg += "\\nTotal Seluruh Transaksi Terdeteksi: " + total;
  SpreadsheetApp.getUi().alert(msg);
}
`;
