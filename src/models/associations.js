import { Bill } from './bill.model.js';
import { ItemSale } from './item-sale.model.js';
import { ConversionTemplate } from './conversion-template.model.js';
import { ConversionRecord } from './conversion-record.model.js';

// Setup associations
Bill.hasMany(ItemSale, { foreignKey: 'bill_id', as: 'items', onDelete: 'CASCADE', hooks: true });
ItemSale.belongsTo(Bill, { foreignKey: 'bill_id', as: 'bill' });

ConversionRecord.belongsTo(ConversionTemplate, { foreignKey: 'template_id', as: 'template' });
ConversionTemplate.hasMany(ConversionRecord, { foreignKey: 'template_id', as: 'records' });

export default function initAssociations() {
  // This file runs on import to ensure associations exist.
  return { Bill, ItemSale, ConversionTemplate, ConversionRecord };
}
