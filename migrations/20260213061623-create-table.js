'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('Mahasiswa', {
      id_mahasiswa: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      nim: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },

      nama_mahasiswa: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      
      kelas: {
        type: Sequelize.ENUM('Regular A', 'Regular B'),
        allowNull: false,
      },

       Sesi: {
        type: Sequelize.ENUM('Pagi', 'Malam'),
        allowNull: false,
      },

       is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
       },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('Absensi', {
      id_absensi: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      tanggal_absensi: {
        type: Sequelize.DATEONLY,
        unique: true,
        allowNull: false,
      },

      jam : {
        type : Sequelize.JSON,
        allowNull : true
      },

      is_deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },

      tipe_absensi: {
        type: Sequelize.JSON,
        allowNull: false,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('Absensi_Detail', {
      id_detail: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      id_absensi: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Absensi',
          key: 'id_absensi',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      id_mahasiswa: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Mahasiswa',
          key: 'id_mahasiswa',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      nama_snapshot: {
        type: Sequelize.STRING,
      },

      nim_snapshot: {
        type: Sequelize.STRING,
      },

      jam: {
        type: Sequelize.STRING,
      },

      keterangan: {
      type: Sequelize.TEXT,
      allowNull: true,
      },

      bukti_foto: {
        type: Sequelize.STRING,
      },

      latitude: {
        type: Sequelize.DECIMAL(10, 8),
      },

      longitude: {
        type: Sequelize.DECIMAL(11, 8),
      },

      status: {
        type: Sequelize.ENUM('Hadir', 'Izin', 'Alpa'),
        allowNull: false,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addConstraint('Absensi_Detail', {
      fields: ['id_absensi', 'id_mahasiswa'],
      type: 'unique',
      name: 'unique_absensi_mahasiswa'
  });


    await queryInterface.createTable('Users', {
      id_user: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },

      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('Hari_Libur', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      tanggal: {
        type: Sequelize.DATEONLY,
        unique: true,
        allowNull: false,
      },
      keterangan: {
        type: Sequelize.STRING,
      },
      is_generated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('Generate_Log', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  start_date: {
    type: Sequelize.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: Sequelize.DATEONLY,
    allowNull: false,
  },
  createdAt: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  }
});

  },

  async down(queryInterface, Sequelize) {
  await queryInterface.dropTable('Absensi_Detail');
  await queryInterface.dropTable('Absensi');
  await queryInterface.dropTable('Generate_Log');
  await queryInterface.dropTable('Hari_Libur');
  await queryInterface.dropTable('Mahasiswa');
  await queryInterface.dropTable('Users');
}

};
