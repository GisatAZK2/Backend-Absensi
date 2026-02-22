const cron = require("node-cron");
const db = require("../models");
const { Absensi, Absensi_Detail, Mahasiswa } = db;

const toMinutes = (timeStr) => {
  const [hour, minute] = timeStr.split(":").map(Number);
  return hour * 60 + minute;
};

const DEFAULT_JAM = {
  pagi: { start: "06:00", end: "09:00" },
  malam: { start: "18:00", end: "21:00" }
};
const DEFAULT_TIPE = ["pagi", "malam"];

const getToday = require('dayjs')().tz('Asia/Jakarta').format('YYYY-MM-DD');

const getNowInMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

async function getJamHariIni() {
  const today = getToday();
  const absensi = await Absensi.findOne({ where: { tanggal_absensi: today, is_deleted: false } });

  let jamConfig = DEFAULT_JAM;
  let tipeAktif = DEFAULT_TIPE;

  if (absensi) {
    if (absensi.jam && Object.keys(absensi.jam).length > 0) jamConfig = absensi.jam;
    if (absensi.tipe_absensi && absensi.tipe_absensi.length > 0) tipeAktif = absensi.tipe_absensi;
  }

  return { jamConfig, tipeAktif };
}

async function autoAlpaSelesai() {
  try {
    const today = getToday();
    const nowMinutes = getNowInMinutes();

    const absensi = await Absensi.findOne({ where: { tanggal_absensi: today } });
    if (!absensi) return console.log(`[AUTO ALPA] Absensi ${today} belum dibuat`);

    const { jamConfig, tipeAktif } = await getJamHariIni();

    for (const tipe of tipeAktif) {
      const sesi = jamConfig[tipe];
      if (!sesi) continue;

      const end = toMinutes(sesi.end);

  
      if (nowMinutes >= end) {
        const mahasiswaSesi = await Mahasiswa.findAll({ where: { sesi: tipe, is_active: true} });

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
            console.log(`[AUTO ALPA] ${mhs.nama_mahasiswa} (${mhs.nim}) | Sesi: ${tipe}`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`[AUTO ALPA ERROR]`, err.message);
  }
}


cron.schedule("* * * * *", async () => {
  await autoAlpaSelesai();
  const now = new Date();
  console.log(`⏱ AUTO ALPA CHECK | ${now.getHours()}:${now.getMinutes()}`);
});

console.log("✅ AUTO ALPA CRON AKTIF");