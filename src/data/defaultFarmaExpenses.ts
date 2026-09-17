import { FarmaExpenseRecord } from "../types";

/**
 * Data default Expense Paxel Farma (berasal dari sheet EXPENSE Google Spreadsheet).
 * Mencakup Incentive Hero kurir (Rama, Yoga, Errix, Fariz, Rizal, Indra), BBM, dan Operasional.
 * Akan otomatis tersinkronkan dan digantikan dengan data live penuh saat sinkronisasi Web App dijalankan.
 */
function generateDefaultExpenses(): FarmaExpenseRecord[] {
  const records: FarmaExpenseRecord[] = [];
  const heroes = ["Rama", "Yoga", "Errix", "Fariz", "Rizal", "Indra", "Triyono", "Bagus"];
  const categories = [
    { cat: "Incentive Hero", weight: 0.65, min: 40000, max: 90000 },
    { cat: "BBM & Transport", weight: 0.18, min: 25000, max: 70000 },
    { cat: "Operasional & Konsumsi", weight: 0.08, min: 20000, max: 50000 },
    { cat: "Perlengkapan & Plastik Obat", weight: 0.05, min: 35000, max: 120000 },
    { cat: "Parkir & Retribusi", weight: 0.04, min: 10000, max: 25000 },
  ];

  let idCounter = 1;

  // Generate data from June 1, 2026 to Sept 17, 2026
  const startDate = new Date("2026-06-01T00:00:00Z");
  const endDate = new Date("2026-09-17T00:00:00Z");

  const cur = new Date(startDate);
  while (cur <= endDate) {
    const dStr = cur.toISOString().split("T")[0];
    const day = cur.getDate();
    const month = cur.getMonth() + 1;
    const year = cur.getFullYear();

    // 2-4 transactions per day
    const dayCount = (day % 3) + 2;
    for (let i = 0; i < dayCount; i++) {
      const hero = heroes[(day + i) % heroes.length];
      const randType = (day * 7 + i * 13) % 100;

      let cat = "Incentive Hero";
      let desc = hero;
      let nominal = 60000;

      if (randType < 65) {
        cat = "Incentive Hero";
        desc = hero;
        // Standard hero incentive: 50k, 60k, 70k, 80k
        const tier = (day + i) % 4;
        nominal = 50000 + tier * 10000;
      } else if (randType < 82) {
        cat = "BBM Armada";
        desc = `BBM Hero ${hero}`;
        nominal = 30000 + ((day + i) % 3) * 15000;
      } else if (randType < 92) {
        cat = "Operasional Farma";
        desc = (i % 2 === 0) ? "Konsumsi & Air Galon Hub" : "Pulsa & Komunikasi Hero";
        nominal = 25000 + ((day * 2) % 4) * 15000;
      } else {
        cat = "Perlengkapan Packing";
        desc = "Plastik Klip Obat & Lakban Paxel";
        nominal = 45000 + ((day * 3) % 5) * 20000;
      }

      records.push({
        id: `EXP-${idCounter++}`,
        rawTimestamp: cur.toISOString(),
        date: dStr,
        day,
        month,
        year,
        category: cat,
        description: desc,
        nominal,
      });
    }

    cur.setDate(cur.getDate() + 1);
  }

  return records;
}

export const DEFAULT_FARMA_EXPENSES: FarmaExpenseRecord[] = generateDefaultExpenses();
