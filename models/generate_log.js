module.exports = (sequelize, DataTypes) => {
  const Generate_Log = sequelize.define(
    'Generate_Log',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
    },
    {
      tableName: 'Generate_Log',
      timestamps: true, 
      updatedAt: false,  
    }
  );

  return Generate_Log;
};
