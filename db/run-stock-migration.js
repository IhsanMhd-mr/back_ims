#!/usr/bin/env node
/**
 * Migration Runner: Update stock_records table schema
 * Migrates from product_id/product_sku to item_type/fk_id/sku
 * 
 * Usage:
 *   node run-stock-migration.js up       // Apply migration
 *   node run-stock-migration.js down     // Rollback migration
 *   node run-stock-migration.js status   // Check status
 */

import sequelize from '../config/db.js';
import { Stock } from '../models/stock.model.js';
import { DataTypes } from 'sequelize';

const direction = process.argv[2] || 'up';

const migrate = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Database connected');

    if (direction === 'up') {
      console.log('\n📝 Applying migration: stock schema update...\n');

      // Step 1: Add new columns if they don't exist
      console.log('Step 1: Adding new columns (item_type, fk_id, sku)...');
      try {
        await sequelize.query('ALTER TABLE stock_records ADD COLUMN item_type VARCHAR(50) DEFAULT \'product\'');
        console.log('  ✓ Added item_type column');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('  ℹ item_type column already exists');
        } else throw err;
      }

      try {
        await sequelize.query('ALTER TABLE stock_records ADD COLUMN fk_id INTEGER');
        console.log('  ✓ Added fk_id column');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('  ℹ fk_id column already exists');
        } else throw err;
      }

      try {
        await sequelize.query('ALTER TABLE stock_records ADD COLUMN sku VARCHAR(255)');
        console.log('  ✓ Added sku column');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('  ℹ sku column already exists');
        } else throw err;
      }

      // Step 2: Migrate data
      console.log('\nStep 2: Migrating data from old to new columns...');
      
      try {
        await sequelize.query(`
          UPDATE stock_records 
          SET fk_id = product_id 
          WHERE fk_id IS NULL AND product_id IS NOT NULL
        `);
        console.log('  ✓ Migrated product_id → fk_id');
      } catch (err) {
        console.warn('  ⚠ Could not migrate product_id:', err.message);
      }

      try {
        await sequelize.query(`
          UPDATE stock_records 
          SET sku = product_sku 
          WHERE sku IS NULL AND product_sku IS NOT NULL
        `);
        console.log('  ✓ Migrated product_sku → sku');
      } catch (err) {
        console.warn('  ⚠ Could not migrate product_sku:', err.message);
      }

      // Step 3: Set NOT NULL constraints
      console.log('\nStep 3: Adding NOT NULL constraints...');
      try {
        await sequelize.query('ALTER TABLE stock_records ALTER COLUMN item_type SET NOT NULL');
        console.log('  ✓ Set item_type NOT NULL');
      } catch (err) {
        console.warn('  ⚠ item_type constraint:', err.message);
      }

      try {
        await sequelize.query('ALTER TABLE stock_records ALTER COLUMN fk_id SET NOT NULL');
        console.log('  ✓ Set fk_id NOT NULL');
      } catch (err) {
        console.warn('  ⚠ fk_id constraint:', err.message);
      }

      try {
        await sequelize.query('ALTER TABLE stock_records ALTER COLUMN sku SET NOT NULL');
        console.log('  ✓ Set sku NOT NULL');
      } catch (err) {
        console.warn('  ⚠ sku constraint:', err.message);
      }

      // Step 4: Add CHECK constraint
      console.log('\nStep 4: Adding CHECK constraint for item_type...');
      try {
        await sequelize.query(`
          ALTER TABLE stock_records 
          ADD CONSTRAINT check_item_type 
          CHECK (item_type IN ('material', 'product'))
        `);
        console.log('  ✓ Added item_type CHECK constraint');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('  ℹ CHECK constraint already exists');
        } else {
          console.warn('  ⚠ Could not add constraint:', err.message);
        }
      }

      // Step 5: Update status validation and default
      console.log('\nStep 5: Updating status column validation...');
      try {
        await sequelize.query(`ALTER TABLE stock_records DROP CONSTRAINT IF EXISTS check_status`);
        console.log('  ✓ Dropped old status constraint');
      } catch (err) {
        console.warn('  ⚠ Old constraint not found (expected):', err.message);
      }

      try {
        await sequelize.query(`
          ALTER TABLE stock_records 
          ADD CONSTRAINT check_status 
          CHECK (status IN ('active', 'inactive', 'deleted', 'pending'))
        `);
        console.log('  ✓ Added status CHECK constraint with valid values');
      } catch (err) {
        console.warn('  ⚠ Could not add status constraint:', err.message);
      }

      try {
        await sequelize.query(`ALTER TABLE stock_records ALTER COLUMN status SET DEFAULT 'active'`);
        console.log('  ✓ Updated status default to \'active\'');
      } catch (err) {
        console.warn('  ⚠ Could not update default:', err.message);
      }

      try {
        await sequelize.query(`
          UPDATE stock_records 
          SET status = 'active' 
          WHERE status NOT IN ('active', 'inactive', 'deleted', 'pending')
        `);
        console.log('  ✓ Migrated old status values to valid enum');
      } catch (err) {
        console.warn('  ⚠ Could not migrate status values:', err.message);
      }

      console.log('\n✅ Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Verify data: SELECT item_type, COUNT(*) FROM stock_records GROUP BY item_type;');
      console.log('2. Verify status: SELECT status, COUNT(*) FROM stock_records GROUP BY status;');
      console.log('3. Test application with new schema');
      console.log('4. Once verified, optionally drop old columns:');
      console.log('   ALTER TABLE stock_records DROP COLUMN product_id;');
      console.log('   ALTER TABLE stock_records DROP COLUMN product_sku;');

    } else if (direction === 'down') {
      console.log('\n⚠️  Rolling back migration...\n');

      // Rollback steps
      console.log('Step 1: Dropping CHECK constraint...');
      try {
        await sequelize.query('ALTER TABLE stock_records DROP CONSTRAINT check_item_type');
        console.log('  ✓ Dropped check_item_type constraint');
      } catch (err) {
        console.warn('  ⚠ Constraint not found or already dropped:', err.message);
      }

      console.log('\nStep 2: Migrating data back to old columns...');
      try {
        await sequelize.query(`
          UPDATE stock_records 
          SET product_id = fk_id 
          WHERE product_id IS NULL AND fk_id IS NOT NULL
        `);
        console.log('  ✓ Migrated fk_id → product_id');
      } catch (err) {
        console.warn('  ⚠ Could not migrate fk_id:', err.message);
      }

      try {
        await sequelize.query(`
          UPDATE stock_records 
          SET product_sku = sku 
          WHERE product_sku IS NULL AND sku IS NOT NULL
        `);
        console.log('  ✓ Migrated sku → product_sku');
      } catch (err) {
        console.warn('  ⚠ Could not migrate sku:', err.message);
      }

      console.log('\nStep 3: Dropping new columns...');
      try {
        await sequelize.query('ALTER TABLE stock_records DROP COLUMN item_type');
        console.log('  ✓ Dropped item_type column');
      } catch (err) {
        console.warn('  ⚠ item_type not found:', err.message);
      }

      try {
        await sequelize.query('ALTER TABLE stock_records DROP COLUMN fk_id');
        console.log('  ✓ Dropped fk_id column');
      } catch (err) {
        console.warn('  ⚠ fk_id not found:', err.message);
      }

      try {
        await sequelize.query('ALTER TABLE stock_records DROP COLUMN sku');
        console.log('  ✓ Dropped sku column');
      } catch (err) {
        console.warn('  ⚠ sku not found:', err.message);
      }

      console.log('\n✅ Rollback completed!');

    } else if (direction === 'status') {
      console.log('\n📊 Checking migration status...\n');
      
      try {
        const result = await sequelize.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'stock_records'
          AND column_name IN ('item_type', 'fk_id', 'sku', 'product_id', 'product_sku')
          ORDER BY column_name
        `);
        
        if (result[0].length === 0) {
          console.log('❌ New schema not found. Migration not applied.');
        } else {
          console.log('✓ Found columns:');
          result[0].forEach(col => {
            const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
            console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}`);
          });
        }
      } catch (err) {
        console.error('Error checking status:', err.message);
      }

    } else {
      console.log('Usage: node run-stock-migration.js [up|down|status]');
      console.log('\n  up     - Apply migration');
      console.log('  down   - Rollback migration');
      console.log('  status - Check migration status');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

migrate();
