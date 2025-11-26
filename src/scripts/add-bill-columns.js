import sequelize from '../config/db.js';

(async () => {
  try {
    console.log('Checking for bills table columns...');

    const tableName = 'bills';

    const checkColumn = async (col) => {
      const [results] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = :table AND column_name = :col`,
        { replacements: { table: tableName, col }, type: sequelize.QueryTypes.SELECT }
      );
      return !!results;
    };

    // Note: using Postgres ALTER TABLE ... ADD COLUMN IF NOT EXISTS
    const addColumnIfMissing = async (col, colDef) => {
      const exists = await checkColumn(col);
      if (exists) {
        console.log(`Column '${col}' already exists`);
        return;
      }
      console.log(`Adding column '${col}'`);
      await sequelize.query(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS ${col} ${colDef};`);
      console.log(`Added column '${col}'`);
    };

    await addColumnIfMissing('customer_id', 'INTEGER');
    await addColumnIfMissing('seller_id', 'INTEGER');

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error while adding columns:', err);
    process.exit(1);
  }
})();
