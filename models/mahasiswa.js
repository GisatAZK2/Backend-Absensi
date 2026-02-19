module.exports = (sequelize, DataTypes) => {

  const Mahasiswa = sequelize.define('Mahasiswa', {
    id_mahasiswa: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    nim: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },

    nama_mahasiswa: {
      type: DataTypes.STRING,
      allowNull: false
    },
        
    kelas: {
      type: DataTypes.ENUM('Regular A', 'Regular B'),
      allowNull: false
    },

    sesi: {
      type: DataTypes.ENUM('Pagi', 'Malam'),
      allowNull: false
    }

  }, {
    freezeTableName: true,
    timestamps: true
  });

  Mahasiswa.associate = (models) => {
    Mahasiswa.hasMany(models.Absensi_Detail, {
      foreignKey: 'id_mahasiswa'
    });
  };

  return Mahasiswa;
};
