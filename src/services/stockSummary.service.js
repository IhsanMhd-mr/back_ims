import StockSummaryRepo from '../repositories/stockSummary.repository.js';
import StockRepo from '../repositories/stock.repository.js';

const StockSummaryService = {
    /**
     * Generate monthly stock summary with validation
     * 
     * Step 1: Check if summary for asked month already exists → ABORT if found
     * Step 2: Check if previous month's summary exists → use closing_qty as opening
     * Step 3: If no previous summary → calculate opening from stock records
     * Step 4: Calculate closing = opening + in - out and save
     */
    generateMonthlySummary: async (payload) => {
        try {
            const { sku = null, variant_id = null, month, year } = payload;

            if (!month || !year) {
                return { success: false, message: 'month and year are required' };
            }

            if (!sku && !variant_id) {
                return { success: false, message: 'sku or variant_id is required' };
            }

            const askedDate = `${year}-${String(month).padStart(2, '0')}-01`;
            console.log(`\n[MonthlySummary] ========================================`);
            console.log(`[MonthlySummary] Generating for ${askedDate} | SKU: ${sku || 'N/A'} | Variant: ${variant_id || 'N/A'}`);

            // ============================================
            // STEP 1: Check if asked month's summary already exists
            // ============================================
            const existingSummary = await StockSummaryRepo.getSummaryByExactDate({
                sku, variant_id, date: askedDate
            });

            if (existingSummary.success && existingSummary.data) {
                console.log(`[MonthlySummary] ❌ ABORT: Summary for ${askedDate} already exists (ID: ${existingSummary.data.id})`);
                return { 
                    success: false, 
                    message: `Summary for ${year}-${String(month).padStart(2, '0')} already exists`,
                    data: existingSummary.data
                };
            }

            console.log(`[MonthlySummary] ✅ Step 1: No existing summary for ${askedDate}, proceeding...`);

            // ============================================
            // STEP 1.5: Check if stock records exist for this item
            // Prevents creating empty summaries for items with no history
            // ============================================
            const lastDayOfMonth = new Date(year, month, 0).toISOString().split('T')[0];
            const stockCheck = await StockRepo.hasStockRecords({ 
                sku, 
                variant_id, 
                beforeDate: lastDayOfMonth 
            });

            if (!stockCheck.success) {
                return { success: false, message: stockCheck.message };
            }

            if (!stockCheck.exists) {
                console.log(`[MonthlySummary] ❌ ABORT: No stock records found for this item up to ${lastDayOfMonth}`);
                return { 
                    success: false, 
                    message: `No stock records found for this item up to ${year}-${String(month).padStart(2, '0')}. Cannot create empty summary.`
                };
            }

            console.log(`[MonthlySummary] ✅ Step 1.5: Found ${stockCheck.count} stock records (${stockCheck.firstRecordDate} to ${stockCheck.lastRecordDate})`);

            // ============================================
            // Get item details from stock records
            // ============================================
            const itemDetails = await StockRepo.getItemDetails({ sku, variant_id });
            if (!itemDetails.success || !itemDetails.data) {
                return { success: false, message: 'Item not found in stock records' };
            }

            const { item_type, fk_id, item_name, unit } = itemDetails.data;

            // ============================================
            // STEP 2: Check if previous month's summary exists
            // ============================================
            let opening_stock = 0;
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            const prevDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

            console.log(`[MonthlySummary] Step 2: Looking for previous summary: ${prevDate}`);

            const prevSummary = await StockSummaryRepo.getSummaryByExactDate({
                sku, variant_id, date: prevDate
            });

            if (prevSummary.success && prevSummary.data) {
                opening_stock = Number(prevSummary.data.closing_qty) || 0;
                console.log(`[MonthlySummary] ✅ Step 2: Found previous summary | Opening: ${opening_stock}`);
            } else {
                // ============================================
                // STEP 3: No previous summary - calculate from stock records
                // ============================================
                console.log(`[MonthlySummary] ⚠️ Step 2: No previous summary found`);
                console.log(`[MonthlySummary] Step 3: Calculating opening from stock records before ${askedDate}...`);
                
                const openingResult = await StockRepo.getOpeningStock({
                    sku, variant_id, month, year
                });
                opening_stock = openingResult.opening_stock || 0;
                console.log(`[MonthlySummary] ✅ Step 3: Calculated opening from stock records: ${opening_stock}`);
            }

            // ============================================
            // STEP 4: Get monthly totals and calculate closing
            // ============================================
            const monthlyResult = await StockRepo.getMonthlyTotals({
                sku, variant_id, month, year
            });

            const total_in = monthlyResult.data?.total_in || 0;
            const total_out = monthlyResult.data?.total_out || 0;
            const closing_stock = opening_stock + total_in - total_out;

            console.log(`[MonthlySummary] Step 4: Calculation: ${opening_stock} + ${total_in} - ${total_out} = ${closing_stock}`);

            // Prepare and save summary data
            const summaryData = {
                date: askedDate,
                sku,
                variant_id,
                item_type,
                fk_id,
                item_name,
                unit,
                opening_qty: opening_stock,
                in_qty: total_in,
                out_qty: total_out,
                closing_qty: closing_stock,
                opening_value: 0,
                in_value: 0,
                out_value: 0,
                closing_value: 0,
                createdBy: payload.createdBy || null
            };

            const result = await StockSummaryRepo.upsertStockSummary(summaryData);
            console.log(`[MonthlySummary] ✅ ${result.message} for ${askedDate}`);
            console.log(`[MonthlySummary] ========================================\n`);
            return result;

        } catch (error) {
            console.error('Error in generateMonthlySummary:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Generate monthly summaries for ALL items (used by cron job)
     * 
     * LOOP STRUCTURE:
     * 1. Get all distinct SKUs from stock records
     * 2. For each SKU:
     *    a. Get all variants for that SKU
     *    b. For each variant:
     *       - Check if variant has stock records → if NOT, skip to next variant
     *       - Get first record date to determine start month
     *       - Loop through each month from first record to target month
     *       - Generate/update summary for each month
     * 
     * @param {Object} params - { month, year, createdBy }
     */
    generateAllMonthlySummaries: async ({ month, year, createdBy = null }) => {
        try {
            console.log(`\n[CronJob] ════════════════════════════════════════════════════════`);
            console.log(`[CronJob] Starting Monthly Summary Generation`);
            console.log(`[CronJob] Target Period: Up to ${year}-${String(month).padStart(2, '0')}`);
            console.log(`[CronJob] ════════════════════════════════════════════════════════\n`);

            // ══════════════════════════════════════════════════════════════
            // STEP 1: Get all distinct SKUs from stock records
            // ══════════════════════════════════════════════════════════════
            const skuResult = await StockRepo.getDistinctSKUs();
            if (!skuResult.success || !skuResult.data?.length) {
                return { success: false, message: 'No SKUs found in stock records' };
            }

            const allSKUs = skuResult.data;
            console.log(`[CronJob] Step 1: Found ${allSKUs.length} unique SKUs`);
            console.log(`[CronJob] SKUs: ${allSKUs.join(', ')}\n`);

            const results = {
                skusProcessed: 0,
                variantsProcessed: 0,
                summariesCreated: [],
                summariesSkipped: [],
                variantsNoRecords: [],
                failed: []
            };

            // ══════════════════════════════════════════════════════════════
            // STEP 2: Loop through each SKU
            // ══════════════════════════════════════════════════════════════
            for (const sku of allSKUs) {
                console.log(`\n[CronJob] ┌──────────────────────────────────────────────────────`);
                console.log(`[CronJob] │ SKU: ${sku}`);
                console.log(`[CronJob] └──────────────────────────────────────────────────────`);
                results.skusProcessed++;

                // ══════════════════════════════════════════════════════════
                // STEP 2a: Get all variants for this SKU
                // ══════════════════════════════════════════════════════════
                const variantsResult = await StockRepo.getVariantsBySKU(sku);
                if (!variantsResult.success || !variantsResult.data?.length) {
                    console.log(`[CronJob]   ⚠️ No variants found for SKU: ${sku}, skipping...`);
                    continue;
                }

                const variants = variantsResult.data;
                console.log(`[CronJob]   Found ${variants.length} variant(s): ${variants.join(', ')}`);

                // ══════════════════════════════════════════════════════════
                // STEP 2b: Loop through each variant
                // ══════════════════════════════════════════════════════════
                for (const variant_id of variants) {
                    console.log(`\n[CronJob]   ├─ Variant: ${variant_id || 'NULL'}`);
                    results.variantsProcessed++;

                    // ══════════════════════════════════════════════════════
                    // CHECK: Does this variant have stock records?
                    // ══════════════════════════════════════════════════════
                    const stockCheck = await StockRepo.hasStockRecords({ sku, variant_id });
                    
                    if (!stockCheck.exists) {
                        console.log(`[CronJob]   │  ❌ No stock records found → SKIP to next variant`);
                        results.variantsNoRecords.push({ sku, variant_id });
                        continue; // Skip to next variant
                    }

                    // Get the first record date to determine start month
                    const firstRecordDate = new Date(stockCheck.firstRecordDate);
                    const startMonth = firstRecordDate.getMonth() + 1; // 1-12
                    const startYear = firstRecordDate.getFullYear();

                    console.log(`[CronJob]   │  ✓ Records found: ${stockCheck.count} (${stockCheck.firstRecordDate} → ${stockCheck.lastRecordDate})`);
                    console.log(`[CronJob]   │  Generating: ${startYear}-${String(startMonth).padStart(2, '0')} → ${year}-${String(month).padStart(2, '0')}`);

                    // ══════════════════════════════════════════════════════
                    // LOOP: Generate summary for each month
                    // ══════════════════════════════════════════════════════
                    let currentMonth = startMonth;
                    let currentYear = startYear;

                    while (currentYear < year || (currentYear === year && currentMonth <= month)) {
                        const periodKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

                        const result = await StockSummaryService.generateMonthlySummary({
                            sku,
                            variant_id,
                            month: currentMonth,
                            year: currentYear,
                            createdBy
                        });

                        if (result.success) {
                            console.log(`[CronJob]   │    ✅ ${periodKey} - Created`);
                            results.summariesCreated.push({ sku, variant_id, period: periodKey });
                        } else if (result.message?.includes('already exists')) {
                            console.log(`[CronJob]   │    ⏭️ ${periodKey} - Already exists`);
                            results.summariesSkipped.push({ sku, variant_id, period: periodKey });
                        } else if (result.message?.includes('No stock records')) {
                            console.log(`[CronJob]   │    ⏭️ ${periodKey} - No records for period`);
                            results.summariesSkipped.push({ sku, variant_id, period: periodKey, reason: 'no records' });
                        } else {
                            console.log(`[CronJob]   │    ❌ ${periodKey} - ${result.message}`);
                            results.failed.push({ sku, variant_id, period: periodKey, message: result.message });
                        }

                        // Move to next month
                        currentMonth++;
                        if (currentMonth > 12) {
                            currentMonth = 1;
                            currentYear++;
                        }
                    }
                }
            }

            // ══════════════════════════════════════════════════════════════
            // SUMMARY
            // ══════════════════════════════════════════════════════════════
            console.log(`\n[CronJob] ════════════════════════════════════════════════════════`);
            console.log(`[CronJob] SUMMARY GENERATION COMPLETE`);
            console.log(`[CronJob] ────────────────────────────────────────────────────────`);
            console.log(`[CronJob] 📦 SKUs processed:        ${results.skusProcessed}`);
            console.log(`[CronJob] 🔹 Variants processed:    ${results.variantsProcessed}`);
            console.log(`[CronJob] ✅ Summaries created:     ${results.summariesCreated.length}`);
            console.log(`[CronJob] ⏭️ Summaries skipped:     ${results.summariesSkipped.length}`);
            console.log(`[CronJob] 🚫 Variants no records:   ${results.variantsNoRecords.length}`);
            console.log(`[CronJob] ❌ Failed:                ${results.failed.length}`);
            console.log(`[CronJob] ════════════════════════════════════════════════════════\n`);

            return {
                success: true,
                data: results,
                message: `Processed ${results.skusProcessed} SKUs, ${results.variantsProcessed} variants: ${results.summariesCreated.length} created, ${results.summariesSkipped.length} skipped, ${results.failed.length} failed`
            };

        } catch (error) {
            console.error('[CronJob] Error in generateAllMonthlySummaries:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Add single stock summary (legacy method, uses generateMonthlySummary logic)
     */
    addStockSummary: async (payload) => {
        try {
            const result = await StockSummaryService.generateMonthlySummary(payload);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    addStockSummaryBulk: async (stockSummaryDataArray) => {
        try {
            if (!Array.isArray(stockSummaryDataArray) || stockSummaryDataArray.length === 0) {
                return { success: false, message: 'stockSummaryDataArray must be a non-empty array' };
            }
            const result = await StockSummaryRepo.bulkCreateStockSummaryEntries(stockSummaryDataArray);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getStockSummarys: async (filters = {}) => {
        try {
            const result = await StockSummaryRepo.getStockSummarys(filters);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },
getSpecificMonthSummary: async (payload) => {
        try {
            const result = await StockRepo.getSpecificMonthSummary(payload);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },
    getStockSummaryById: async (id) => {
        try {
            const result = await StockSummaryRepo.getStockSummaryById(id);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateStockSummary: async (id, updateData) => {
        try {
            const result = await StockSummaryRepo.updateStockSummary(id, updateData);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateStockSummaryStatus: async (id, status) => {
        try {
            const result = await StockSummaryRepo.updateStockSummaryStatus(id, status);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    deleteStockSummary: async (id) => {
        try {
            const result = await StockSummaryRepo.deleteStockSummary(id);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    createStockSummaryFromBillCompletion: async (bill, user_id) => {
        try {
            if (!bill?.items?.length) {
                return { success: false, message: 'No bill items' };
            }

            const { id: billId, bill_number: billNumber, items } = bill;
            console.log(`[STOCK] START: ${billNumber}(${billId}) → ${items.length} items | User: ${user_id}`);

            // Map bill items to stockSummary entries
            const stockSummaryEntries = items.map(item => ({
                item_type: 'PRODUCT',
                fk_id: item.product_id,
                sku: item.sku,
                variant_id: item.variant_id,
                item_name: item.product_name,
                batch_number: billNumber,
                qty: item.quantity,
                cost: Number(item.unit_price) || 0,
                movement_type: 'OUT',
                source: 'SALES',
                description: `Sale from Bill ${billNumber}`,
                date: new Date().toISOString().split('T')[0],
                status: 'COMPLETED',
                createdBy: user_id
            }));

            console.log(`[STOCK] Prepared: ${stockSummaryEntries.length} entries ready for bulk create`);
            const result = await StockSummaryRepo.bulkCreateStockSummaryEntries(stockSummaryEntries);
            
            if (result.success) {
                console.log(`[STOCK] ✅ SUCCESS: ${billNumber} | Created: ${result.data?.length} | Approved: User ${user_id}`);
            } else {
                console.log(`[STOCK] ❌ FAILED: ${billNumber} | Error: ${result.message}`);
            }
            
            return result;
        } catch (error) {
            console.error(`[STOCK] ERROR:`);
            console.error(`├─ Bill: ${bill?.bill_number || 'N/A'}`);
            console.error(`├─ User: ${user_id}`);
            console.error(`├─ Message: ${error.message}`);
            console.error(`└─ Stack: ${error.stack}`);
            return { success: false, message: error.message };
        }
    },

    searchStockSummarys: async (searchTerm) => {
        try {
            const result = await StockSummaryRepo.searchStockSummarys(searchTerm);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};

export default StockSummaryService;