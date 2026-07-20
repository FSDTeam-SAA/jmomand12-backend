# Admin Dashboard — Module-by-Module Implementation Guide

> Complete implementation guide for every module of the **Jmomand** Admin Dashboard. For each module: permissions, routes, required APIs, CRUD flows, forms, tables, search, filters, pagination, cache invalidation, mutations, and recommended UI behavior.

---

## Table of Contents

1. [Dashboard Analytics](#1-dashboard-analytics)
2. [User Management](#2-user-management)
3. [Product Management](#3-product-management)
4. [Inventory Monitoring](#4-inventory-monitoring)
5. [Category Management](#5-category-management)
6. [Auction Management](#6-auction-management)
7. [Order Management](#7-order-management)
8. [Invoice Management](#8-invoice-management)
9. [Payment History](#9-payment-history)
10. [Pickup Appointments](#10-pickup-appointments)
11. [Pickup Slots](#11-pickup-slots)
12. [Notifications](#12-notifications)
13. [Reports & Analytics](#13-reports--analytics)
14. [Platform Settings](#14-platform-settings)

---

## Admin Layout

All admin pages share the same layout:

```typescript
// app/admin/layout.tsx
// Requires: admin role (redirect to /auth/login if not admin)
├── AdminSidebar                    # Collapsible sidebar navigation
│   ├── Logo → /admin
│   ├── NavItems:
│   │   ├── Dashboard               # → /admin
│   │   ├── Users                   # → /admin/users
│   │   ├── Products                # → /admin/products (expandable)
│   │   │   ├── All Products        # → /admin/products
│   │   │   ├── Create Product      # → /admin/products/create
│   │   │   └── Inventory           # → /admin/products/inventory
│   │   ├── Categories              # → /admin/categories
│   │   ├── Auctions                # → /admin/auctions
│   │   ├── Orders                  # → /admin/orders
│   │   ├── Invoices                # → /admin/invoices
│   │   ├── Payments                # → /admin/payments
│   │   ├── Pickups                 # → /admin/pickups (expandable)
│   │   │   ├── Appointments        # → /admin/pickups
│   │   │   └── Slots               # → /admin/pickups/slots
│   │   ├── Notifications           # → /admin/notifications
│   │   ├── Reports                 # → /admin/reports
│   │   └── Settings                # → /admin/settings
│   └── CollapseToggle
├── AdminHeader
│   ├── SidebarToggle (mobile)
│   ├── SearchGlobal                # Optional: global search
│   ├── NotificationBell            # Unread count → /admin/notifications
│   └── AdminAvatar + Dropdown
│       ├── "My Account" → /account
│       └── "Logout"
└── MainContent
    └── {children}
```

---

## 1. Dashboard Analytics

| | |
|---|---|
| **Route** | `/admin` |
| **Auth** | Admin only |
| **Permission** | All admin users |
| **Purpose** | Overview of platform health: revenue, auctions, inventory, pickups |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /reports/revenue` | Total revenue, paid invoices, avg order value | 1 min |
| 2 | `GET /reports/auctions` | Auction status distribution, total winning bids | 1 min |
| 3 | `GET /reports/inventory` | Product inventory status counts | 5 min |
| 4 | `GET /reports/pickups` | Pickup appointment status distribution | 1 min |

All report endpoints accept optional `startDate` and `endDate` query params. Default: all time.

### Components

```
DashboardPage
├── DateRangePicker                # Quick filters: Today, 7 days, 30 days, All Time, Custom
├── StatsGrid (4 cards)
│   ├── TotalRevenue               # "$45,230" + trend indicator
│   ├── PaidInvoices               # "142 invoices"
│   ├── ActiveAuctions             # "8 active" (from auction byStatus)
│   └── PendingPickups             # "12 scheduled" (from pickup byStatus)
├── RevenueSummary                 # Total revenue + avg order value
├── ChartsRow
│   ├── AuctionStatusChart          # Bar/pie chart: byStatus breakdown
│   ├── InventoryStatusChart        # Donut chart: inventory status distribution
│   └── PickupStatusChart           # Bar chart: pickup status breakdown
├── RecentActivity                  # Optional: recent orders/auctions list
└── QuickActions                    # Links: Create Product, Create Auction, Manage Slots
```

### Data Flow

1. All 4 report endpoints fire in parallel via `Promise.all`.
2. Date range picker updates all queries with `startDate`/`endDate` params.
3. Charts render from aggregated data.

### Loading State

- Stat cards: number skeleton.
- Charts: chart skeleton (gray rectangle).

### Error State

- Any report fails: show that section as "Unable to load" with retry.

### User Interactions

- Change date range → refetch all reports.
- Click stat card → navigate to relevant module (e.g., "Active Auctions" → `/admin/auctions?status=active`).
- Click chart segment → filter relevant list page.

---

## 2. User Management

| | |
|---|---|
| **Route** | `/admin/users` |
| **Auth** | Admin only |
| **Permission** | Admin users only |
| **Purpose** | List, view, suspend, and block user accounts |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /users` | List all users | 1 min |
| 2 | `GET /users/:userId` | User detail (modal/page) | On demand |
| 3 | `PATCH /users/:id/suspension` | Toggle suspend | Mutation |
| 4 | `PATCH /users/:id/block` | Toggle block | Mutation |

### Components

```
UsersPage
├── PageHeader                     # "User Management" + user count
├── SearchInput                    # Search by name/email (client-side filter)
├── DataTable
│   ├── Columns:
│   │   ├── Avatar + Name          # Image + "First Last"
│   │   ├── Email
│   │   ├── Role                   # Badge: "admin" / "user"
│   │   ├── Verified               # ✓ / ✗ icon
│   │   ├── Status                 # Composite: Suspended? Blocked? Active?
│   │   ├── Joined                 # Relative date "2 months ago"
│   │   └── Actions                # Dropdown: View, Suspend, Block
│   └── Rows                       # Sorted by createdAt desc
├── UserDetailSheet/Modal          # Slide-out panel showing full profile
│   ├── Avatar
│   ├── Name, Email, Phone
│   ├── Address (street, location, postalCode)
│   ├── Date of Birth
│   ├── Role
│   ├── Account Status
│   │   ├── Verified badge
│   │   ├── Suspended badge + toggle
│   │   └── Blocked badge + toggle
│   ├── Payment Method Status
│   └── Member Since
└── EmptyState                     # No users
```

### Data Flow

1. Fetch all users (no pagination in backend — returns all).
2. Client-side search filter on name/email.
3. Suspend/block → optimistic toggle → `PATCH /users/:id/suspension` or `/block`.
4. After mutation → refetch user list.

### Table Columns

| Column | Width | Sortable | Filterable |
|---|---|---|---|
| Avatar + Name | flex | Yes (by name) | No |
| Email | flex | Yes | No |
| Role | 100px | No | Yes (dropdown) |
| Verified | 80px | No | Yes (toggle) |
| Status | 120px | No | Yes (dropdown: Active, Suspended, Blocked) |
| Joined | 120px | Yes | No |
| Actions | 80px | No | No |

### Mutations

```typescript
// Toggle suspend
useMutation({
  mutationFn: (userId) => api.patch(`/users/${userId}/suspension`),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['users'] });
    toast.success('User suspension toggled');
  },
});

// Toggle block
useMutation({
  mutationFn: (userId) => api.patch(`/users/${userId}/block`),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['users'] });
    toast.success('User block status toggled');
  },
});
```

### Error States

- Cannot suspend/block admin: "Admin accounts cannot be suspended/blocked." (Backend enforces this).
- User not found: "User not found."

### User Interactions

- Search → instant client-side filter.
- Click row → open detail slide-out.
- Click "Suspend" → confirmation dialog → toggle.
- Click "Block" → confirmation dialog ("This will prevent the user from logging in") → toggle.
- Admin users show lock icon on suspend/block actions (disabled).

---

## 3. Product Management

| | |
|---|---|
| **Routes** | `/admin/products`, `/admin/products/create`, `/admin/products/[id]` |
| **Auth** | Admin only |
| **Permission** | Admin users only |
| **Purpose** | Full CRUD for products with image upload and bulk upload |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /products?...filters` | List products | 1 min |
| 2 | `GET /products/:id` | Product detail | On demand |
| 3 | `POST /products` | Create product | Mutation |
| 4 | `POST /products/bulk` | Bulk upload | Mutation |
| 5 | `PATCH /products/:id` | Update product | Mutation |
| 6 | `DELETE /products/:id` | Delete product | Mutation |
| 7 | `GET /products/categories` | Category options for form | 10 min |

### List Page (`/admin/products`)

#### Query Parameters

```typescript
interface AdminProductParams {
  searchTerm?: string;
  category?: string;
  condition?: ProductCondition;
  inventoryStatus?: ProductInventoryStatus;
  type?: 'for_sale' | 'for_auction';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

#### Components

```
AdminProductsPage
├── PageHeader                     # "Products" + count + "Create Product" + "Bulk Upload" buttons
├── DataTableToolbar
│   ├── SearchInput                # Search by title/category
│   ├── CategoryFilter             # Dropdown from categories
│   ├── ConditionFilter            # Multi-select dropdown
│   ├── TypeFilter                 # All / For Sale / For Auction
│   ├── InventoryStatusFilter      # Multi-select dropdown
│   └── ClearFilters
├── DataTable
│   ├── Columns:
│   │   ├── Image                  # Thumbnail (first image)
│   │   ├── InventoryId            # "PRD-000134-07-26"
│   │   ├── Title                  # Product name
│   │   ├── Category
│   │   ├── Condition              # Badge with color
│   │   ├── Type                   # Badge: "Sale" / "Auction"
│   │   ├── Price/Reserve          # "$299" or "Reserve: $150"
│   │   ├── Stock                  # Quantity (for sale) or "—"
│   │   ├── Status                 # Inventory status badge
│   │   ├── Created                # Relative date
│   │   └── Actions                # View, Edit, Delete
│   └── Rows
├── DataTablePagination
└── BulkUploadDialog               # Modal for ZIP upload
    ├── FileDropZone                # Drag-and-drop ZIP
    ├── TypeSelector                # for_sale / for_auction radio
    ├── UploadButton
    └── ResultsDisplay              # Success/fail counts + details
```

#### Table Columns

| Column | Sortable | Filterable |
|---|---|---|
| Image | No | No |
| InventoryId | Yes | No |
| Title | Yes | No |
| Category | Yes | Yes |
| Condition | No | Yes |
| Type | No | Yes |
| Price/Reserve | Yes | Yes (price range) |
| Stock | Yes | No |
| Status | No | Yes |
| Created | Yes | No |
| Actions | No | No |

### Create Product (`/admin/products/create`)

#### Form Schema

```typescript
const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  condition: z.enum(['new', 'open_box', 'like_new', 'used', 'damaged', 'for_parts',
    'brand_new', 'like_new_open_box', 'scratch_and_dent', 'salvage']),
  type: z.enum(['for_sale', 'for_auction']),
  // Conditional fields:
  price: z.number().positive().optional(),      // Required if type = for_sale
  quantity: z.number().int().positive().optional(), // Required if type = for_sale
  day: z.string().optional(),                    // For auction type
  reservePrice: z.number().min(0).optional(),    // For auction type
  color: z.array(z.string()).optional(),
  manufacturer: z.string().optional(),
  images: z.array(z.instanceof(File))
    .min(1, 'At least one image is required')
    .max(5, 'Maximum 5 images'),
  categoryImage: z.instanceof(File).optional(),
}).refine(
  (data) => {
    if (data.type === 'for_sale') {
      return data.price != null && data.price > 0 && data.quantity != null && data.quantity > 0;
    }
    return true;
  },
  { message: 'Price and quantity are required for sale products' }
);
```

#### Components

```
CreateProductPage
├── PageHeader                     # "Create Product"
├── ProductForm
│   ├── BasicInfoSection
│   │   ├── TitleInput
│   │   ├── DescriptionTextArea
│   │   ├── CategorySelect (+ "Create Category" link)
│   │   ├── ConditionSelect (10 options)
│   │   ├── TypeToggle (for_sale / for_auction)
│   │   ├── ManufacturerInput (optional)
│   │   └── ColorMultiSelect (optional)
│   ├── PricingSection (conditional on type)
│   │   ├── for_sale: PriceInput + QuantityInput
│   │   └── for_auction: DaySelect (Mon-Sun) + ReservePriceInput
│   ├── ImageSection
│   │   ├── ImageUploader (max 5, drag-and-drop, preview, reorder)
│   │   └── CategoryImageUploader (optional, single)
│   └── SubmitSection
│       ├── CancelButton → /admin/products
│       └── CreateButton
```

#### Mutations

```typescript
useMutation({
  mutationFn: (formData: FormData) => api.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  onSuccess: (data) => {
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['inventory'] });
    toast.success('Product created successfully');
    router.push('/admin/products');
  },
  onError: (error) => handleApiError(error),
});
```

### Bulk Upload

#### Components

```
BulkUploadDialog
├── UploadZone                     # Drag-and-drop or click to select ZIP
│   ├── Accepted: .zip files only
│   └── File preview with name + size
├── TypeSelector                   # Radio: for_sale / for_auction
├── Instructions                   # "ZIP must contain products.csv and imageFolder/ directory"
├── UploadButton                   # Disabled until file + type selected
└── ResultsPanel                   # After upload:
    ├── Summary                    # "8 of 10 products uploaded successfully"
    ├── SuccessList                # Row, title, inventoryId
    └── FailureList                # Row, title, error message
```

#### Data Flow

1. Select ZIP file + type → enable upload button.
2. Upload → `POST /products/bulk` (FormData with `file` + `type`).
3. Show results: success/fail counts + per-row details.
4. On success → invalidate product lists.

### Product Detail/Edit (`/admin/products/[id]`)

Same form as create, pre-populated with existing data. Image section shows existing images with delete buttons. On save → `PATCH /products/:id`.

### Cache Invalidation

```typescript
// After any product CRUD mutation:
qc.invalidateQueries({ queryKey: ['products'] });
qc.invalidateQueries({ queryKey: ['inventory'] });
qc.invalidateQueries({ queryKey: ['inventoryMonitoring'] });
```

### User Interactions

- Create → redirect to form → fill → submit → redirect to list.
- Bulk upload → dialog → select file → upload → show results → close.
- Edit → pre-filled form → modify → save → redirect to list.
- Delete → confirmation dialog ("This will permanently delete the product") → delete → refetch.
- View → slide-out or navigate to detail page.
- Click row → navigate to `/admin/products/[id]`.

---

## 4. Inventory Monitoring

| | |
|---|---|
| **Route** | `/admin/products/inventory` |
| **Auth** | Admin only |
| **Permission** | Admin users only |
| **Purpose** | Aggregated view tracking each product through the full lifecycle: inventory → auction → payment → pickup → completion |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /products/inventory-monitoring?inventoryStatus=...&category=...&searchTerm=...` | Aggregated product lifecycle data | 1 min |

### Response Shape

The backend returns an aggregation joining Product → Auction → Invoice → User (winner) → PickupAppointment → PickupSlot:

```typescript
interface InventoryMonitoringItem {
  title: string;
  inventoryId: string;
  category: string;
  condition: string;
  inventoryStatus: string;
  reservePrice?: number;
  images: Array<{ public_id: string; url: string }>;
  auctionId?: string;
  auctionStatus?: string;
  winningBid?: number;
  winner?: { _id: string; firstName: string; lastName: string; email: string; phone: string };
  paymentStatus?: string;
  invoiceNumber?: string;
  pickupStatus?: string;
  pickupDate?: string;
  pickupEndsAt?: string;
}
```

### Components

```
InventoryMonitoringPage
├── PageHeader                     # "Inventory Monitoring" + count
├── Toolbar
│   ├── SearchInput                # Search by title, inventoryId, category
│   ├── InventoryStatusFilter      # Multi-select dropdown
│   ├── CategoryFilter             # Dropdown from categories
│   └── ClearFilters
├── DataTable
│   ├── Columns:
│   │   ├── Image + Title
│   │   ├── InventoryId
│   │   ├── Category
│   │   ├── Condition              # Badge
│   │   ├── InventoryStatus        # Badge with color
│   │   ├── AuctionStatus          # Badge or "—"
│   │   ├── WinningBid             # "$450" or "—"
│   │   ├── Winner                 # Name + email or "—"
│   │   ├── PaymentStatus          # Badge or "—"
│   │   ├── InvoiceNumber          # Link or "—"
│   │   ├── PickupStatus           # Badge or "—"
│   │   └── PickupDate             # Date or "—"
│   └── Rows
└── DataTablePagination
```

### Data Flow

1. Fetch aggregated inventory data with optional filters.
2. Client-side search on title/inventoryId/category.
3. Status filters update query params → refetch.
4. Click row → optional detail slide-out showing full lifecycle timeline.

### Loading State

- Skeleton table rows (10 placeholders).

### Empty State

- "No products match the selected filters."

### User Interactions

- Filter by inventory status → see products at each stage.
- Search by inventory ID for quick lookup.
- Click invoice number → navigate to invoice detail.
- Click winner name → navigate to user detail.
- Visual lifecycle timeline in detail view: Available → Auction Active → Ended → Winner Assigned → Payment → Pickup → Completed.

---

## 5. Category Management

| | |
|---|---|
| **Route** | `/admin/categories` |
| **Auth** | Admin only (frontend restriction; backend lacks auth) |
| **Permission** | Admin users only |
| **Purpose** | CRUD for product categories with image upload and soft delete |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /category/all?page=1&limit=10&searchTerm=` | List categories | 1 min |
| 2 | `GET /category/:id` | Single category | On demand |
| 3 | `POST /category` | Create category | Mutation |
| 4 | `PUT /category/update/:id` | Update category | Mutation |
| 5 | `PUT /category/toggle/:id` | Soft delete/restore | Mutation |

### Components

```
CategoriesPage
├── PageHeader                     # "Categories" + count + "Create Category" button
├── SearchInput                    # Search by name
├── DataTable
│   ├── Columns:
│   │   ├── Image                  # Category image thumbnail
│   │   ├── Name                   # Category name
│   │   ├── Product Count          # totalProduct
│   │   ├── Status                 # Active / Deleted badge
│   │   ├── Created
│   │   └── Actions                # Edit, Delete/Restore
│   └── Rows
├── DataTablePagination
├── CreateCategoryDialog           # Modal form
│   ├── NameInput
│   ├── ImageUploader (single image, required)
│   └── CreateButton
└── EditCategoryDialog             # Modal form (pre-populated)
    ├── NameInput
    ├── ImageUploader (with current image preview)
    └── SaveButton
```

### Form Schema

```typescript
const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  image: z.instanceof(File).optional(),  // Required for create, optional for update
});
```

### Mutations

```typescript
// Create
useMutation({
  mutationFn: (fd: FormData) => api.post('/category', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['categories'] });
    toast.success('Category created');
    closeDialog();
  },
});

// Update
useMutation({
  mutationFn: ({ id, fd }) => api.put(`/category/update/${id}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['categories'] });
    toast.success('Category updated');
  },
});

// Toggle delete
useMutation({
  mutationFn: (id) => api.put(`/category/toggle/${id}`),
  onSuccess: (data) => {
    qc.invalidateQueries({ queryKey: ['categories'] });
    toast.success(data.isDeleted ? 'Category deleted' : 'Category restored');
  },
});
```

### Error States

- Duplicate name: "Category name already exists."
- Delete with products: "Cannot delete category with existing products."
- Image required: "Category image is required."

### User Interactions

- Create → dialog → fill name + upload image → submit.
- Edit → dialog → modify → save.
- Delete → confirmation ("Category will be hidden from product listings") → soft delete.
- Restore (if deleted) → "Restore this category?" → toggle back.
- Product count is display-only (non-editable).

---

## 6. Auction Management

| | |
|---|---|
| **Routes** | `/admin/auctions`, `/admin/auctions/[id]`, `/admin/auctions/create` |
| **Auth** | Admin only |
| **Permission** | Admin users only |
| **Purpose** | Create, list, view, and manage auctions |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /auctions?status=...&searchTerm=...&page=1&limit=10` | List auctions | 1 min |
| 2 | `GET /auctions/:id` | Auction detail | 30 sec |
| 3 | `POST /auctions` | Create auction | Mutation |
| 4 | `GET /products/auctions?page=1&limit=20` | Available products for auction | 1 min |

### List Page (`/admin/auctions`)

#### Components

```
AdminAuctionsPage
├── PageHeader                     # "Auctions" + count + "Create Auction" button
├── DataTableToolbar
│   ├── SearchInput                # Search by auctionId, title
│   ├── StatusFilter               # Dropdown: upcoming, active, ended, sold, unsold, cancelled
│   └── ClearFilters
├── DataTable
│   ├── Columns:
│   │   ├── AuctionId              # "AUC-000001-07-26"
│   │   ├── Title
│   │   ├── Products               # Count badge "5 products"
│   │   ├── StartDate              # "Jul 20, 2026"
│   │   ├── EndDate                # "Jul 27, 2026"
│   │   ├── Status                 # Badge with color
│   │   ├── Winner                 # Name or "—"
│   │   └── Actions                # View, Edit (if upcoming)
│   └── Rows
├── DataTablePagination
```

### Create Auction (`/admin/auctions/create`)

#### Form Schema

```typescript
const auctionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  products: z.array(z.string()).min(1, 'Select at least one product'),
  auctionSchedule: z.object({
    startDate: z.string().min(1),
    startTime: z.string().min(1),
    durationInDays: z.number().int().min(1).max(30),
  }),
  startingBid: z.number().min(0, 'Starting bid is required'),
  bidIncrement: z.number().min(1, 'Bid increment must be at least 1'),
  reservePrice: z.number().min(0).optional(),
  pickupSchedule: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    dailyStartTime: z.string().optional(),
    dailyEndTime: z.string().optional(),
    durationInDays: z.number().int().optional(),
  }).optional(),
});
```

#### Components

```
CreateAuctionPage
├── PageHeader                     # "Create Auction"
├── AuctionForm
│   ├── BasicInfoSection
│   │   ├── TitleInput
│   │   └── DescriptionTextArea
│   ├── ProductSelector
│   │   ├── SearchInput            # Search available auction products
│   │   ├── ProductCheckboxList    # Paginated list with checkboxes
│   │   │   └── ProductRow[]       # InventoryId, title, category, condition, reservePrice
│   │   └── SelectedCount          # "5 products selected"
│   ├── ScheduleSection
│   │   ├── StartDateInput         # Date picker (min: today)
│   │   ├── StartTimeInput         # Time picker
│   │   ├── DurationInput          # Number: 1-30 days
│   │   └── CalculatedEndDate      # "Ends: Jul 27, 2026" (auto-calculated)
│   ├── BiddingConfig
│   │   ├── StartingBidInput       # Default starting bid for all products
│   │   ├── BidIncrementInput      # Minimum bid increment
│   │   └── ReservePriceInput      # Optional reserve price
│   ├── PickupScheduleSection      # Optional
│   │   ├── PickupStartDate
│   │   ├── PickupEndDate
│   │   ├── DailyStartTime
│   │   ├── DailyEndTime
│   │   └── PickupDurationDays
│   └── SubmitSection
│       ├── CancelButton → /admin/auctions
│       └── CreateButton
```

#### Data Flow

1. Page loads → fetch available auction products (`GET /products/auctions`).
2. Admin selects products via checkboxes.
3. Fill schedule + bidding config → preview calculated end date.
4. Submit → `POST /auctions` → invalidate auction lists → redirect to `/admin/auctions`.

#### Backend Behavior After Creation

- If `startsAt` is in the past: auction is created as `active` immediately.
- If `startsAt` is in the future: auction is `upcoming`, cron job activates it when `startsAt` arrives.
- Cron job closes auction at `endsAt`, processes payments, assigns winners.

### Auction Detail (`/admin/auctions/[id]`)

```
AuctionDetailPage
├── AuctionHeader
│   ├── AuctionId + Title
│   ├── StatusBadge
│   ├── Schedule (start/end dates)
│   ├── PickupSchedule info
│   └── CancelButton (if upcoming/active)
├── ProductsTable
│   └── AuctionProductRow[]
│       ├── Product image + title
│       ├── StartingBid
│       ├── CurrentBid + Bidder
│       ├── BidIncrement
│       ├── Status
│       ├── PaymentStatus
│       └── Winner (if ended)
└── AuctionTimeline                 # Visual: Created → Active → Ended → Sold
```

### Cache Invalidation

```typescript
qc.invalidateQueries({ queryKey: ['auctions'] });
qc.invalidateQueries({ queryKey: ['auctionProducts'] });
```

### User Interactions

- Create → form → select products → configure schedule → submit → redirect.
- View → detail page with products and status.
- Cancel → confirmation dialog → mutation (if backend supports it — currently empty).
- Status filter in list → quick access to active/upcoming/ended.

---

## 7. Order Management

| | |
|---|---|
| **Route** | `/admin/orders` |
| **Auth** | Admin only |
| **Permission** | Admin users only |
| **Purpose** | View all customer orders |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /orders` | List all orders | 1 min |

### Components

```
OrdersPage
├── PageHeader                     # "Orders" + total count
├── SearchInput                    # Search by order number, customer name/email
├── StatusFilter                   # Dropdown: pending, paid, failed, cancelled
├── DataTable
│   ├── Columns:
│   │   ├── OrderNumber            # "ORD-2026-1001"
│   │   ├── Customer               # Name + email
│   │   ├── Items                  # Count + preview "3 items"
│   │   ├── TotalAmount            # "$897.00"
│   │   ├── Status                 # Badge
│   │   ├── PaidAt                 # Date or "—"
│   │   ├── PickupCode             # "A1B2C3D4" or "—"
│   │   ├── Created
│   │   └── Actions                # View detail
│   └── Rows
├── DataTablePagination
└── OrderDetailSheet               # Slide-out
    ├── OrderNumber + Status
    ├── Customer info
    ├── Items list with product images, qty, price
    ├── Total
    ├── Stripe session info
    ├── Pickup code + QR code
    └── Timeline: Created → Paid → Pickup
```

### Data Flow

1. Fetch all orders (sorted by `createdAt` desc).
2. Client-side search filter on order number and customer name.
3. Click row → open detail slide-out.

### Loading State

- Skeleton table rows.

### Empty State

- "No orders found." (Unlikely once the platform is live.)

### User Interactions

- Search → filter.
- Filter by status → refetch (or client-side filter).
- Click row → view detail slide-out with full order info.
- View QR code for pickup verification reference.

---

## 8. Invoice Management

| | |
|---|---|
| **Route** | `/admin/invoices` |
| **Auth** | Admin only |
| **Permission** | Admin users only |
| **Purpose** | View all invoices and verify pickup codes |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /invoices` | List all invoices | 1 min |
| 2 | `POST /invoices/verify-pickup` | Verify pickup code (from detail) | Mutation |

### Components

```
InvoicesPage
├── PageHeader                     # "Invoices" + count
├── SearchInput                    # Search by invoice number, customer name
├── StatusFilter                   # Dropdown: payment_pending, paid, payment_failed, void
├── DataTable
│   ├── Columns:
│   │   ├── InvoiceNumber          # "INV-2026-1001"
│   │   ├── Customer               # Name + email
│   │   ├── Product                # Title + inventoryId
│   │   ├── Auction                # Auction ID or title
│   │   ├── Amount                 # "$450.00"
│   │   ├── Status                 # Badge
│   │   ├── PaidAt                 # Date or "—"
│   │   ├── PickupCode             # "A1B2C3D4" or "—"
│   │   └── Actions                # View, Verify Pickup
│   └── Rows
├── DataTablePagination
└── InvoiceDetailSheet
    ├── Invoice info
    ├── Customer info
    ├── Product info
    ├── Payment info (Stripe ID, amount, date)
    ├── Pickup code + QR code display
    ├── "Verify Pickup" button → POST /invoices/verify-pickup
    └── Verification result
```

### User Interactions

- Search → filter by invoice number or customer.
- View detail → see full invoice info + QR code.
- Verify pickup → enter code → see verification result → complete pickup.

---

## 9. Payment History

| | |
|---|---|
| **Route** | `/admin/payments` |
| **Auth** | Admin only |
| **Permission** | Admin users only |
| **Purpose** | Aggregated view of all successful payments from both invoices and orders |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /payments?page=1&limit=10` | Paginated payment list | 1 min |

### Response Shape

```typescript
interface PaymentRow {
  date: string | null;
  transactionId: string | null;   // Stripe payment intent ID
  method: string;                  // 'card'
  amount: number;
}
```

### Components

```
PaymentsPage
├── PageHeader                     # "Payments" + total count
├── SummaryCard                    # Total revenue: "$XX,XXX" (sum of all displayed)
├── DataTable
│   ├── Columns:
│   │   ├── Date                   # Formatted date
│   │   ├── TransactionId          # Stripe ID (truncated, copy button)
│   │   ├── Method                 # "Card" badge
│   │   └── Amount                 # "$450.00"
│   └── Rows                       # Sorted by date desc
├── DataTablePagination
└── ExportButton                   # Optional: CSV export
```

### Data Flow

1. Fetch paginated payments (aggregated from invoices + orders).
2. Client-side summary calculation for displayed page.
3. Click transaction ID → copy to clipboard.

### Loading State

- Skeleton table.

### Empty State

- "No payment records found."

### User Interactions

- Paginate through payment history.
- Copy transaction IDs.
- Optional: date range filter (would need backend support).

---

## 10. Pickup Appointments

| | |
|---|---|
| **Route** | `/admin/pickups` |
| **Auth** | Admin only |
| **Permission** | Admin users only |
| **Purpose** | View all pickup appointments and mark pickups as complete |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /pickups` | List all appointments | 1 min |
| 2 | `POST /pickups/complete` | Complete a pickup | Mutation |

### Components

```
PickupsPage
├── PageHeader                     # "Pickup Appointments" + count
├── Toolbar
│   ├── SearchInput                # Search by customer name, pickup code
│   ├── StatusFilter               # scheduled, picked_up, completed, cancelled
│   └── DateFilter                 # Filter by slot date
├── DataTable
│   ├── Columns:
│   │   ├── Customer               # Name + email
│   │   ├── Slot                   # Date + time range
│   │   ├── Items                  # Count "3 products"
│   │   ├── PickupCode             # "A1B2C3D4" (bold, prominent)
│   │   ├── Status                 # Badge
│   │   ├── ScheduledDate
│   │   └── Actions                # View, Complete, Verify QR
│   └── Rows
├── DataTablePagination
├── AppointmentDetailSheet
│   ├── Customer info
│   ├── Slot details
│   ├── Invoices list
│   ├── Products list with images
│   ├── Pickup code + QR code
│   ├── "Complete Pickup" button → POST /pickups/complete
│   └── NotesInput (optional)
└── CompletePickupDialog
    ├── VerificationOption         # By appointmentId or pickupCode
    ├── CodeInput                  # Manual code entry
    ├── NotesInput                 # Optional notes
    └── ConfirmButton
```

### Mutations

```typescript
useMutation({
  mutationFn: ({ appointmentId, pickupCode, notes }) =>
    api.post('/pickups/complete', { appointmentId, pickupCode, notes }),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['pickups'] });
    qc.invalidateQueries({ queryKey: ['inventoryMonitoring'] });
    toast.success('Pickup completed successfully');
  },
});
```

### Data Flow

1. Fetch all appointments.
2. Search/filter client-side.
3. Click "Complete" → open dialog → optionally enter code for verification → confirm.
4. On complete → update appointment status + inventory status → refetch.

### User Interactions

- Search by customer name or pickup code.
- Filter by status.
- Click row → view full appointment detail.
- "Complete" → confirmation dialog with optional notes → mark as completed.
- Verify QR code from the appointment detail.

---

## 11. Pickup Slots

| | |
|---|---|
| **Route** | `/admin/pickups/slots` |
| **Auth** | Admin only |
| **Permission** | Admin users only |
| **Purpose** | Create and manage warehouse pickup time slots |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /pickups/slots/all` | List all slots | 1 min |
| 2 | `POST /pickups/slots` | Create new slot | Mutation |

### Components

```
PickupSlotsPage
├── PageHeader                     # "Pickup Slots" + "Create Slot" button
├── DataTable
│   ├── Columns:
│   │   ├── Date                   # "Jul 22, 2026"
│   │   ├── TimeRange              # "9:00 AM - 12:00 PM"
│   │   ├── Customers              # "3 / 10 booked"
│   │   ├── Items                  # "8 / 50 booked"
│   │   ├── CapacityBar            # Visual progress bar
│   │   ├── Status                 # Active / Inactive badge
│   │   └── Actions                # View bookings
│   └── Rows
├── CreateSlotDialog
│   ├── StartDateTime              # Date + time picker
│   ├── EndDateTime                # Date + time picker
│   ├── MaxCustomers               # Number input
│   ├── MaxItems                   # Number input
│   └── CreateButton
└── SlotDetailSheet                # View booked appointments for this slot
    ├── Slot info
    ├── Booked customers list
    └── Items breakdown
```

### Form Schema

```typescript
const slotSchema = z.object({
  startsAt: z.date({ required_error: 'Start time is required' }),
  endsAt: z.date({ required_error: 'End time is required' }),
  maxCustomers: z.number().int().min(1, 'Must allow at least 1 customer'),
  maxItems: z.number().int().min(1, 'Must allow at least 1 item'),
}).refine(data => data.startsAt < data.endsAt, {
  message: 'Start time must be before end time',
  path: ['endsAt'],
});
```

### Mutations

```typescript
useMutation({
  mutationFn: (data) => api.post('/pickups/slots', data),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['pickupSlots'] });
    toast.success('Pickup slot created');
    closeDialog();
  },
});
```

### User Interactions

- Create → dialog → fill start/end time + capacity → create.
- View → see which appointments are booked for this slot.
- Capacity bar shows visual remaining capacity.
- Full slots show as "Full" badge (but are still active for reference).

---

## 12. Notifications

| | |
|---|---|
| **Route** | `/admin/notifications` |
| **Auth** | Admin only |
| **Permission** | Admin users only |
| **Purpose** | View and manage in-app notifications |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /notifications?page=1&limit=10` | List notifications | 30 sec |
| 2 | `PATCH /notifications/read-all` | Mark all as read | Mutation |

### Components

```
NotificationsPage
├── PageHeader                     # "Notifications" + unread count + "Mark All Read" button
├── NotificationList
│   └── NotificationItem[]         # For each notification:
│       ├── UnreadIndicator        # Blue dot if !isViewed
│       ├── Message                # Notification text
│       ├── Type badge             # e.g., "bid", "payment", "pickup"
│       ├── Timestamp              # Relative "2 hours ago"
│       └── Link                   # Navigate to relevant entity
├── DataTablePagination
└── EmptyState                     # "No notifications yet"
```

### Data Flow

1. Fetch paginated notifications.
2. "Mark All Read" → `PATCH /notifications/read-all` → refetch → unread count resets.
3. Real-time: Socket.IO listener for `newNotification` events → prepend to list → update badge.

### Loading State

- Skeleton notification items.

### Empty State

- "No notifications yet. They'll appear here when there's activity."

### User Interactions

- Click notification → navigate to related entity (auction, order, etc.).
- "Mark All Read" → one-click → all unread indicators cleared.
- Pagination for older notifications.

---

## 13. Reports & Analytics

| | |
|---|---|
| **Route** | `/admin/reports` |
| **Auth** | Admin only |
| **Permission** | Admin users only |
| **Purpose** | Detailed analytics with date range filtering across revenue, auctions, pickups, and inventory |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /reports/revenue?startDate=...&endDate=...` | Revenue data | 1 min |
| 2 | `GET /reports/auctions?startDate=...&endDate=...` | Auction data | 1 min |
| 3 | `GET /reports/pickups?startDate=...&endDate=...` | Pickup data | 1 min |
| 4 | `GET /reports/inventory` | Inventory distribution | 5 min |

### Components

```
ReportsPage
├── PageHeader                     # "Reports & Analytics"
├── DateRangePicker                # Shared date filter for all reports
│   ├── QuickOptions: Today, 7 days, 30 days, 90 days, All Time, Custom
│   └── CustomRange: StartDate + EndDate pickers
├── ReportTabs                     # Revenue | Auctions | Pickups | Inventory
├── RevenueReport
│   ├── TotalRevenue               # "$45,230.50"
│   ├── PaidInvoices               # "142"
│   ├── AverageOrderValue          # "$318.52"
│   └── RevenueOverTimeChart       # Line chart (if data supports it)
├── AuctionReport
│   ├── TotalWinningBids           # "$23,450"
│   ├── StatusBreakdownChart       # Bar chart: byStatus
│   │   └── Data: [{ _id: 'active', count: 8 }, { _id: 'ended', count: 45 }, ...]
│   └── AuctionCompletionRate      # Calculated: ended / total
├── PickupReport
│   ├── StatusBreakdownChart       # Bar chart: byStatus
│   │   └── Data: [{ _id: 'completed', appointments: 80, items: 240 }, ...]
│   ├── TotalAppointments          # Sum of all
│   └── TotalItems                 # Sum of all items
├── InventoryReport
│   ├── StatusDistributionChart    # Donut chart
│   │   └── Data: [{ _id: 'available', count: 120 }, ...]
│   └── TotalProducts              # Sum of all
└── ExportButton                   # Optional: export report data
```

### Data Flow

1. Page loads → fetch all 4 reports in parallel (no date filter = all time).
2. Change date range → refetch revenue, auction, pickup reports (inventory has no date filter).
3. Tab switch → render corresponding chart + stats.
4. Charts use Recharts with responsive containers.

### Loading State

- Chart skeletons (gray rectangles).
- Stat number skeletons.

### Error State

- "Unable to load report data" with retry per section.

### User Interactions

- Change date range → all reports refresh.
- Switch tabs → view different report.
- Hover chart elements → tooltips with exact values.
- Quick date presets → instant filter.
- Custom range → date pickers.

---

## 14. Platform Settings

| | |
|---|---|
| **Route** | `/admin/settings` |
| **Auth** | Admin only |
| **Permission** | Admin users only |
| **Purpose** | Configure platform-wide pickup policy, storage fees, and instructions |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /settings` | Fetch current settings | 5 min |
| 2 | `PATCH /settings` | Update settings | Mutation |

### Settings Shape

```typescript
interface PlatformSettings {
  pickupGraceDays: number;       // Days after payment before storage fee applies (default: 7)
  storageFeePerDay: number;      // Daily storage fee after grace period (default: $0)
  forfeitureDays: number;        // Days before item is forfeited (default: 30)
  pickupInstructions?: string;   // Public instructions shown to customers
}
```

### Components

```
SettingsPage
├── PageHeader                     # "Platform Settings"
├── SettingsForm
│   ├── PickupPolicySection
│   │   ├── PickupGraceDaysInput   # Number: "Days before storage fee applies"
│   │   ├── Description: "Customers have X days after payment to schedule pickup before storage fees begin."
│   │   ├── StorageFeeInput        # Number: "Daily storage fee ($)"
│   │   ├── Description: "After the grace period, a $X fee is charged per day for storage."
│   │   ├── ForfeitureDaysInput    # Number: "Days before forfeiture"
│   │   └── Description: "After X days from payment, unclaimed items are forfeited."
│   ├── PickupInstructionsSection
│   │   ├── InstructionsTextArea   # Rich text or plain text
│   │   └── Preview                # Live preview of how instructions appear to customers
│   └── SubmitSection
│       ├── LastSaved              # "Last saved: Jul 20, 2026 at 3:45 PM"
│       └── SaveButton
```

### Form Schema

```typescript
const settingsSchema = z.object({
  pickupGraceDays: z.number().int().min(0, 'Must be 0 or more'),
  storageFeePerDay: z.number().min(0, 'Must be 0 or more'),
  forfeitureDays: z.number().int().min(1, 'Must be at least 1 day'),
  pickupInstructions: z.string().optional(),
});
```

### Mutations

```typescript
useMutation({
  mutationFn: (data) => api.patch('/settings', data),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['settings'] });
    toast.success('Settings saved successfully');
  },
  onError: (error) => handleApiError(error),
});
```

### Data Flow

1. Fetch settings → populate form.
2. Edit fields → form is "dirty" → enable save button.
3. Save → `PATCH /settings` → refetch → show "Last saved" timestamp.
4. Public settings available at `GET /settings/public` (used by pickup schedule page to show instructions).

### Loading State

- Form field skeletons on initial load.

### Error State

- Save failed: "Failed to save settings. Please try again."

### User Interactions

- Edit any field → save button enables.
- Save → loading → success toast → "Last saved" timestamp updates.
- Preview pickup instructions in real-time as typing.
- Validation inline: e.g., "Forfeiture days must be greater than grace days".

---

## Global Admin Behaviors

### DataTable Pattern

All admin list pages follow this consistent pattern:

```typescript
// components/admin/DataTable.tsx
// Props: columns, data, isLoading, pagination, onRowClick, emptyState
```

**Features:**
- Column-based sorting (click header to toggle asc/desc).
- Client-side search filter (debounced).
- Column-based filtering (dropdowns for enum fields).
- Pagination with page size selector (10, 25, 50).
- Row click → open detail slide-out or navigate.
- Skeleton loading state.
- Empty state with CTA.

### Confirmation Dialogs

All destructive actions use the shared `ConfirmDialog`:

```typescript
<ConfirmDialog
  title="Delete Product"
  description="Are you sure? This action cannot be undone."
  confirmText="Delete"
  variant="destructive"
  onConfirm={handleDelete}
/>
```

### Toast Notifications

Consistent feedback for all mutations:
- Success: green toast "Product created successfully"
- Error: red toast with backend error message
- Warning: yellow toast for non-critical issues

### Cache Invalidation Pattern

```typescript
// After any mutation in a module:
qc.invalidateQueries({ queryKey: ['moduleName'] });

// Cross-module invalidation when needed:
// After auction close → invalidate products + inventory + invoices + payments
// After pickup complete → invalidate pickups + inventory
```

### Responsive Behavior

- **Desktop (≥1024px)**: Fixed sidebar + full table view.
- **Tablet (768-1023px)**: Collapsible sidebar + full table view.
- **Mobile (<768px)**: Hidden sidebar (hamburger toggle) + card-based list view instead of table.

### Real-time Updates

- Admin dashboard: Socket.IO listener for `newNotification` → update notification badge.
- Auction detail: `refetchInterval: 30000` for live bid updates.
- Pickup appointments: manual refresh or polling.
