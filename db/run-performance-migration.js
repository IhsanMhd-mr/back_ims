import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔍 Running performance indexes migration...');
    
    const migrationPath = path.join(__dirname, 'migrations', '20260102-add-performance-indexes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Remove comments and split by semicolon
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .filter(stmt => stmt.trim().length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement.length === 0) continue;
      
      try {
        console.log(`\n⚡ Executing statement ${i + 1}/${statements.length}...`);
        await sequelize.query(statement);
        console.log(`✅ Statement ${i + 1} completed`);
      } catch (err) {
        // Ignore "already exists" errors
        if (err.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          throw err;
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Verifying indexes...');
    
    const [indexes] = await sequelize.query(`
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('bills', 'item_sales') 
      ORDER BY tablename, indexname;
    `);
    
    console.log('\n📋 Current indexes:');
    console.table(indexes);
    
    console.log('\n🎯 Performance tips:');
    console.log('1. Monitor slow queries with: SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;');
    console.log('2. Check index usage with: SELECT * FROM pg_stat_user_indexes WHERE tablename IN (\'bills\', \'item_sales\');');
    console.log('3. Run VACUUM ANALYZE periodically to maintain performance');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();
