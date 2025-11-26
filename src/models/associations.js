import { Bill } from './bill.model.js';
import { ItemSale } from './item-sale.model.js';

// Setup associations
Bill.hasMany(ItemSale, { foreignKey: 'bill_id', as: 'items', onDelete: 'CASCADE', hooks: true });
ItemSale.belongsTo(Bill, { foreignKey: 'bill_id', as: 'bill' });

export default function initAssociations() {
  // This file runs on import to ensure associations exist.
  return { Bill, ItemSale };
}
