const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dayjs = require('dayjs');
const axios = require('axios');
const { Op } = require('sequelize');

const { Absensi_Detail, Absensi, Mahasiswa } = require('../models');

exports.generateAbsensiExcel = async (req, res) => {
  try {
    const { start_date, end_date, kelas, sesi } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "start_date dan end_date wajib diisi"
      });
    }

    // Normalisasi sesi sesuai ENUM DB (Pagi / Malam)
    let normalizedSesi = null;
    if (sesi) {
      normalizedSesi =
        sesi.charAt(0).toUpperCase() + sesi.slice(1).toLowerCase();
    }

    // ===============================
    // FOLDER & FILE PATH DI ROOT PROJECT
    // ===============================
    const exportDir = path.join(process.cwd(), 'exports'); // Root project

    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }  else {
        const files = fs.readdirSync(exportDir);
        files.forEach(file => {
        const filePath = path.join(exportDir, file);
        const stats = fs.statSync(filePath);
        const expired = dayjs(stats.mtime).add(3, 'day');
        if (dayjs().isAfter(expired)) {
            fs.unlinkSync(filePath);
            console.log(`File expired dan dihapus: ${file}`);
        }
    });
    }

    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify({ start_date, end_date, kelas, normalizedSesi }))
      .digest('hex');

    const fileName = `absensi_${hash}.xlsx`;
    const filePath = path.join(exportDir, fileName);

    // ===============================
    // CACHE CHECK (3 HARI)
    // ===============================
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const expired = dayjs(stats.mtime).add(3, 'day');

      if (dayjs().isBefore(expired)) {
        return res.json({
          success: true,
          cached: true,
          url: `/exports/${fileName}`
        });
      } else {
        fs.unlinkSync(filePath); // hapus kalau expired
      }
    }

    

    // ===============================
    // QUERY DATA
    // ===============================
    const data = await Absensi_Detail.findAll({
      include: [
        {
          model: Absensi,
          required: true,
          where: {
            tanggal_absensi: {
              [Op.between]: [start_date, end_date]
            },
            is_deleted: false
          }
        },
        {
          model: Mahasiswa,
          required: true,
          where: {
            ...(kelas && { kelas }),
            ...(normalizedSesi && { Sesi: normalizedSesi })
          }
        }
      ],
      order: [[{ model: Absensi }, 'tanggal_absensi', 'ASC']]
    });

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data absensi tidak ditemukan"
      });
    }

    // ===============================
    // GENERATE EXCEL
    // ===============================
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Absensi', { views: [{ state: 'frozen', ySplit: 1 }] });

    // ===== HEADER =====
    sheet.columns = [
      { header: 'Nama', key: 'nama', width: 25 },
      { header: 'NIM', key: 'nim', width: 15 },
      { header: 'Tanggal', key: 'tanggal', width: 15 },
      { header: 'Jam', key: 'jam', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Keterangan', key: 'keterangan', width: 25 },
      { header: 'Foto', key: 'foto', width: 20 }
    ];

    // Style header
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Auto filter
    sheet.autoFilter = { from: 'A1', to: 'G1' };

    // ===== DATA ROW =====
    let rowIndex = 2;
    for (const item of data) {
      const tanggalFormatted = dayjs(item.Absensi.tanggal_absensi).format('DD/MM/YYYY');
      const row = sheet.addRow({
        nama: item.nama_snapshot,
        nim: item.nim_snapshot,
        tanggal: tanggalFormatted,
        jam: item.jam,
        status: item.status,
        keterangan: item.keterangan ?? '-',
        foto: ''
      });

      // Row height for image
      sheet.getRow(rowIndex).height = 80;

      // Stripe rows
      if (rowIndex % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
        });
      }

      // FOTO
      if (item.bukti_foto) {
        try {
          let imageBuffer;

          if (item.bukti_foto.startsWith('http')) {
            const response = await axios.get(item.bukti_foto, { responseType: 'arraybuffer' });
            imageBuffer = response.data;
          } else if (fs.existsSync(item.bukti_foto)) {
            imageBuffer = fs.readFileSync(item.bukti_foto);
          }

          if (imageBuffer) {
            const imageId = workbook.addImage({ buffer: imageBuffer, extension: 'jpeg' });
            sheet.addImage(imageId, {
              tl: { col: 6, row: rowIndex - 1 },
              ext: { width: 100, height: 80 }
            });
          }

        } catch (imgErr) {
          console.log("Gagal load gambar:", imgErr.message);
        }
      }

      rowIndex++;
    }

    // Border untuk semua cell
    sheet.eachRow({ includeEmpty: false }, row => {
      row.eachCell({ includeEmpty: false }, cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // ===============================
    // SAVE FILE
    // ===============================
    await workbook.xlsx.writeFile(filePath);

    const fileUrl = `${req.protocol}://${req.get('host')}/exports/${fileName}`;

    return res.json({
      success: true,
      cached: false,
      url: fileUrl
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Gagal generate excel'
    });
  }
};
