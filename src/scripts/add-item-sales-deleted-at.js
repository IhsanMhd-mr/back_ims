import sequelize from '../config/db.js';

async function ensureDeletedAt() {
  try {
    // add deleted_at column for paranoid support on item_sales
    await sequelize.query(`ALTER TABLE item_sales ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;`);
    await sequelize.query(`ALTER TABLE item_sales ADD COLUMN IF NOT EXISTS deleted_by INTEGER;`);
    console.log('Ensured item_sales.deleted_at exists');
    process.exit(0);
  } catch (err) {
    console.error('Failed to add deleted_at to item_sales:', err.message || err);
    process.exit(1);
  }
}

ensureDeletedAt();
