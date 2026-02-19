module.exports = (sequelize, DataTypes) => {
  const HariLibur = sequelize.define('Hari_Libur', {
    tanggal: DataTypes.DATEONLY,
    keterangan: DataTypes.STRING,
    is_generated: DataTypes.BOOLEAN
  });

  return HariLibur;
};
