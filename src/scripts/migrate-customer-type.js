import sequelize from "../config/db.js";

async function migrateCustomerType() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Starting Customer Type migration...');

    // Check if column exists
    const table = await queryInterface.describeTable('customer');
    
    if (!table.type) {
      console.log('➕ Adding type column...');
      await queryInterface.addColumn('customer', 'type', {
        type: 'VARCHAR(20)',
        allowNull: false,
        defaultValue: 'customer'
      });
    } else {
      console.log('✅ Type column already exists');
    }

    // Add CHECK constraint
    console.log('🔒 Adding CHECK constraint...');
    await sequelize.query(`
      ALTER TABLE customer 
      ADD CONSTRAINT chk_customer_type 
      CHECK (type IN ('supplier', 'customer', 'both'))
    `).catch(err => {
      if (err.message.includes('already exists')) {
        console.log('✅ CHECK constraint already exists');
      } else {
        throw err;
      }
    });

    // Add index for better query performance
    console.log('📊 Adding index...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_type ON customer(type)
    `).catch(err => {
      if (err.message.includes('already exists')) {
        console.log('✅ Index already exists');
      } else {
        throw err;
      }
    });

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateCustomerType();
