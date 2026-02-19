const cron = require("node-cron");
const db = require("../models");
const { Absensi, Absensi_Detail, Mahasiswa } = db;

// Sesi mulai & akhir
const SESI = {
  pagi: { start: 6 * 60, end: 8.5 * 60 },   // 6:00 - 8:30
  malam: { start: 18 * 60, end: 21 * 60 }   // 18:00 - 21:00
};

function getToday() {
  return new Date().toISOString().split("T")[0];
}


function getNowInMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

async function autoAlpaSesi(sesiName) {
  try {
    const today = getToday();

    const absensi = await Absensi.findOne({ where: { tanggal_absensi: today } });
    if (!absensi) return console.log(`[AUTO ALPA] Absensi ${today} belum dibuat`);

    const mahasiswaSesi = await Mahasiswa.findAll({ where: { sesi: sesiName } });
    if (!mahasiswaSesi.length) return console.log(`[AUTO ALPA] Tidak ada mahasiswa sesi ${sesiName}`);

    for (const mhs of mahasiswaSesi) {
      const sudahAbsen = await Absensi_Detail.findOne({
        where: { id_absensi: absensi.id_absensi, id_mahasiswa: mhs.id_mahasiswa }
      });

      if (!sudahAbsen) {
        await Absensi_Detail.create({
          id_absensi: absensi.id_absensi,
          id_mahasiswa: mhs.id_mahasiswa,
          nama_snapshot: mhs.nama_mahasiswa,
          nim_snapshot: mhs.nim,
          status: "Alpa",
          jam: new Date().toTimeString().slice(0, 8)
        });
        console.log(`[AUTO ALPA] ${mhs.nama_mahasiswa} (${mhs.nim}) | Sesi: ${sesiName}`);
      }
    }
  } catch (err) {
    console.error(`[AUTO ALPA ERROR - ${sesiName}]`, err.message);
  }
}

/**
 * CRON tiap menit — jalankan hanya setelah sesi berakhir
 */
cron.schedule("* * * * *", async () => {
  const nowMinutes = getNowInMinutes();

  if (nowMinutes >= SESI.pagi.end) {
    await autoAlpaSesi("pagi");
  }

  if (nowMinutes >= SESI.malam.end) {
    await autoAlpaSesi("malam");
  }

  console.log(`⏱ AUTO ALPA CHECK | ${Math.floor(nowMinutes / 60)}:${nowMinutes % 60}`);
});

console.log("✅ AUTO ALPA CRON AKTIF");
