const { Absensi, Hari_Libur, Generate_Log, Absensi_Detail, sequelize } = require('../../models');
const { Op } = require('sequelize');

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const DEFAULT_JAM = {
  pagi: { start: "06:00", end: "08:00" },
  malam: { start: "18:00", end: "21:00" }
};

// ================================
// 🔧 CONFIG WEEKEND RULE
// ================================
const SUNDAY_ALWAYS_LIBUR = true;
const SATURDAY_LIBUR = false; 
// kalau mau sabtu juga selalu libur → ubah jadi true
// const SATURDAY_LIBUR = true;

exports.generateWithLibur = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      start_date,
      end_date,
      target_dates = [],
      sesi = ['pagi', 'malam'],
      custom_jam = {},
      add_libur = [],
      update_libur = [],
      delete_libur = [],
      reset_range = false
    } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ message: "start_date dan end_date wajib diisi" });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end < start) {
      return res.status(400).json({ message: "end_date tidak boleh lebih kecil dari start_date" });
    }

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays > 730) {
      return res.status(400).json({ message: "Max generate 2 tahun" });
    }

    // ==================================================
    // 1️⃣ RESET RANGE
    // ==================================================
    if (reset_range) {

      const absensiWithDetail = await Absensi.findAll({
        include: [{
          model: Absensi_Detail,
          required: true
        }],
        attributes: ['id_absensi'],
        transaction: t
      });

      const usedIds = absensiWithDetail.map(a => a.id_absensi);

      await Absensi.destroy({
        where: {
          tanggal_absensi: { [Op.between]: [start_date, end_date] },
          id_absensi: { [Op.notIn]: usedIds }
        },
        transaction: t
      });

      await Hari_Libur.destroy({
        where: {
          tanggal: { [Op.between]: [start_date, end_date] }
        },
        transaction: t
      });
    }

    // ==================================================
    // 2️⃣ CRUD HARI LIBUR
    // ==================================================

    if (add_libur.length > 0) {
      await Hari_Libur.bulkCreate(
        add_libur.map(l => ({
          tanggal: l.tanggal,
          keterangan: l.keterangan || "Libur Custom",
          is_generated: false
        })),
        { transaction: t }
      );
    }

    for (const l of update_libur) {
      await Hari_Libur.update(
        {
          tanggal: l.tanggal,
          keterangan: l.keterangan,
          is_generated: false
        },
        { where: { id: l.id }, transaction: t }
      );
    }

    if (delete_libur.length > 0) {
      await Hari_Libur.destroy({
        where: { id: { [Op.in]: delete_libur } },
        transaction: t
      });
    }

    // ==================================================
    // 3️⃣ PREPARE DATA LIBUR
    // ==================================================

    const liburList = await Hari_Libur.findAll({ transaction: t });
    const tanggalLibur = liburList.map(l => l.tanggal);

    // ==================================================
    // 4️⃣ BUILD DATE LIST
    // ==================================================

    let dateList = [];

    if (target_dates.length > 0) {
      dateList = target_dates;
    } else {
      let current = new Date(start);
      while (current <= end) {
        dateList.push(formatDate(current));
        current = addDays(current, 1);
      }
    }
    let totalGenerated = 0;

    for (const tanggal of dateList) {

      const currentDate = new Date(tanggal);
      const day = currentDate.getDay(); // 0 = Minggu, 6 = Sabtu

      const isSunday = SUNDAY_ALWAYS_LIBUR && day === 0;
      const isSaturday = SATURDAY_LIBUR && day === 6;

      const isCustomLibur = tanggalLibur.includes(tanggal);

      const isLibur = isSunday || isSaturday || isCustomLibur;

      // ==================================================
      // 🔴 JIKA LIBUR
      // ==================================================
      if (isLibur) {

        const existing = await Absensi.findOne({
          where: { tanggal_absensi: tanggal },
          include: [{
            model: Absensi_Detail,
            required: false
          }],
          transaction: t
        });

        // hapus hanya jika belum ada detail
        if (existing && existing.Absensi_Details.length === 0) {
          await existing.destroy({ transaction: t });
        }

        await Hari_Libur.update(
          { is_generated: true },
          { where: { tanggal }, transaction: t }
        );

        continue;
      }

      // ==================================================
      // 🟢 JIKA BUKAN LIBUR
      // ==================================================

      const jamConfig = {};
      for (const s of sesi) {
        jamConfig[s] = custom_jam[s] || DEFAULT_JAM[s];
      }

      const existing = await Absensi.findOne({
        where: { tanggal_absensi: tanggal },
        include: [{
          model: Absensi_Detail,
          required: false
        }],
        transaction: t
      });

      if (existing && existing.Absensi_Details.length > 0) {
        continue;
      }

      if (existing) {
        await existing.update({
          tipe_absensi: sesi,
          jam: jamConfig
        }, { transaction: t });
      } else {
        await Absensi.create({
          tanggal_absensi: tanggal,
          tipe_absensi: sesi,
          jam: jamConfig
        }, { transaction: t });
      }

      totalGenerated++;
    }

    // ==================================================
    // 6️⃣ LOG
    // ==================================================

    await Generate_Log.create({
      start_date,
      end_date
    }, { transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: "Generate absensi berhasil (Minggu otomatis libur)",
      total_generated: totalGenerated
    });

  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

exports.updateAbsensiConfig = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      start_date,
      end_date,
      tanggal_absensi = [],
      sesi,              // contoh: ["pagi"]
      custom_jam         // contoh: { pagi: { start: "07:00", end: "09:00" } }
    } = req.body;

    let whereCondition = {};

    // ==============================
    // 1️⃣ VALIDASI FILTER
    // ==============================

    if (tanggal_absensi.length > 0) {
      whereCondition.tanggal_absensi = {
        [Op.in]: tanggal_absensi
      };
    } else if (start_date && end_date) {
      whereCondition.tanggal_absensi = {
        [Op.between]: [start_date, end_date]
      };
    } else {
      return res.status(400).json({
        message: "Isi start_date & end_date atau tanggal_absensi[]"
      });
    }

    // ==============================
    // 2️⃣ AMBIL DATA ABSENSI
    // ==============================

    const absensiList = await Absensi.findAll({
      where: whereCondition,
      include: [{
        model: Absensi_Detail,
        required: false
      }],
      transaction: t
    });

    let updatedCount = 0;
    let skipped = [];

    for (const absensi of absensiList) {

      // ❌ kalau sudah punya detail → skip
      if (absensi.Absensi_Details.length > 0) {
        skipped.push(absensi.tanggal_absensi);
        continue;
      }

      const updateData = {};

      if (sesi) {
        updateData.tipe_absensi = sesi;
      }

      if (custom_jam) {
        updateData.jam = custom_jam;
      }

      await absensi.update(updateData, { transaction: t });

      updatedCount++;
    }

    await t.commit();

    return res.json({
      success: true,
      updated: updatedCount,
      skipped_locked: skipped
    });

  } catch (err) {
    await t.rollback();
    return res.status(500).json({ error: err.message });
  }
};

exports.getAbsensiRelationFlag = async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      tanggal_absensi = []
    } = req.query;

    let whereCondition = {};
    
    if (tanggal_absensi.length > 0) {
      whereCondition.tanggal_absensi = {
        [Op.in]: Array.isArray(tanggal_absensi)
          ? tanggal_absensi
          : [tanggal_absensi]
      };
    } else if (start_date && end_date) {
      whereCondition.tanggal_absensi = {
        [Op.between]: [start_date, end_date]
      };
    } else {
      return res.status(400).json({
        message: "Isi start_date & end_date atau tanggal_absensi[]"
      });
    }

    const absensiList = await Absensi.findAll({
      where: whereCondition,
      include: [{
        model: Absensi_Detail,
        attributes: ['id_detail'], 
        required: false
      }]
    });

    const result = absensiList.map(a => {
      const haveRelation = a.Absensi_Details.length > 0;

      return {
        id_absensi: a.id_absensi,
        tanggal_absensi: a.tanggal_absensi,
        have_relation: haveRelation,
        can_edit: haveRelation
      };
    });

    return res.json({
      success: true,
      total: result.length,
      data: result
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
};

exports.getlistSesiAbsensi = async (req, res) => {
  try {
    const sesi = await Absensi.findAll({
      where: {
        is_deleted: false
      },
      attributes: [
        "id_absensi",
        "tanggal_absensi",
        'tipe_absensi'
      ],
      order: [["tanggal_absensi", "DESC"]]
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil sesi absensi",
      data: sesi
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message
    });
  }
};
