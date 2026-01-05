import sequelize from '../src/config/db.js';

async function diagnose() {
  console.log('🔍 Database Performance Diagnostics\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. Check table sizes
    console.log('\n📊 TABLE SIZES:');
    const [tableSizes] = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS data_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `);
    console.table(tableSizes);
    
    // 2. Check row counts
    console.log('\n📈 ROW COUNTS:');
    const [rowCounts] = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC;
    `);
    console.table(rowCounts);
    
    // 3. Check indexes
    console.log('\n🔑 INDEX STATUS:');
    const [indexes] = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, idx_scan DESC;
    `);
    console.table(indexes);
    
    // 4. Check missing indexes (foreign keys without indexes)
    console.log('\n⚠️  POTENTIAL MISSING INDEXES:');
    const [missingIndexes] = await sequelize.query(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = tc.table_name 
          AND indexdef LIKE '%' || kcu.column_name || '%'
        )
      ORDER BY tc.table_name;
    `);
    
    if (missingIndexes.length > 0) {
      console.table(missingIndexes);
      console.log('\n💡 Recommendation: Add indexes on these foreign key columns');
    } else {
      console.log('✅ All foreign keys have indexes');
    }
    
    // 5. Check slow queries (if pg_stat_statements is enabled)
    console.log('\n🐌 CHECKING FOR SLOW QUERY TRACKING...');
    try {
      const [slowQueries] = await sequelize.query(`
        SELECT 
          LEFT(query, 80) as query_preview,
          calls,
          ROUND(total_exec_time::numeric, 2) as total_time_ms,
          ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
          ROUND(max_exec_time::numeric, 2) as max_time_ms
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC
        LIMIT 10;
      `);
      console.log('\n⏱️  TOP 10 SLOWEST QUERIES (by average time):');
      console.table(slowQueries);
    } catch (err) {
      console.log('⚠️  pg_stat_statements extension not available');
      console.log('   To enable, run: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;');
    }
    
    // 6. Check connection pool
    console.log('\n🔌 DATABASE CONNECTION INFO:');
    const [connections] = await sequelize.query(`
      SELECT 
        datname as database,
        COUNT(*) as connections,
        MAX(state) as state
      FROM pg_stat_activity
      WHERE datname IS NOT NULL
      GROUP BY datname;
    `);
    console.table(connections);
    
    // 7. Check for locks
    console.log('\n🔒 ACTIVE LOCKS:');
    const [locks] = await sequelize.query(`
      SELECT 
        pg_class.relname as table_name,
        pg_locks.mode,
        pg_locks.granted
      FROM pg_locks
      JOIN pg_class ON pg_locks.relation = pg_class.oid
      WHERE pg_class.relkind = 'r'
      ORDER BY pg_class.relname;
    `);
    
    if (locks.length > 0) {
      console.table(locks);
    } else {
      console.log('✅ No active locks');
    }
    
    // 8. Recommendations
    console.log('\n' + '='.repeat(60));
    console.log('💡 PERFORMANCE RECOMMENDATIONS:\n');
    
    const bills = await sequelize.query(`SELECT COUNT(*) as count FROM bills`);
    const itemSales = await sequelize.query(`SELECT COUNT(*) as count FROM item_sales`);
    const billCount = bills[0][0].count;
    const itemCount = itemSales[0][0].count;
    
    console.log(`📊 Bills: ${billCount} | Item Sales: ${itemCount}`);
    
    if (billCount > 10000) {
      console.log('⚠️  Large dataset detected. Consider:');
      console.log('   - Partitioning old bills by date');
      console.log('   - Archiving completed bills older than 1 year');
    }
    
    const deadRows = rowCounts.find(r => r.tablename === 'bills')?.dead_rows || 0;
    if (deadRows > billCount * 0.2) {
      console.log(`⚠️  High dead row count (${deadRows}). Run: VACUUM ANALYZE bills;`);
    }
    
    const unusedIndexes = indexes.filter(i => i.scans === '0' && i.tablename === 'bills');
    if (unusedIndexes.length > 0) {
      console.log('⚠️  Unused indexes detected (consider dropping):');
      unusedIndexes.forEach(idx => console.log(`   - ${idx.indexname}`));
    }
    
    console.log('\n✅ Diagnostics complete!');
    
  } catch (error) {
    console.error('❌ Diagnostics failed:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

diagnose();
