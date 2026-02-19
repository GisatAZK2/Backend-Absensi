const { Absensi, Hari_Libur, Generate_Log, sequelize } = require('../../models');
const { Op } = require('sequelize');

// =====================
// Helpers
// =====================
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// =====================
// MAIN FUNCTION
// =====================
exports.generateWithLibur = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      start_date,
      end_date,
      add_libur = [],
      update_libur = [],
      delete_libur = [],
      reset_range = false // 👉 kalau true, hapus absensi + libur dalam range
    } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({
        message: "start_date dan end_date wajib diisi"
      });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end < start) {
      return res.status(400).json({
        message: "end_date tidak boleh lebih kecil dari start_date"
      });
    }

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays > 730) {
      return res.status(400).json({
        message: "Max generate 2 tahun"
      });
    }

    // =====================================
    // 1️⃣ RESET RANGE (OPTIONAL)
    // =====================================
    if (reset_range) {
      await Absensi.destroy({
        where: {
          tanggal_absensi: {
            [Op.between]: [start_date, end_date]
          }
        },
        transaction: t
      });

      await Hari_Libur.destroy({
        where: {
          tanggal: {
            [Op.between]: [start_date, end_date]
          }
        },
        transaction: t
      });
    }

    // =====================================
    // 2️⃣ CRUD HARI LIBUR CUSTOM
    // =====================================

    // CREATE
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

    // UPDATE
    for (const l of update_libur) {
      await Hari_Libur.update(
        {
          tanggal: l.tanggal,
          keterangan: l.keterangan,
          is_generated: false
        },
        {
          where: { id: l.id },
          transaction: t
        }
      );
    }

    // DELETE
    if (delete_libur.length > 0) {
      await Hari_Libur.destroy({
        where: { id: { [Op.in]: delete_libur } },
        transaction: t
      });
    }

    // =====================================
    // 3️⃣ GENERATE ABSENSI
    // =====================================

    const liburList = await Hari_Libur.findAll({ transaction: t });
    const tanggalLibur = liburList.map(l => l.tanggal);

    let current = new Date(start);
    const bulkInsert = [];

    while (current <= end) {
      const formatted = formatDate(current);
      const day = current.getDay(); // 0=minggu, 6=sabtu

      const isWeekend = day === 0 || day === 6;
      const isCustomLibur = tanggalLibur.includes(formatted);

      if (!isWeekend && !isCustomLibur) {
        bulkInsert.push({
          tanggal_absensi: formatted,
          tipe_absensi: JSON.stringify(['pagi', 'malam'])
        });
      } else {
        await Hari_Libur.update(
          { is_generated: true },
          { where: { tanggal: formatted }, transaction: t }
        );
      }

      current = addDays(current, 1);
    }

    if (bulkInsert.length > 0) {
      await Absensi.bulkCreate(bulkInsert, {
        ignoreDuplicates: true,
        transaction: t
      });
    }

    // =====================================
    // 4️⃣ LOG
    // =====================================
    await Generate_Log.create(
      {
        start_date,
        end_date
      },
      { transaction: t }
    );

    await t.commit();

    res.json({
      success: true,
      message: "Generate absensi + kelola libur berhasil",
      total_generated: bulkInsert.length
    });

  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};
