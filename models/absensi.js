module.exports = (sequelize, DataTypes) => {

  const Absensi = sequelize.define('Absensi', {

    id_absensi: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    tanggal_absensi: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true
    },

    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },


    tipe_absensi: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        isValidType(value) {
          const allowed = ['pagi', 'malam'];

          if (!Array.isArray(value)) {
            throw new Error('tipe_absensi harus berupa array');
          }

          value.forEach(v => {
            if (!allowed.includes(v)) {
              throw new Error('tipe_absensi hanya boleh pagi atau malam');
            }
          });
        }
      }
    }

  }, {
    freezeTableName: true,
    timestamps: true
  });

  Absensi.associate = (models) => {
    Absensi.hasMany(models.Absensi_Detail, {
      foreignKey: 'id_absensi',
      onDelete: 'CASCADE'
    });
  };

  return Absensi;
};
