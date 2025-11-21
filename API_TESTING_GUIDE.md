# API Testing Guide - iback

## ✅ Changes Applied

All models have been updated with:
- `status` field (default: 'active')
- `createdBy`, `updatedBy`, `deletedBy` fields
- `tags` field (Material & Product)
- `paranoid: true` for soft deletes
- Consistent timestamp handling

## 🧪 API Endpoints to Test

### 1. Material API (`/material`)

#### ✓ Create Material
```http
POST http://localhost:3000/material/add
Content-Type: application/json

{
  "name": "Steel Rods",
  "description": "High quality steel rods",
  "price": "150.00",
  "date": "2025-11-10",
  "qty": 100,
  "unit": "kg",
  "approver_id": "1",
  "tags": "metal,construction"
}
```

#### ✓ Get All Materials (with pagination)
```http
GET http://localhost:3000/material/getAll?page=1&limit=20
GET http://localhost:3000/material/getAll?page=1&limit=20&status=active
```

#### ✓ Search Materials
```http
GET http://localhost:3000/material/search?q=steel&page=1&limit=20
```

#### ✓ Get Material by ID
```http
GET http://localhost:3000/material/get/1
```

#### ✓ Update Material
```http
PUT http://localhost:3000/material/put/1
Content-Type: application/json

{
  "name": "Updated Steel Rods",
  "price": "175.00",
  "qty": 150,
  "updatedBy": 1
}
```

#### ✓ Update Material Status
```http
PATCH http://localhost:3000/material/status/1/inactive
PATCH http://localhost:3000/material/status/1/active
```

#### ✓ Soft Delete Material
```http
PATCH http://localhost:3000/material/remove/1
Content-Type: application/json

{
  "deletedBy": 1
}
```

#### ✓ Hard Delete Material (Admin)
```http
DELETE http://localhost:3000/material/admin_delete/1
```

---

### 2. Product API (`/product`)

#### ✓ Create Product
```http
POST http://localhost:3000/product/add
Content-Type: application/json

{
  "sku": "PROD001",
  "name": "Premium Widget",
  "description": "High quality widget",
  "cost": "50.00",
  "mrp": "75.00",
  "date": "2025-11-10",
  "weight": 500,
  "unit": "g",
  "tags": "electronics,premium"
}
```

#### ✓ Get All Products (with pagination)
```http
GET http://localhost:3000/product/getAll?page=1&limit=20
GET http://localhost:3000/product/getAll?page=1&limit=20&status=active
```

#### ✓ Search Products
```http
GET http://localhost:3000/product/search?q=widget&page=1&limit=20
```

#### ✓ Get Product by ID
```http
GET http://localhost:3000/product/get/1
```

#### ✓ Update Product
```http
PUT http://localhost:3000/product/put/1
Content-Type: application/json

{
  "name": "Updated Premium Widget",
  "cost": "55.00",
  "mrp": "80.00",
  "updatedBy": 1
}
```

#### ✓ Update Product Status
```http
PATCH http://localhost:3000/product/status/1/inactive
PATCH http://localhost:3000/product/status/1/active
```

#### ✓ Soft Delete Product
```http
PATCH http://localhost:3000/product/remove/1
Content-Type: application/json

{
  "deletedBy": 1
}
```

#### ✓ Hard Delete Product (Admin)
```http
DELETE http://localhost:3000/product/admin_delete/1
```

---

### 3. Stock API (`/stock`)

#### ✓ Create Stock Entry
```http
POST http://localhost:3000/stock/add
Content-Type: application/json

{
  "product_id": 1,
  "description": "Stock replenishment",
  "price": "100.00",
  "date": "2025-11-10",
  "qty": 50,
  "unit": "pcs",
  "tags": "inventory",
  "approver_id": 1
}
```

#### ✓ Get All Stocks (with pagination)
```http
GET http://localhost:3000/stock/getAll?page=1&limit=20
GET http://localhost:3000/stock/getAll?page=1&limit=20&status=active&product_id=1
```

#### ✓ Search Stocks
```http
GET http://localhost:3000/stock/search?q=replenishment&page=1&limit=20
```

#### ✓ Get Stock by ID
```http
GET http://localhost:3000/stock/get/1
```

#### ✓ Update Stock
```http
PUT http://localhost:3000/stock/put/1
Content-Type: application/json

{
  "qty": 75,
  "price": "110.00",
  "updatedBy": 1
}
```

#### ✓ Update Stock Status
```http
PATCH http://localhost:3000/stock/status/1/inactive
PATCH http://localhost:3000/stock/status/1/active
```

#### ✓ Soft Delete Stock
```http
PATCH http://localhost:3000/stock/remove/1
Content-Type: application/json

{
  "deletedBy": 1
}
```

#### ✓ Hard Delete Stock (Admin)
```http
DELETE http://localhost:3000/stock/admin_delete/1
```

---

### 4. User API (`/users`)

#### ✓ Register User
```http
POST http://localhost:3000/users/register
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "contactNumber": "+1234567890",
  "gender": "male",
  "role": "user"
}
```

#### ✓ User Login
```http
POST http://localhost:3000/users/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

#### ✓ Get All Users (with pagination)
```http
GET http://localhost:3000/users/getAllUsers?page=1&limit=20
GET http://localhost:3000/users/getAllUsers?page=1&limit=20&status=active&role=user
```

#### ✓ Get User by ID
```http
GET http://localhost:3000/users/getUser/1
```

#### ✓ Update User
```http
PUT http://localhost:3000/users/put/1
Content-Type: application/json

{
  "firstName": "John Updated",
  "contactNumber": "+0987654321",
  "updatedBy": 1
}
```

#### ✓ Update User Status
```http
PATCH http://localhost:3000/users/status/1/inactive
PATCH http://localhost:3000/users/status/1/active
```

#### ✓ Soft Delete User
```http
PATCH http://localhost:3000/users/remove/1
Content-Type: application/json

{
  "deletedBy": 1
}
```

#### ✓ Hard Delete User (Admin)
```http
DELETE http://localhost:3000/users/admin_delete/1
```

---

## 🔍 Key Testing Points

### 1. Pagination
- Test with different `page` and `limit` values
- Verify `meta` object contains correct `total`, `page`, `limit`, `pages`

### 2. Status Management
- Test status updates: `active`, `inactive`, `pending`, `deleted`
- Verify soft-deleted records don't appear in normal queries

### 3. Soft Delete vs Hard Delete
- Soft delete (`PATCH /remove/:id`) should set `status='deleted'` and `deletedAt`
- Hard delete (`DELETE /admin_delete/:id`) should permanently remove record
- Soft-deleted records should be recoverable

### 4. Search Functionality
- Test search with partial matches
- Verify pagination works with search results
- Test empty search results

### 5. Error Handling
- Test with invalid IDs (should return 404)
- Test with missing required fields (should return 400)
- Test with malformed data

### 6. Filtering
- Test status filtering: `?status=active`
- Test product_id filtering for stocks: `?product_id=1`
- Test role filtering for users: `?role=admin`

---

## 🚨 Known Considerations

### Database Migration Needed
Since new fields were added to existing models, you'll need to:

1. **Option A: Drop and recreate tables** (Development only - loses data)
   ```javascript
   // In app.js, temporarily change:
   await sequelize.sync({ force: true });
   ```

2. **Option B: Use Sequelize migrations** (Recommended for production)
   ```bash
   npx sequelize-cli migration:generate --name add-status-fields
   ```

3. **Option C: Manually alter tables** (Quick fix)
   ```sql
   ALTER TABLE material ADD COLUMN status VARCHAR(255) DEFAULT 'active';
   ALTER TABLE material ADD COLUMN tags VARCHAR(255);
   ALTER TABLE material ADD COLUMN created_by INTEGER;
   ALTER TABLE material ADD COLUMN updated_by INTEGER;
   ALTER TABLE material ADD COLUMN deleted_by INTEGER;
   ALTER TABLE material ADD COLUMN deleted_at TIMESTAMP;
   
   -- Repeat for product and user tables
   ```

### User Service Dependencies
The UserService still exists and handles:
- Email validation
- Password hashing
- JWT token generation
- Login authentication

These should remain as they contain business logic.

---

## 📝 Testing Checklist

- [ ] Material API - All 8 endpoints
- [ ] Product API - All 8 endpoints  
- [ ] Stock API - All 8 endpoints
- [ ] User API - All 8 endpoints (excluding auth-specific)
- [ ] Pagination works correctly
- [ ] Search returns accurate results
- [ ] Status updates work
- [ ] Soft delete preserves data
- [ ] Hard delete removes data permanently
- [ ] Error responses are appropriate (400, 404, 500)
- [ ] Response format is consistent across all endpoints

---

## 🛠️ Quick Test Script

You can use this Node.js script or tools like Postman, Thunder Client, or Insomnia to test:

```javascript
// test-api.js
const baseURL = 'http://localhost:3000';

async function testMaterialAPI() {
    // Create
    const createRes = await fetch(`${baseURL}/material/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: "Test Material",
            price: "100",
            date: "2025-11-10",
            qty: 50,
            unit: "kg"
        })
    });
    const created = await createRes.json();
    console.log('Created:', created);
    
    // Get All
    const getAllRes = await fetch(`${baseURL}/material/getAll?page=1&limit=20`);
    const allMaterials = await getAllRes.json();
    console.log('Get All:', allMaterials);
}

testMaterialAPI();
```

---

## ✅ Summary

All APIs now follow the same robust pattern:
- ✅ Consistent route structure
- ✅ Pagination support
- ✅ Advanced search
- ✅ Status management
- ✅ Soft & hard delete
- ✅ Proper error handling
- ✅ Response format standardization

**Next Steps:**
1. Run database migrations to add new fields
2. Start the server: `npm start`
3. Test each endpoint using the guide above
4. Monitor console for any errors
