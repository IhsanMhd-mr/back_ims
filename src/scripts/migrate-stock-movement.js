import sequelize from '../config/db.js';

/**
 * Migration: Add movement_type and source columns to stock_records
 * Only adds the new columns without altering existing ones
 */

export const migrateStockMovement = async () => {
    try {
        console.log('[Migration] Adding movement_type and source columns to stock_records...');

        // Check if columns already exist
        const queryInterface = sequelize.getQueryInterface();
        const columns = await queryInterface.describeTable('stock_records');

        if (!columns.movement_type) {
            console.log('[Migration] Adding movement_type column...');
            await queryInterface.addColumn('stock_records', 'movement_type', {
                type: sequelize.DataTypes.STRING(10),
                allowNull: false,
                defaultValue: 'in'
            });
            console.log('[Migration] ✅ movement_type column added');
        } else {
            console.log('[Migration] ℹ️ movement_type column already exists');
        }

        if (!columns.source) {
            console.log('[Migration] Adding source column...');
            await queryInterface.addColumn('stock_records', 'source', {
                type: sequelize.DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'adjustment'
            });
            console.log('[Migration] ✅ source column added');
        } else {
            console.log('[Migration] ℹ️ source column already exists');
        }

        // Add indexes for better query performance
        try {
            console.log('[Migration] Adding indexes...');
            await queryInterface.addIndex('stock_records', ['movement_type'], { name: 'idx_stock_movement_type' });
            console.log('[Migration] ✅ movement_type index added');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('[Migration] ℹ️ movement_type index already exists');
            } else {
                throw err;
            }
        }

        try {
            await queryInterface.addIndex('stock_records', ['source'], { name: 'idx_stock_source' });
            console.log('[Migration] ✅ source index added');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('[Migration] ℹ️ source index already exists');
            } else {
                throw err;
            }
        }

        try {
            await queryInterface.addIndex('stock_records', ['movement_type', 'source'], { name: 'idx_stock_movement_source' });
            console.log('[Migration] ✅ movement_type+source index added');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('[Migration] ℹ️ movement_type+source index already exists');
            } else {
                throw err;
            }
        }

        console.log('[Migration] ✅ Stock movement migration completed successfully!');
        return { success: true, message: 'Migration completed' };
    } catch (error) {
        console.error('[Migration] ❌ Migration failed:', error.message);
        return { success: false, message: error.message, error };
    }
};

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const isConnected = await sequelize.authenticate().catch(() => false);
    if (!isConnected) {
        console.error('❌ Database connection failed');
        process.exit(1);
    }
    
    const result = await migrateStockMovement();
    process.exit(result.success ? 0 : 1);
}
