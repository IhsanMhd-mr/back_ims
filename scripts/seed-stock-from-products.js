// Seeder: seed-stock-from-products.js
// Reads an embedded product list and POSTs stock rows to /stock/add
// Usage (PowerShell):
//   set API_BASE=http://localhost:3000; node .\scripts\seed-stock-from-products.js

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

const productsResponse = {
  "success": true,
  "data": [
    { "id": 18, "sku": "SKU-ABC", "variant_id": "SKU-ABC*8", "name": "Test Product ABC", "quantity": 100, "cost": "904", "mrp": "11" },
    { "id": 17, "sku": "SKU-ABC", "variant_id": "SKU-ABC*7", "name": "Test Product ABC", "quantity": 100, "cost": "904", "mrp": "11" },
    { "id": 16, "sku": "SKU-ABC", "variant_id": "SKU-ABC*6", "name": "Test Product ABC", "quantity": 100, "cost": "904", "mrp": "1" },
    { "id": 14, "sku": "pr0013", "variant_id": "pr0013", "name": "Product 13r", "quantity": 12, "cost": "12", "mrp": "34510" },
    { "id": 13, "sku": "SKU-ABC", "variant_id": "SKU-ABC*5", "name": "Test Product ABC", "quantity": 100, "cost": "904", "mrp": "653650100" },
    { "id": 12, "sku": "SKU-ABC", "variant_id": "SKU-ABC*4", "name": "Test Product ABC", "quantity": 100, "cost": "90", "mrp": "6536501230" },
    { "id": 11, "sku": "SKU-ABC", "variant_id": "SKU-ABC*3", "name": "Test Product ABC", "quantity": 100, "cost": "90", "mrp": "1" },
    { "id": 10, "sku": "SKU-ABC", "variant_id": "SKU-ABC*1", "name": "Test Product ABC", "quantity": 100, "cost": "90", "mrp": "653650" },
    { "id": 9, "sku": "SKU-ABC", "variant_id": "SKU-ABC*2", "name": "Test Product ABC", "quantity": 100, "cost": "90", "mrp": "65365" },
    { "id": 8, "sku": "SKU-ABC", "variant_id": "SKU-ABC*promo1", "name": "Test Product ABC", "quantity": 100, "cost": "90", "mrp": "120" },
    { "id": 7, "sku": "SKU-ABC", "variant_id": "SKU-ABC", "name": "Test Product ABC", "quantity": 100, "cost": "100", "mrp": "150" },
    { "id": 5, "sku": "P-005", "variant_id": "P-005", "name": "Product 5r", "quantity": 5, "cost": "25.00", "mrp": "30.00" },
    { "id": 4, "sku": "P-004", "variant_id": "P-004", "name": "Product 4", "quantity": 4, "cost": "20.00", "mrp": "24.00" },
    { "id": 3, "sku": "P-003", "variant_id": "P-003", "name": "Product 3", "quantity": 3, "cost": "15.00", "mrp": "18.00" },
    { "id": 2, "sku": "P-002", "variant_id": "P-002", "name": "Gadget B", "quantity": 2, "cost": "20.00", "mrp": "24.00" },
    { "id": 1, "sku": "P-001", "variant_id": "P-001", "name": "Widget A", "quantity": 1, "cost": "10.00", "mrp": "12.00" }
  ],
  "meta": { "total": 16, "page": 1, "limit": 20, "pages": 1 }
};

async function postStockRow(product, override = {}) {
  try {
    const body = {
      product_id: Number(product.id),
      product_sku: product.sku || null,
      variant_id: product.variant_id,
      batch_number: override.batch_number || null,
      qty: override.qty ?? (product.quantity ?? 10), // prefer product.quantity when present
      cost: override.cost ?? (product.cost || product.mrp || 0),
      description: override.description ?? 'seeded via seed-stock-from-products',
      status: override.status ?? 'available'
    };

    const res = await fetch(`${API_BASE}/stock/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const txt = await res.text();
    let parsed;
    try { parsed = JSON.parse(txt); } catch (e) { parsed = txt; }

    console.log(`POST ${product.variant_id} -> ${res.status}`, parsed);
  } catch (err) {
    console.error('POST error for', product.variant_id, err.message);
  }
}

(async function run() {
  console.log('Seeding stock to', API_BASE);
  const products = productsResponse.data || [];
  for (const p of products) {
    // small delay to avoid hammering server
    await postStockRow(p);
    await new Promise(r => setTimeout(r, 150));
  }
  console.log('Seeding complete.');
})();
