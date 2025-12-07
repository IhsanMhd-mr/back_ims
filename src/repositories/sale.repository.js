import { BillRepo } from './bill.repository.js';

// SaleRepo now proxies to BillRepo since sales are represented by bills.
const SaleRepo = {
  createSale: async (data) => {
    // Not used — creation should go through BillController.create
    return { success: false, message: 'Direct Sale creation is disabled; use /bills/add' };
  },

  getAll: async (opts) => {
    return BillRepo.getAll(opts);
  },

  getById: async (id) => {
    return BillRepo.getById(id);
  },

  updateSale: async (id, data) => {
    return BillRepo.updateBill(id, data);
  },

  deleteSale: async (id, options) => {
    return BillRepo.deleteBill(id, options);
  }
};

export { SaleRepo };
