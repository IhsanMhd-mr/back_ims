import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

/**
 * Creates an Excel file with dynamic columns and data
 * @param {Array} columns - Array of column definitions: [{ header: 'Name', key: 'name', datatype: 'string', width: 20 }]
 * @param {Array} data - Array of data objects matching the column keys
 * @param {string} filename - Output filename (default: 'output.xlsx')
 * @param {string} sheetName - Worksheet name (default: 'Sheet1')
 * @param {string} namePrefix - Optional prefix for the filename (e.g., 'stock-', 'invoice-')
 * @returns {Promise<string>} Path to generated file
 */
async function createExcelFile(columns = [], data = [], filename = './output.xlsx', sheetName = 'Sheet1', namePrefix = '') {
    // Define temporary folder path
    const tempFolderPath = path.join(process.cwd(), 'src', 'temp', 'exports');
    
    // Ensure temp folder exists
    if (!fs.existsSync(tempFolderPath)) {
        fs.mkdirSync(tempFolderPath, { recursive: true });
    }
    
    // Construct full file path with prefix
    const baseFilename = path.basename(filename);
    const prefixedFilename = namePrefix ? `${namePrefix}${baseFilename}` : baseFilename;
    const fullFilePath = path.join(tempFolderPath, prefixedFilename);
    
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'IMS Backend';
    workbook.lastModifiedBy = 'IMS Backend';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Add a worksheet
    const worksheet = workbook.addWorksheet(sheetName);

    // Define date/time types
    const DATE_TYPES = ['date', 'datetime', 'timestamp', 'time'];
    const NUMBER_TYPES = ['number', 'decimal', 'integer', 'float'];
    const CURRENCY_TYPES = ['currency', 'money'];

    // Map columns with proper formatting
    const excelColumns = columns.map(col => {
        const columnDef = {
            header: col.header || col.key || 'Column',
            key: col.key || col.header?.toLowerCase().replace(/\s+/g, '_'),
            width: col.width || 15
        };

        // Apply formatting based on datatype
        const datatype = (col.datatype || '').toLowerCase();
        
        if (DATE_TYPES.includes(datatype)) {
            columnDef.style = { numFmt: 'yyyy-mm-dd' };
        } else if (datatype === 'datetime' || datatype === 'timestamp') {
            columnDef.style = { numFmt: 'yyyy-mm-dd hh:mm:ss' };
        } else if (datatype === 'time') {
            columnDef.style = { numFmt: 'hh:mm:ss' };
        } else if (NUMBER_TYPES.includes(datatype)) {
            columnDef.style = { numFmt: '#,##0.00' };
        } else if (CURRENCY_TYPES.includes(datatype)) {
            columnDef.style = { numFmt: '$#,##0.00' };
        }

        return columnDef;
    });

    // Set columns to worksheet
    worksheet.columns = excelColumns;

    // Add data rows
    if (Array.isArray(data) && data.length > 0) {
        data.forEach(row => {
            worksheet.addRow(row);
        });
    }

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // Auto-fit columns (optional)
    worksheet.columns.forEach(column => {
        if (!column.width) {
            let maxLength = 10;
            column.eachCell?.({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = Math.min(maxLength + 2, 50);
        }
    });

    // Save the workbook to a file
    try {
        await workbook.xlsx.writeFile(fullFilePath);
        console.log(`✅ Excel file "${fullFilePath}" generated successfully.`);
        return fullFilePath;
    } catch (error) {
        console.error('❌ Error writing Excel file:', error);
        throw error;
    }
}

/**
 * Example usage:
 * 
 * const columns = [
 *   { header: 'ID', key: 'id', width: 10, datatype: 'number' },
 *   { header: 'Name', key: 'name', width: 25, datatype: 'string' },
 *   { header: 'Date of Birth', key: 'dob', width: 15, datatype: 'date' },
 *   { header: 'Salary', key: 'salary', width: 15, datatype: 'currency' },
 *   { header: 'Created At', key: 'created_at', width: 20, datatype: 'datetime' }
 * ];
 * 
 * const data = [
 *   { id: 1, name: 'John Doe', dob: new Date(1990, 5, 15), salary: 50000, created_at: new Date() },
 *   { id: 2, name: 'Jane Smith', dob: new Date(1985, 3, 22), salary: 65000, created_at: new Date() }
 * ];
 * 
 * // Without prefix
 * await createExcelFile(columns, data, 'output.xlsx', 'Employees');
 * 
 * // With prefix (e.g., 'stock-output.xlsx')
 * await createExcelFile(columns, data, 'output.xlsx', 'Employees', 'stock-');
 */

export default createExcelFile;
