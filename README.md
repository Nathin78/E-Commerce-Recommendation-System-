# Sellora

Full-stack flash sale commerce app with in-memory + optional JSON file storage.

## New Features Added
- Verified buyer product reviews with live rating summaries
- Coupon and offer engine in cart checkout
- Discount-aware order summaries for users and admins
- Admin revenue snapshot with coupon usage visibility
- Daily auto-refreshing flash sales
- Editable profile page with saved-address aware account settings
- Live backend health status in the shared navbar
- Filter summary bar with one-click clear filters on the shop page
- Advanced shop filters for brand, size, rating, stock, price, and sorting
- Profile address manager with add, edit, delete, and default address actions
- Order tracking timeline with cancel and return request support
- Admin coupon management and admin order status updates
- Route-level code splitting and built-in Node test scripts

## Recent Fixes
### Profile Page
- Unified default-address handling so the form, snapshot card, and address card all use the same source.
- Fixed form load and reset behavior so it stays in sync with saved profile data.
- Cleared stale success and error messages as soon as the user starts editing again.
- Added safe cleanup for the initial profile-load effect.
- Tightened backend validation in `backend/src/controllers/userController.js` so whitespace-only values do not pass and invalid email formats are rejected properly.

## Tech Stack
- Frontend: React (Hooks + Context API), React Router, Axios, Material UI, Socket.IO client
- Backend: Node.js, Express, JWT, bcrypt, Socket.IO
- Storage: In-memory state backed by MySQL, with optional JSON file snapshotting to `backend/src/data/db.json`

## Project Structure
- `backend/src/controllers`
- `backend/src/routes`
- `backend/src/middleware`
- `backend/src/data`
- `frontend/src/components`
- `frontend/src/pages`
- `frontend/src/services`
- `frontend/src/hooks`

## Key In-Memory Collections
- `users[]`
- `products[]`
- `flashSales[]`
- `carts[]`
- `orders[]`
- `clicks[]`
- `reviews[]`
- `coupons[]`

## API Routes
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Products
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products/:id/reviews` (Auth, verified buyers)
- `POST /api/products` (Admin)
- `PUT /api/products/:id` (Admin)
- `DELETE /api/products/:id` (Admin)

### Flash Sales
- `GET /api/flash-sales`
- `POST /api/flash-sales` (Admin)

### Cart
- `GET /api/cart`
- `POST /api/cart`
- `GET /api/cart/offers`
- `POST /api/cart/coupon`

### Orders
- `POST /api/orders`
- `POST /api/orders/buy-now`
- `GET /api/orders`
- `PUT /api/orders/:orderId/cancel`
- `PUT /api/orders/:orderId/return`
- `PUT /api/orders/:orderId/status` (Admin)

### Extra
- `GET /api/health`
- `GET /api/products/recommendations` (Auth)
- `GET /api/users/profile` / `PUT /api/users/profile` (Auth)
- `GET /api/users/addresses` / `POST /api/users/addresses` / `PUT /api/users/addresses/:addressId` / `PUT /api/users/addresses/:addressId/default` / `DELETE /api/users/addresses/:addressId` (Auth)
- `GET /api/users/wishlist` / `POST /api/users/wishlist` / `DELETE /api/users/wishlist/:productId`
- `GET /api/admin/users` (Admin)
- `GET /api/admin/orders` (Admin)
- `GET /api/admin/coupons` / `POST /api/admin/coupons` / `PUT /api/admin/coupons/:code` (Admin)

## Realtime Events (Socket.IO)
- `server:time` (timer sync)
- `stock:update`
- `stock:low`
- `purchase:new`
- `flashSale:created`
- `flashSale:tick`
- `flashSale:started`
- `flashSale:expired`
- `catalog:snapshot`

## Demo Credentials
- Admin: `admin@flashsale.com` / `admin123`
- User: `user@flashsale.com` / `user123`

## Run Backend
```bash
cd backend
cp .env.example .env
npm install
npm start
```

Windows PowerShell fallback (if `npm` is not in PATH):
```powershell
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" start
```

Backend tests:
```bash
npm test
```

## Run Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm start
```

Frontend tests:
```bash
npm test
```

<<<<<<< HEAD
On Windows PowerShell, if the `npm` shim is blocked by execution policy, use the command-file entry point directly:
```powershell
& "C:\Program Files\nodejs\npm.cmd" test
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Continuous Integration
- GitHub Actions runs backend and frontend tests on every push to `main` and on pull requests.
- The workflow uses Node.js 20 and `npm ci` for repeatable installs.

=======
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Notes
- MySQL is used for persistence when `DB_ENABLED=true`.
- The backend connects with `DB_USER=root` and the password from `DB_PASSWORD`.
- Data is also mirrored to `db.json` when `PERSIST_TO_FILE=true`.
- Backend CORS now allows both `http://localhost:3000` and `http://localhost:5173` by default, and also accepts comma-separated `CLIENT_URL` values.
- Seeded coupon codes: `SAVE10`, `FLASH500`, `MEGA15`.
- Reviews are limited to users who have already purchased the product.
- System flash sales now auto-refresh once per day and are regenerated automatically when the backend is running.
