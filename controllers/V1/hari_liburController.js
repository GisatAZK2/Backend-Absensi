const { Hari_Libur } = require('../../models');

// CREATE
exports.createLibur = async (req, res) => {
  try {
    const { tanggal, keterangan } = req.body;

    const libur = await Hari_Libur.create({
      tanggal,
      keterangan,
      is_generated: false
    });

    res.json({ success: true, data: libur });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET ALL
exports.getAllLibur = async (req, res) => {
  const data = await Hari_Libur.findAll({
    order: [['tanggal', 'ASC']]
  });
  res.json(data);
};

// UPDATE
exports.updateLibur = async (req, res) => {
  const { id } = req.params;
  const { tanggal, keterangan } = req.body;

  await Hari_Libur.update(
    { tanggal, keterangan, is_generated: false },
    { where: { id } }
  );

  res.json({ success: true });
};

// DELETE
exports.deleteLibur = async (req, res) => {
  const { id } = req.params;
  await Hari_Libur.destroy({ where: { id } });
  res.json({ success: true });
};
