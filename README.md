# IMS Backend

This is the backend for the IMS (Inventory Management System) project.

## File Naming Convention
All source files now use kebab-case format (e.g., `user.repository.js`, `product.controller.js`).

## Project Structure
```
src/
  controllers/
    user.controller.js
    product.controller.js
    ...
  repositories/
    user.repository.js
    product.repository.js
    ...
  services/
    user.service.js
    product.service.js
    ...
  models/
    user.model.js
    product.model.js
    ...
  routes/
    user.router.js
    product.router.js
    ...
  middlewares/
    auth.middleware.js
    request.logger.js
    ...
  config/
    db.js
    config.multer.js
  scripts/
    seed.js
    bulk-upload.js
  utils/
    logger.js
```

## Getting Started

1. **Install dependencies:**
   ```powershell
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env` and update your settings.

3. **Run the server:**
   ```powershell
   npm start
   ```

4. **Development mode (auto-reload):**
   ```powershell
   npm run dev
   ```

5. **Seed the database:**
   ```powershell
   npm run seed
   ```

6. **Bulk upload script:**
   ```powershell
   npm run bulk
   ```

## API Endpoints
See `src/routes/*.router.js` for available endpoints.

## Notes
- All imports use kebab-case file names.
- For any new files, follow the kebab-case convention.

---

For more details, see the source code and comments in each file.
