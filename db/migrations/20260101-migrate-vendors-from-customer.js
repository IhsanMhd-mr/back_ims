"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Move all customers with type 'supplier' or 'both' to the vendor table
    // 1. Select relevant customers
    const [vendors] = await queryInterface.sequelize.query(`
      SELECT * FROM customer WHERE type IN ('supplier', 'both') AND deleted_at IS NULL
    `);
    // 2. Insert into vendor table
    for (const vendor of vendors) {
      await queryInterface.bulkInsert('vendor', [{
        unique_id: vendor.unique_id,
        company_name: vendor.company_name,
        supplier_name: vendor.supplier_name,
        contact_no: vendor.contact_no,
        address: vendor.address,
        remarks: vendor.remarks,
        status: vendor.status,
        created_by: vendor.created_by,
        updated_by: vendor.updated_by,
        deleted_by: vendor.deleted_by,
        created_at: vendor.created_at,
        updated_at: vendor.updated_at,
        deleted_at: vendor.deleted_at
      }]);
    }
    // 3. Optionally, mark these customers as deleted or remove them
    await queryInterface.bulkUpdate('customer', { deleted_at: new Date() }, { type: ['supplier', 'both'] });
  },

  down: async (queryInterface, Sequelize) => {
    // Optionally, move vendors back to customer table (not implemented)
    await queryInterface.bulkDelete('vendor', null, {});
  },
};
