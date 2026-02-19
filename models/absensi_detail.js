module.exports = (sequelize, DataTypes) => {
  const Absensi_Detail = sequelize.define('Absensi_Detail', {
    id_detail: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_absensi: DataTypes.INTEGER,
    id_mahasiswa: DataTypes.INTEGER,
    nama_snapshot: DataTypes.STRING,
    nim_snapshot: DataTypes.STRING,
    bukti_foto: DataTypes.STRING,
    jam: DataTypes.STRING,
    keterangan : DataTypes.TEXT,
    latitude: DataTypes.DECIMAL(10,8),
    longitude: DataTypes.DECIMAL(11,8),
    status: DataTypes.ENUM('Hadir','Izin','Alpa', 'Sakit')
  }, {
    freezeTableName: true
  });

  Absensi_Detail.associate = (models) => {
    Absensi_Detail.belongsTo(models.Absensi, {
      foreignKey: 'id_absensi'
    });

    Absensi_Detail.belongsTo(models.Mahasiswa, {
      foreignKey: 'id_mahasiswa',
      onDelete: 'SET NULL'
    });
  };

  return Absensi_Detail;
};
