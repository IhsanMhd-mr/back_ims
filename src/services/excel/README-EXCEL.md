# Excel Export Service

Dynamic Excel file generator with automatic formatting and type-based styling.

## Overview

The `createExcelFile()` function generates Excel spreadsheets with:
- **Dynamic columns** - Define any number of columns with custom headers
- **Auto-formatting** - Automatic number, date, and currency formatting
- **Type detection** - Applies appropriate Excel formats based on datatype
- **Styled output** - Bold headers with background color
- **Temp storage** - Files saved to `temp/exports/` folder with optional prefixes

## Function Signature

```javascript
async function createExcelFile(columns, data, filename, sheetName, namePrefix)
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `columns` | Array | `[]` | Column definitions with headers, keys, widths, and datatypes |
| `data` | Array | `[]` | Array of data objects matching column keys |
| `filename` | String | `'output.xlsx'` | Output filename (saved to temp/exports/) |
| `sheetName` | String | `'Sheet1'` | Worksheet name in the Excel file |
| `namePrefix` | String | `''` | Optional prefix for filename (e.g., 'stock-', 'invoice-') |

### Column Definition

```javascript
{
  header: 'Column Name',    // Display name in Excel
  key: 'data_key',          // Property key in data objects
  width: 20,                // Column width (optional, default: 15)
  datatype: 'string'        // Data type for formatting
}
```

### Supported Datatypes

#### Text
- `string` - Plain text (no special formatting)

#### Numbers
- `number` - Formatted as `#,##0.00`
- `decimal` - Formatted as `#,##0.00`
- `integer` - Formatted as `#,##0.00`
- `float` - Formatted as `#,##0.00`

#### Currency
- `currency` - Formatted as `$#,##0.00`
- `money` - Formatted as `$#,##0.00`

#### Dates & Times
- `date` - Formatted as `yyyy-mm-dd`
- `datetime` - Formatted as `yyyy-mm-dd hh:mm:ss`
- `timestamp` - Formatted as `yyyy-mm-dd hh:mm:ss`
- `time` - Formatted as `hh:mm:ss`

## Usage Examples

### Basic Stock Export

```javascript
import createExcelFile from './services/excel.js';

const columns = [
  { header: 'SKU', key: 'sku', width: 15, datatype: 'string' },
  { header: 'Item Name', key: 'item_name', width: 25, datatype: 'string' },
  { header: 'Quantity', key: 'qty', width: 12, datatype: 'decimal' },
  { header: 'Unit Cost', key: 'cost', width: 15, datatype: 'currency' },
  { header: 'Date', key: 'date', width: 15, datatype: 'date' }
];

const data = [
  { sku: 'PROD0001', item_name: 'JD', qty: 120, cost: 50.00, date: new Date(2025, 11, 15) },
  { sku: 'MAT0004', item_name: 'SWD', qty: 375, cost: 27.50, date: new Date(2025, 11, 20) }
];

// Generates: temp/exports/stock-inventory-2025-12.xlsx
await createExcelFile(columns, data, 'inventory-2025-12.xlsx', 'Stock Data', 'stock-');
```

### Invoice Export

```javascript
const invoiceColumns = [
  { header: 'Invoice #', key: 'invoice_no', width: 12, datatype: 'string' },
  { header: 'Customer', key: 'customer_name', width: 25, datatype: 'string' },
  { header: 'Amount', key: 'amount', width: 15, datatype: 'currency' },
  { header: 'Date', key: 'invoice_date', width: 15, datatype: 'date' },
  { header: 'Status', key: 'status', width: 12, datatype: 'string' }
];

const invoices = [
  { invoice_no: 'INV-001', customer_name: 'ABC Corp', amount: 1250.00, invoice_date: new Date(), status: 'Paid' },
  { invoice_no: 'INV-002', customer_name: 'XYZ Ltd', amount: 3400.50, invoice_date: new Date(), status: 'Pending' }
];

// Generates: temp/exports/invoice-december-2025.xlsx
await createExcelFile(invoiceColumns, invoices, 'december-2025.xlsx', 'Invoices', 'invoice-');
```

### Sales Report

```javascript
const salesColumns = [
  { header: 'Date', key: 'sale_date', width: 15, datatype: 'date' },
  { header: 'Product', key: 'product', width: 20, datatype: 'string' },
  { header: 'Units Sold', key: 'units', width: 12, datatype: 'number' },
  { header: 'Revenue', key: 'revenue', width: 15, datatype: 'currency' },
  { header: 'Profit', key: 'profit', width: 15, datatype: 'currency' }
];

// Generates: temp/exports/report-Q4-2025.xlsx
await createExcelFile(salesColumns, salesData, 'Q4-2025.xlsx', 'Sales Report', 'report-');
```

## Integration with API Endpoints

### Example Controller Method

```javascript
// Stock summary export endpoint
async function exportStockSummary(req, res) {
  try {
    const { start_date, end_date } = req.query;
    
    // Fetch data from repository
    const stockData = await stockRepository.getStockSummary(start_date, end_date);
    
    // Define columns
    const columns = [
      { header: 'SKU', key: 'sku', width: 15, datatype: 'string' },
      { header: 'Item', key: 'item_name', width: 25, datatype: 'string' },
      { header: 'Opening Qty', key: 'opening_qty', width: 12, datatype: 'number' },
      { header: 'In Qty', key: 'in_qty', width: 12, datatype: 'number' },
      { header: 'Out Qty', key: 'out_qty', width: 12, datatype: 'number' },
      { header: 'Closing Qty', key: 'closing_qty', width: 12, datatype: 'number' },
      { header: 'Closing Value', key: 'closing_value', width: 15, datatype: 'currency' }
    ];
    
    // Generate filename with date range
    const filename = `${start_date}_to_${end_date}.xlsx`;
    
    // Create Excel file
    const filePath = await createExcelFile(
      columns, 
      stockData, 
      filename, 
      'Stock Summary', 
      'stock-summary-'
    );
    
    // Send file to client
    res.download(filePath, `stock-summary-${filename}`, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Optional: Delete temp file after download
      // fs.unlinkSync(filePath);
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
}
```

## File Organization

### Output Structure
```
backend/
├── temp/
│   └── exports/
│       ├── stock-inventory-2025-12.xlsx
│       ├── invoice-december-2025.xlsx
│       ├── report-Q4-2025.xlsx
│       └── ...
```

### Name Prefix Conventions

| Export Type | Prefix | Example |
|-------------|--------|---------|
| Stock Reports | `stock-` | `stock-monthly-report.xlsx` |
| Stock Summary | `stock-summary-` | `stock-summary-2025-12.xlsx` |
| Invoices | `invoice-` | `invoice-december.xlsx` |
| Sales Reports | `sales-` | `sales-Q4-2025.xlsx` |
| Customer Data | `customer-` | `customer-list.xlsx` |
| Bills | `bill-` | `bill-summary.xlsx` |
| Products | `product-` | `product-catalog.xlsx` |
| Materials | `material-` | `material-inventory.xlsx` |

## Features

### Automatic Styling
- **Headers**: Bold font with gray background (`#E0E0E0`)
- **Numbers**: Thousand separators and 2 decimal places
- **Currency**: Dollar sign with thousand separators
- **Dates**: ISO format (yyyy-mm-dd)
- **Auto-fit**: Column widths adjust to content (max 50 chars)

### Error Handling
```javascript
try {
  const filePath = await createExcelFile(columns, data, filename, sheetName, prefix);
  console.log(`✅ Excel file created: ${filePath}`);
} catch (error) {
  console.error('❌ Excel generation failed:', error);
  throw error;
}
```

## Dependencies

- **ExcelJS** (v4.x): Excel file generation library
  ```bash
  npm install exceljs
  ```

## Notes

- Files are automatically saved to `temp/exports/` directory
- Directory is created automatically if it doesn't exist
- Consider implementing cleanup for old temp files
- For large datasets, consider streaming for better memory efficiency
- Return value is the full file path for download/cleanup operations

## Future Enhancements

- [ ] Conditional folder paths based on file type
- [ ] Custom styling options per column
- [ ] Multiple worksheets in single file
- [ ] Chart generation
- [ ] Template-based exports
- [ ] Automatic cleanup of old temp files
- [ ] Progress callbacks for large datasets
- [ ] CSV format option
