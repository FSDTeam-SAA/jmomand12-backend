# Frontend Architecture & Shared Conventions

> Global frontend architecture, shared conventions, authentication, API layer, folder structure, state management, data models, and implementation guidelines shared by both the **Website** (`/`) and the **Admin Dashboard** (`/admin`).

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [API Layer & Conventions](#5-api-layer--conventions)
6. [State Management](#6-state-management)
7. [Shared Data Models](#7-shared-data-models)
8. [Shared Components](#8-shared-components)
9. [Routing Architecture](#9-routing-architecture)
10. [Error Handling](#10-error-handling)
11. [File Uploads](#11-file-uploads)
12. [Real-time & WebSocket](#12-real-time--websocket)
13. [Caching Strategy](#13-caching-strategy)
14. [Accessibility & Responsive Design](#14-accessibility--responsive-design)
15. [Security Considerations](#15-security-considerations)
16. [Environment Variables](#16-environment-variables)
17. [Implementation Guidelines](#17-implementation-guidelines)

---

## 1. Project Overview

**Jmomand** ("Discount Deals") is a **liquidation auction platform** combining:

- **Buy Now** — direct-purchase e-commerce with cart, checkout, and Stripe payment.
- **Live Auctions** — timed auction events with real-time bidding, outbid notifications, automatic winner assignment, and Stripe payment capture.
- **Pickup Scheduling** — warehouse pickup with QR code verification.

The frontend is a single Next.js application with two route groups:

| Application | Base Path | Auth Role | Layout |
|---|---|---|---|
| **Website** (public) | `/` | `user` | Public navbar + footer |
| **Admin Dashboard** | `/admin` | `admin` | Sidebar + header |

---

## 2. Tech Stack

| Concern | Technology |
|---|---|
| Framework | **Next.js 14+** (App Router) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS** |
| Server State | **TanStack Query v5** (React Query) |
| Client State | **Zustand** |
| Forms | **React Hook Form** + **Zod** (mirrors backend schemas) |
| HTTP Client | **Axios** with interceptors |
| UI Primitives | **shadcn/ui** (Radix UI + Tailwind) |
| Data Tables | **TanStack Table v8** |
| Charts | **Recharts** |
| WebSocket | **Socket.IO Client** |
| Payments | **Stripe.js** + **@stripe/react-stripe-js** |
| Images | **next/image** with Cloudinary loader |

---

## 3. Folder Structure

```
frontend/
├── app/
│   ├── (website)/                    # Public pages (shared layout: navbar + footer)
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Landing
│   │   ├── products/
│   │   │   ├── page.tsx              # Browse
│   │   │   └── [id]/page.tsx         # Detail
│   │   ├── auctions/
│   │   │   ├── page.tsx              # Listing
│   │   │   ├── [id]/page.tsx         # Detail
│   │   │   └── by-day/[day]/page.tsx # By day
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── verify-email/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── wishlist/page.tsx
│   │   ├── checkout/
│   │   │   ├── success/page.tsx
│   │   │   └── cancel/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── account/
│   │   │   ├── page.tsx
│   │   │   ├── payment-methods/page.tsx
│   │   │   └── auction-dashboard/page.tsx
│   │   ├── pickup/
│   │   │   ├── schedule/page.tsx
│   │   │   └── verify/page.tsx
│   │   ├── contact/page.tsx
│   │   └── terms/page.tsx
│   │
│   ├── admin/                        # Admin pages (sidebar + header layout)
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Dashboard
│   │   ├── users/page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   ├── create/page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── inventory/page.tsx
│   │   ├── categories/page.tsx
│   │   ├── auctions/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── create/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── invoices/page.tsx
│   │   ├── payments/page.tsx
│   │   ├── pickups/
│   │   │   ├── page.tsx
│   │   │   └── slots/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
│   │
│   ├── layout.tsx                    # Root layout (providers)
│   └── globals.css
│
├── components/
│   ├── ui/                           # shadcn/ui primitives (Button, Input, Card, Dialog, etc.)
│   ├── shared/                       # Cross-app components
│   │   ├── Pagination.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   ├── ImageWithFallback.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── SearchInput.tsx
│   │   └── StatusBadge.tsx
│   ├── website/                      # Website-only components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── ProductCard.tsx
│   │   ├── AuctionCard.tsx
│   │   ├── AuctionCountdown.tsx
│   │   ├── BidForm.tsx
│   │   ├── CartDrawer.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── PriceFilter.tsx
│   │   ├── StatusFilter.tsx
│   │   ├── SortSelect.tsx
│   │   ├── ContactForm.tsx
│   │   ├── NewsletterForm.tsx
│   │   ├── PaymentMethodSetup.tsx
│   │   └── PickupScheduler.tsx
│   └── admin/                        # Admin-only components
│       ├── AdminSidebar.tsx
│       ├── AdminHeader.tsx
│       ├── DataTable.tsx
│       ├── DataTableToolbar.tsx
│       ├── DataTablePagination.tsx
│       ├── StatsCard.tsx
│       ├── RevenueChart.tsx
│       ├── AuctionForm.tsx
│       ├── ProductForm.tsx
│       ├── BulkUploadZone.tsx
│       ├── UserStatusToggle.tsx
│       └── PickupVerification.tsx
│
├── lib/
│   ├── api.ts                        # Axios instance + interceptors
│   ├── auth.ts                       # Token helpers
│   ├── socket.ts                     # Socket.IO client
│   ├── stripe.ts                     # Stripe provider config
│   ├── validation.ts                 # Shared Zod schemas
│   └── utils.ts                      # formatCurrency, formatDate, cn()
│
├── hooks/
│   ├── useAuth.ts
│   ├── useUser.ts
│   ├── useProducts.ts
│   ├── useAuctions.ts
│   ├── useBids.ts
│   ├── useCart.ts
│   ├── useOrders.ts
│   ├── usePayments.ts
│   ├── useInvoices.ts
│   ├── usePickups.ts
│   ├── useNotifications.ts
│   ├── useCategories.ts
│   ├── useReports.ts
│   ├── useSettings.ts
│   └── useUsers.ts
│
├── stores/
│   ├── authStore.ts
│   ├── cartStore.ts
│   └── uiStore.ts
│
├── types/
│   ├── api.ts
│   ├── user.ts
│   ├── product.ts
│   ├── auction.ts
│   ├── order.ts
│   ├── payment.ts
│   ├── invoice.ts
│   ├── pickup.ts
│   └── notification.ts
│
├── providers/
│   ├── AuthProvider.tsx
│   ├── QueryProvider.tsx
│   ├── SocketProvider.tsx
│   └── ThemeProvider.tsx
│
├── middleware.ts                      # Next.js middleware (route protection)
├── tailwind.config.ts
├── next.config.ts
└── .env.local
```

---

## 4. Authentication & Authorization

### 4.1 Token Strategy

The backend uses a **dual-token JWT** system:

| Token | Storage | Lifetime | Usage |
|---|---|---|---|
| `accessToken` | Zustand store (memory) | Short-lived | `Authorization: Bearer <token>` header |
| `refreshToken` | HttpOnly cookie (`refreshToken`) | 7 days | Silent token refresh |

- On login/register the backend sets `refreshToken` as an **httpOnly cookie** (`sameSite: none` in production, `lax` in development, `secure` in production).
- The response body returns `{ accessToken, user }`.
- The frontend stores `accessToken` in Zustand and attaches it to every API request via the Axios interceptor.

### 4.2 Auth Flows

**Registration → Email Verification → Login**

```
1. POST /users/register { firstName, lastName, email, password }
   → Backend creates user (isVerified: false), hashes OTP, sends email
   → Returns { accessToken, user }
2. Frontend redirects to /auth/verify-email
3. POST /users/email-verifications { otp }  (Authorization: Bearer <accessToken>)
   → Backend sets isVerified: true
4. Frontend redirects to /auth/login
```

**Login**

```
1. POST /auth/login { email, password }
   → Backend checks credentials, isVerified, isSuspend, isBlocked
   → Sets refreshToken cookie, returns { accessToken, user }
2. Frontend stores in Zustand, redirects to home or intended page
```

**Token Refresh (automatic via interceptor)**

```
1. Axios interceptor catches 401 response
2. POST /auth/refresh-token (cookie auto-sent)
   → Backend verifies refreshToken, returns new { accessToken }
3. Interceptor updates Zustand, retries original request
4. If refresh fails → clear store, redirect to /auth/login
```

**Password Reset**

```
1. POST /auth/forgot-password { email }
   → Backend sends OTP, returns { accessToken } (scoped for OTP flow)
2. POST /auth/verify-otp { otp }  (Bearer required)
   → Returns { accessToken } (scoped for password change)
3. POST /auth/reset-password { newPassword }  (Bearer required)
   → Password updated, redirect to login
```

**Change Password**

```
POST /auth/change-password { currentPassword, newPassword }  (Bearer required)
```

### 4.3 Role-Based Access Control

Two roles defined in `user.constant.ts`:

```typescript
USER_ROLE = { ADMIN: "admin", USER: "user" }
```

**Backend middleware** `auth(...roles)` extracts the JWT from `Authorization: Bearer`, verifies it, attaches `req.user` with `{ sub, email, role }`, and checks the role against the allowed list.

**Frontend route protection** via Next.js `middleware.ts`:

| Route Pattern | Required Role |
|---|---|
| `/admin/**` | `admin` |
| `/account/**` | `user` |
| `/cart`, `/wishlist` | `user` |
| `/checkout/**` | `user` |
| `/orders/**` | `user` |
| `/pickup/schedule` | `user` |
| All other public routes | None |

### 4.4 Auth Store (Zustand)

```typescript
interface AuthState {
  accessToken: string | null;
  user: {
    id: string;
    email: string;
    role: 'user' | 'admin';
    firstName: string;
    lastName: string;
    image?: { public_id: string; url: string };
  } | null;
  isAuthenticated: boolean;
  isAdmin: boolean;

  login: (accessToken: string, user: AuthState['user']) => void;
  logout: () => void;
  updateUser: (partial: Partial<AuthState['user']>) => void;
}
```

---

## 5. API Layer & Conventions

### 5.1 Axios Configuration

```typescript
// lib/api.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach accessToken
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
        useAuthStore.getState().login(data.data.accessToken, useAuthStore.getState().user);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 5.2 Standard Response Shape

Every backend endpoint returns:

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  statusCode: number;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
  _links?: Record<string, string>;
}
```

### 5.3 Error Response Shape

```typescript
interface ApiErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  errorSource: Array<{ path: string | number; message: string }>;
  stack?: string;
}
```

### 5.4 Complete Endpoint Reference

All endpoints are prefixed with `/api/v1`.

#### Auth

| Method | Endpoint | Auth | Request Body | Response Data |
|---|---|---|---|---|
| POST | `/auth/login` | None | `{ email, password }` | `{ accessToken, user }` |
| POST | `/auth/refresh-token` | Cookie | — | `{ accessToken }` |
| POST | `/auth/forgot-password` | None | `{ email }` | `{ accessToken }` |
| POST | `/auth/resend-forgot-otp` | Bearer | — | — |
| POST | `/auth/verify-otp` | Bearer | `{ otp }` | `{ accessToken }` |
| POST | `/auth/reset-password` | Bearer | `{ newPassword }` | user object |
| POST | `/auth/change-password` | Bearer | `{ currentPassword, newPassword }` | user object |

#### Users

| Method | Endpoint | Auth | Request Body | Response Data |
|---|---|---|---|---|
| POST | `/users/register` | None | `{ firstName, lastName, email, password }` | `{ accessToken, user }` |
| POST | `/users/email-verifications` | Bearer | `{ otp }` | user object |
| POST | `/users/email-verifications/resend` | Bearer | — | user object |
| GET | `/users` | Admin | — | User[] |
| GET | `/users/me` | Bearer | — | User |
| PATCH | `/users/me` | Bearer | FormData: profile fields + `image` | User |
| GET | `/users/admin-id` | Bearer | — | `{ _id }` |
| GET | `/users/:userId` | Admin | — | User |
| PATCH | `/users/:id/suspension` | Admin | — | User (toggled) |
| PATCH | `/users/:id/block` | Admin | — | User (toggled) |

#### Products

| Method | Endpoint | Auth | Request Body | Response Data |
|---|---|---|---|---|
| POST | `/products` | Admin | FormData: fields + `images` (max 5) + `categoryImage` | Product |
| POST | `/products/bulk` | Admin | FormData: `file` (ZIP) + `type` (for_sale/for_auction) | BulkUploadResult |
| GET | `/products` | Public | Query: searchTerm, category, condition, inventoryStatus, type, minPrice, maxPrice, priceRange, status, fields, sortBy, sortOrder, page, limit | { meta, data: Product[] } |
| GET | `/products/browse` | Public | Query: searchTerm, category, condition (comma-sep), type, minPrice, maxPrice, priceRange, status (comma-sep), minBid, maxBid, sortBy, sortOrder, page, limit | { meta, data: Product[] } |
| GET | `/products/categories` | Public | — | `{ category, categoryImage }[]` |
| GET | `/products/inventory` | Public | Query: searchTerm, category, condition, inventoryStatus, type, sortBy, sortOrder, page, limit | { meta, data: Product[] } |
| GET | `/products/auctions` | Admin | Query: same as inventory | { meta, data: Product[] } |
| GET | `/products/inventory-monitoring` | Admin | Query: inventoryStatus, category, searchTerm | Product[] (aggregated) |
| GET | `/products/:id` | Public | — | Product |
| PATCH | `/products/:id` | Admin | FormData: fields + `images` | Product |
| DELETE | `/products/:id` | Admin | — | Product |

#### Categories

| Method | Endpoint | Auth | Request Body | Response Data |
|---|---|---|---|---|
| POST | `/category` | Public* | FormData: `name` + `image` | Category |
| GET | `/category/all` | Public | Query: page, limit, searchTerm | { meta, data: Category[] } |
| GET | `/category/:id` | Public | — | Category |
| PUT | `/category/update/:id` | Public* | FormData: fields + `image` | Category |
| PUT | `/category/toggle/:id` | Public* | — | Category |

> \* Category routes lack auth middleware in the backend. The frontend should restrict these to admin.

#### Auctions

| Method | Endpoint | Auth | Request Body / Query | Response Data |
|---|---|---|---|---|
| POST | `/auctions` | Admin | `{ title, description, products[], auctionSchedule, pickupSchedule, startingBid, bidIncrement, reservePrice }` | Auction (enriched) |
| GET | `/auctions` | Public | Query: status, searchTerm, page, limit, sortBy, sortOrder | { meta, data: Auction[] } |
| GET | `/auctions/active` | Public | Query: page, limit | { meta, data: Auction[] } |
| GET | `/auctions/upcoming` | Public | Query: page, limit | { meta, data: Auction[] } |
| GET | `/auctions/closing-soon` | Public | Query: page, limit | { meta, data: Auction[] } (includes timeRemaining) |
| GET | `/auctions/closed` | Public | Query: page, limit | { meta, data: Auction[] } |
| GET | `/auctions/by-day` | Public | Query: day (optional) | { availableDays, selectedDay, auctions } |
| GET | `/auctions/:id` | Public | — | Auction (enriched) |

#### Auction Products

| Method | Endpoint | Auth | Response Data |
|---|---|---|---|
| GET | `/auction-products/active` | Public | AuctionProduct[] |
| GET | `/auction-products/:auctionId` | Public | AuctionProduct[] |
| GET | `/auction-products/details/:auctionProductId` | Public | AuctionProduct (detailed) |

#### Bids

| Method | Endpoint | Auth | Request Body | Response Data |
|---|---|---|---|---|
| POST | `/bid` | User | `{ auctionProductId, amount }` | Bid |
| GET | `/bid/me/dashboard` | User | — | `{ summary, active[], won[], lost[] }` |

#### Cart & Wishlist

| Method | Endpoint | Auth | Request Body | Response Data |
|---|---|---|---|---|
| POST | `/carts` | User | `{ productId, quantity?, type: "cart"/"wishlist" }` | CartItem |
| GET | `/carts/cart` | User | — | CartItem[] (populated) |
| GET | `/carts/wishlist` | User | — | CartItem[] (populated) |
| DELETE | `/carts/:id` | User | — | null |
| PATCH | `/carts/quantity/:id` | User | `{ action: "increase"/"decrease" }` | CartItem |

#### Orders

| Method | Endpoint | Auth | Request Body / Notes | Response Data |
|---|---|---|---|---|
| POST | `/orders/checkout` | User | — (uses cart) | `{ checkoutUrl }` |
| POST | `/orders/webhook` | Stripe | Raw body + signature | `{ success }` |
| GET | `/orders/me` | User | — | Order[] |
| GET | `/orders` | Admin | — | Order[] |

#### Payments

| Method | Endpoint | Auth | Request Body | Response Data |
|---|---|---|---|---|
| POST | `/payments/webhook` | Stripe | Raw body + signature | `{ received }` |
| GET | `/payments` | Admin | Query: page, limit | { meta, data: PaymentRow[] } |
| GET | `/payments/test-helper-status` | Bearer | — | `{ enabled }` |
| POST | `/payments/setup-intents` | User | — | `{ customerId, setupIntentId, clientSecret, publishableKey }` |
| GET | `/payments/setup-intents/:setupIntentId` | User | — | SetupIntentStatus |
| POST | `/payments/default-payment-method` | User | `{ setupIntentId?, paymentMethodId? }` | User |
| POST | `/payments/test-default-payment-method` | User | `{ testPaymentMethodId? }` | User |

#### Invoices

| Method | Endpoint | Auth | Response Data |
|---|---|---|---|
| GET | `/invoices/me` | User | Invoice[] |
| GET | `/invoices` | Admin | Invoice[] |
| POST | `/invoices/verify-pickup` | Admin | `{ tokenOrCode }` → Invoice |

#### Pickups

| Method | Endpoint | Auth | Request Body | Response Data |
|---|---|---|---|---|
| POST | `/pickups/slots` | Admin | `{ startsAt, endsAt, maxCustomers, maxItems }` | PickupSlot |
| GET | `/pickups/slots` | Bearer | — | PickupSlot[] |
| GET | `/pickups/slots/all` | Public | — | PickupSlot[] |
| GET | `/pickups/ready-invoices` | User | — | Invoice[] |
| POST | `/pickups` | User | `{ slotId, invoiceIds[] }` | PickupAppointment |
| GET | `/pickups/me` | User | — | PickupAppointment[] |
| GET | `/pickups` | Admin | — | PickupAppointment[] |
| POST | `/pickups/complete` | Admin | `{ appointmentId?, pickupCode?, notes? }` | PickupAppointment |

#### Notifications

| Method | Endpoint | Auth | Response Data |
|---|---|---|---|
| GET | `/notifications` | Admin | { meta, data: Notification[] } |
| PATCH | `/notifications/read-all` | Admin | updateMany result |

#### Reports

| Method | Endpoint | Auth | Query | Response Data |
|---|---|---|---|---|
| GET | `/reports/revenue` | Admin | startDate, endDate | `{ totalRevenue, paidInvoices, averageOrderValue }` |
| GET | `/reports/auctions` | Admin | startDate, endDate | `{ totalWinningBids, byStatus[] }` |
| GET | `/reports/pickups` | Admin | startDate, endDate | `{ byStatus[] }` |
| GET | `/reports/inventory` | Admin | — | `{ _id, count }[]` |

#### Settings

| Method | Endpoint | Auth | Request Body | Response Data |
|---|---|---|---|---|
| GET | `/settings` | Admin | — | PlatformSettings |
| PATCH | `/settings` | Admin | Partial<PlatformSettings> | PlatformSettings |
| GET | `/settings/public` | Public | — | PlatformSettings |

#### Contact & Newsletter

| Method | Endpoint | Auth | Request Body |
|---|---|---|---|
| POST | `/contacts` | None | `{ firstName, lastName, email, phone, message }` |
| POST | `/newsletters/subscribe` | None | `{ email, source? }` |

---

## 6. State Management

### 6.1 Server State — React Query

All API data is managed through React Query hooks. Pattern:

```typescript
// hooks/useProducts.ts
export function useProductList(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => api.get('/products', { params: filters }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductDetail(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fd: FormData) => api.post('/products', fd).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
```

### 6.2 Client State — Zustand

| Store | Purpose | Persistence |
|---|---|---|
| `authStore` | accessToken, user, login/logout | None (memory only) |
| `cartStore` | Item count, drawer open state | None |
| `uiStore` | Sidebar collapsed, theme | localStorage |

### 6.3 Optimistic Updates

For bidding and cart operations, use React Query's `onMutate` / `onError` / `onSettled`:

```typescript
onMutate: async (newBid) => {
  await qc.cancelQueries({ queryKey: ['auctionProduct', id] });
  const prev = qc.getQueryData(['auctionProduct', id]);
  qc.setQueryData(['auctionProduct', id], (old) => ({
    ...old,
    highestBid: { amount: newBid.amount, bidder: { _id: user.id } },
  }));
  return { prev };
},
onError: (_err, _vars, ctx) => {
  qc.setQueryData(['auctionProduct', id], ctx.prev);
},
onSettled: () => {
  qc.invalidateQueries({ queryKey: ['auctionProduct', id] });
},
```

---

## 7. Shared Data Models

### User

```typescript
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  street?: string;
  location?: string;
  postalCode?: string;
  dateOfBirth?: string;
  role: 'user' | 'admin';
  image?: { public_id: string; url: string };
  isVerified: boolean;
  isSuspend: boolean;
  isBlocked: boolean;
  hasDefaultPaymentMethod: boolean;
  stripeCustomerId?: string;
  defaultPaymentMethodId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Product

```typescript
type ProductCondition =
  | 'new' | 'open_box' | 'like_new' | 'used' | 'damaged'
  | 'for_parts' | 'brand_new' | 'like_new_open_box'
  | 'scratch_and_dent' | 'salvage';

type ProductInventoryStatus =
  | 'available' | 'auction_active' | 'auction_ended'
  | 'winner_assigned' | 'payment_pending' | 'payment_completed'
  | 'ready_for_pickup' | 'pickup_scheduled' | 'picked_up'
  | 'completed' | 'unsold' | 'unavailable';

interface Product {
  _id: string;
  inventoryId: string;
  title: string;
  description: string;
  category: string;
  categoryImage?: { public_id: string; url: string };
  condition: ProductCondition;
  inventoryStatus: ProductInventoryStatus;
  images: Array<{ public_id: string; url: string }>;
  color: string[];
  type: 'for_sale' | 'for_auction';
  quantity?: number;
  price?: number;
  reservePrice?: number;
  day?: string;
  manufacturer?: string;
  totalReview: number;
  averageReview: number;
  categoryId?: any;
  createdAt: string;
  updatedAt: string;
}
```

### Category

```typescript
interface Category {
  _id: string;
  name: string;
  image: { public_id: string; url: string };
  totalProduct: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Auction

```typescript
type AuctionStatus =
  | 'upcoming' | 'active' | 'ended'
  | 'payment_pending' | 'payment_failed'
  | 'sold' | 'unsold' | 'cancelled';

interface Auction {
  _id: string;
  auctionId: string;
  products: Product[];
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  durationInDays: number;
  status: AuctionStatus;
  pickupSchedule?: {
    startDate: string;
    endDate: string;
    dailyStartTime: string;
    dailyEndTime: string;
    durationInDays: number;
  };
  winner?: User;
  auctionProducts?: AuctionProduct[];
  timeRemaining?: number;       // seconds (closing-soon endpoint)
  createdAt: string;
  updatedAt: string;
}
```

### AuctionProduct

```typescript
type AuctionProductStatus =
  | 'upcoming' | 'active' | 'ended'
  | 'payment_pending' | 'payment_failed'
  | 'sold' | 'unsold' | 'cancelled';

interface AuctionProduct {
  _id: string;
  auctionId: Auction | string;
  productId: Product | string;
  startingBid: number;
  reservePrice?: number;
  bidIncrement: number;
  status: AuctionProductStatus;
  highestBid: {
    bidder?: User;
    bid?: string;
    amount: number;
    placedAt?: string;
  };
  winner?: User;
  soldPrice?: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  pickupStatus: 'pending' | 'scheduled' | 'completed';
  closedAt?: string;
  canBid?: boolean;
  minimumNextBid?: number;
  product?: Product;
  auction?: {
    _id: string; auctionId: string; title: string;
    description?: string; startsAt: string; endsAt: string;
    status: AuctionStatus;
  };
}
```

### Bid

```typescript
interface Bid {
  _id: string;
  auctionId: string;
  auctionProductId: string;
  productId: string;
  bidderId: string;
  amount: number;
  isWinningBid: boolean;
  createdAt: string;
}
```

### CartItem

```typescript
interface CartItem {
  _id: string;
  userId: string;
  productId: Product;
  type: 'cart' | 'wishlist';
  quantity?: number;
  createdAt: string;
  updatedAt: string;
}
```

### Order

```typescript
type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

interface Order {
  _id: string;
  orderNumber: string;
  customer: User | string;
  items: Array<{ product: Product; quantity: number; price: number }>;
  totalAmount: number;
  status: OrderStatus;
  paidAt?: string;
  pickupCode: string;
  pickupQrDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Invoice

```typescript
type InvoiceStatus = 'payment_pending' | 'paid' | 'payment_failed' | 'void';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  auction: Auction;
  product: Product;
  customer: User;
  inventoryId: string;
  amount: number;
  status: InvoiceStatus;
  pickupCode: string;
  pickupQrDataUrl?: string;
  paidAt?: string;
  paymentFailureReason?: string;
  createdAt: string;
  updatedAt: string;
}
```

### PickupSlot

```typescript
interface PickupSlot {
  _id: string;
  startsAt: string;
  endsAt: string;
  maxCustomers: number;
  maxItems: number;
  bookedCustomers: number;
  bookedItems: number;
  isActive: boolean;
}
```

### PickupAppointment

```typescript
type PickupAppointmentStatus = 'scheduled' | 'picked_up' | 'completed' | 'cancelled';

interface PickupAppointment {
  _id: string;
  customer: User;
  slot: PickupSlot;
  invoices: Invoice[];
  products: Product[];
  pickupCode: string;
  status: PickupAppointmentStatus;
  pickedUpAt?: string;
  completedAt?: string;
  verifiedBy?: User;
  notes?: string;
  createdAt: string;
}
```

### Notification

```typescript
interface Notification {
  _id: string;
  to: string;
  message: string;
  isViewed: boolean;
  type: string;
  id: string;
  createdAt: string;
}
```

### PlatformSettings

```typescript
interface PlatformSettings {
  _id: string;
  key: 'platform';
  pickupGraceDays: number;
  storageFeePerDay: number;
  forfeitureDays: number;
  pickupInstructions?: string;
}
```

### PaymentRow (Admin view)

```typescript
interface PaymentRow {
  date: string | null;
  transactionId: string | null;
  method: string;
  amount: number;
}
```

---

## 8. Shared Components

### 8.1 Status Badge Maps

```typescript
const auctionStatusColors: Record<AuctionStatus, string> = {
  upcoming: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  ended: 'bg-gray-100 text-gray-800',
  payment_pending: 'bg-yellow-100 text-yellow-800',
  payment_failed: 'bg-red-100 text-red-800',
  sold: 'bg-emerald-100 text-emerald-800',
  unsold: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800',
};

const conditionLabels: Record<ProductCondition, string> = {
  new: 'New', open_box: 'Open Box', like_new: 'Like New',
  used: 'Used', damaged: 'Damaged', for_parts: 'For Parts',
  brand_new: 'Brand New', like_new_open_box: 'Like New Open Box',
  scratch_and_dent: 'Scratch & Dent', salvage: 'Salvage',
};

const inventoryStatusColors: Record<ProductInventoryStatus, string> = {
  available: 'bg-green-100 text-green-800',
  auction_active: 'bg-blue-100 text-blue-800',
  auction_ended: 'bg-gray-100 text-gray-800',
  winner_assigned: 'bg-purple-100 text-purple-800',
  payment_pending: 'bg-yellow-100 text-yellow-800',
  payment_completed: 'bg-emerald-100 text-emerald-800',
  ready_for_pickup: 'bg-cyan-100 text-cyan-800',
  pickup_scheduled: 'bg-indigo-100 text-indigo-800',
  picked_up: 'bg-teal-100 text-teal-800',
  completed: 'bg-green-100 text-green-800',
  unsold: 'bg-orange-100 text-orange-800',
  unavailable: 'bg-red-100 text-red-800',
};

const orderStatusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const invoiceStatusColors: Record<InvoiceStatus, string> = {
  payment_pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  payment_failed: 'bg-red-100 text-red-800',
  void: 'bg-gray-100 text-gray-800',
};
```

---

## 9. Routing Architecture

### 9.1 Next.js Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get('refreshToken');
  const path = request.nextUrl.pathname;

  if (path.startsWith('/admin') && !refreshToken) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const protectedRoutes = ['/account', '/cart', '/wishlist', '/checkout', '/orders', '/pickup/schedule'];
  if (protectedRoutes.some(r => path.startsWith(r)) && !refreshToken) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}
```

### 9.2 URL Structure

**Website:**

| URL | Page |
|---|---|
| `/` | Landing |
| `/products` | Browse products |
| `/products/[id]` | Product detail |
| `/auctions` | Auction listing |
| `/auctions/[id]` | Auction detail |
| `/auctions/by-day/[day]` | Auctions by weekday |
| `/auth/login` | Login |
| `/auth/register` | Register |
| `/auth/forgot-password` | Forgot password |
| `/auth/reset-password` | Reset password |
| `/auth/verify-email` | Email verification |
| `/cart` | Shopping cart |
| `/wishlist` | Wishlist |
| `/checkout/success` | Checkout success |
| `/checkout/cancel` | Checkout cancelled |
| `/orders` | Order history |
| `/account` | Profile |
| `/account/payment-methods` | Saved cards |
| `/account/auction-dashboard` | My bids |
| `/pickup/schedule` | Schedule pickup |
| `/pickup/verify` | QR verification |
| `/contact` | Contact form |
| `/terms` | Terms of service |

**Admin:**

| URL | Page |
|---|---|
| `/admin` | Dashboard analytics |
| `/admin/users` | User management |
| `/admin/products` | Product list |
| `/admin/products/create` | Create product |
| `/admin/products/[id]` | Product detail/edit |
| `/admin/products/inventory` | Inventory monitoring |
| `/admin/categories` | Category management |
| `/admin/auctions` | Auction management |
| `/admin/auctions/[id]` | Auction detail |
| `/admin/auctions/create` | Create auction |
| `/admin/orders` | Order management |
| `/admin/invoices` | Invoice management |
| `/admin/payments` | Payment history |
| `/admin/pickups` | All appointments |
| `/admin/pickups/slots` | Pickup slots |
| `/admin/notifications` | Notifications |
| `/admin/reports` | Reports & analytics |
| `/admin/settings` | Platform settings |

---

## 10. Error Handling

```typescript
// Unified API error handler
function handleApiError(error: AxiosError<ApiErrorResponse>) {
  const status = error.response?.status;
  const message = error.response?.data?.message || 'An unexpected error occurred';
  const sources = error.response?.data?.errorSource || [];

  if (status === 401) { /* trigger logout + redirect */ }
  if (status === 403) { toast.error('Not authorized'); }
  if (status === 404) { /* show not found */ }
  if (status === 409) { toast.warning(message); }
  if (status === 400 && sources.length) { /* map field errors to form */ }
  if (status === 402) { toast.error('Payment required'); }
  if (status === 502) { toast.error('Payment service unavailable'); }
  if (status && status >= 500) { toast.error('Server error'); }
}
```

---

## 11. File Uploads

Backend Multer limits: **10 MB**, types: `jpeg, jpg, pdf, png, mp4, avi, mov, avif, zip, csv, webp`.

```typescript
// Single image upload (profile, category)
const fd = new FormData();
fd.append('image', file);
await api.patch('/users/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

// Multiple images (product, max 5)
const fd = new FormData();
files.forEach(f => fd.append('images', f));
fd.append('title', '...');
await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

// Bulk upload (ZIP)
const fd = new FormData();
fd.append('file', zipFile);
fd.append('type', 'for_sale');
await api.post('/products/bulk', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
```

---

## 12. Real-time & WebSocket

```typescript
// lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(userId: string): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000', {
      transports: ['websocket'],
    });
    socket.on('connect', () => socket?.emit('joinRoom', userId));
  }
  return socket;
}
```

Server flow: client emits `joinRoom(userId)` → server joins room → when a notification is created, server emits `newNotification` to that room → client updates notification badge / React Query cache.

---

## 13. Caching Strategy

| Data Type | staleTime | cacheTime | Notes |
|---|---|---|---|
| Public products | 5 min | 30 min | `refetchOnWindowFocus: true` |
| Auction listings | 30 sec | 5 min | Near-real-time for active auctions |
| Auction detail | 30 sec | 5 min | `refetchInterval: 30000` when active |
| User profile | 5 min | 30 min | |
| Cart items | 0 | 5 min | Always fresh |
| Admin lists | 1 min | 10 min | `refetchOnWindowFocus: true` |
| Settings | 30 min | 1 hr | Rarely changes |
| Categories | 10 min | 30 min | |

**Post-mutation invalidation:**

```typescript
// After bid
qc.invalidateQueries({ queryKey: ['auctionProduct'] });
qc.invalidateQueries({ queryKey: ['auctions'] });
qc.invalidateQueries({ queryKey: ['myBids'] });

// After cart change
qc.invalidateQueries({ queryKey: ['cart'] });

// After admin product CRUD
qc.invalidateQueries({ queryKey: ['products'] });
qc.invalidateQueries({ queryKey: ['inventory'] });
```

---

## 14. Accessibility & Responsive Design

### Breakpoints (Tailwind)

| Class | Width | Target |
|---|---|---|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |

### Key Patterns

- **Navbar**: Hamburger menu on mobile, horizontal nav on desktop.
- **Product grid**: 1 col → 2 col → 3-4 col.
- **Admin sidebar**: Collapsible drawer on mobile, fixed sidebar on desktop.
- **Admin tables**: Horizontal scroll on mobile.
- **Forms**: Full-width on mobile, grid on desktop.

### Accessibility

- Visible focus indicators on all interactive elements.
- Descriptive `alt` text on images.
- Associated `<label>` elements for all inputs.
- Contrast ratio ≥ 4.5:1 for text.
- Keyboard navigation for all interactive components.
- ARIA roles for modals, tabs, menus, drawers.
- Skeleton components for all loading states.

---

## 15. Security Considerations

1. `accessToken` in memory only (Zustand) — never localStorage or cookies accessible to JS.
2. `refreshToken` in httpOnly cookie — inaccessible to JavaScript.
3. Use `sameSite: none` + HTTPS in production.
4. Mirror backend Zod validation on the frontend.
5. Validate file type/size client-side before upload.
6. Use Stripe.js for all card handling — never touch raw card numbers.
7. Only expose `NEXT_PUBLIC_*` env vars to the client.
8. WebSocket: only join rooms for authenticated users.

---

## 16. Environment Variables

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:5000

# Stripe (publishable key only)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Cloudinary (for client-side image transforms, optional)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
```

---

## 17. Implementation Guidelines

### Development Phases

1. **Phase 1**: Project setup (Next.js, Tailwind, shadcn/ui, folder structure, API layer, auth flow)
2. **Phase 2**: Core website (product browse, product detail, landing page, auth pages)
3. **Phase 3**: E-commerce (cart, wishlist, checkout, orders, payment methods)
4. **Phase 4**: Auctions (listing, detail, bidding, auction dashboard)
5. **Phase 5**: Pickup & invoices (schedule, QR verify, invoice list)
6. **Phase 6**: Admin dashboard (all 14 modules)
7. **Phase 7**: Polish (error boundaries, loading/empty states, responsive, a11y)

### Code Conventions

- Use `'use client'` only when needed (forms, interactivity). Prefer Server Components.
- All API calls go through the `api.ts` Axios instance.
- All form validation uses Zod schemas (client + server).
- Timestamps in user's local timezone via `Intl.DateTimeFormat`.
- Monetary values formatted as `$X.XX` via `formatCurrency()`.
- Naming: `use[Domain]` for hooks, `[Domain]Card` for list items, `[Domain]Form` for forms.
- Loading states use Skeleton components (not spinners).
- Empty states use the shared `EmptyState` component with CTA.
- Error states use `ErrorBoundary` or toast notifications.

### Key API Call Sequences

**Product Browse:**
```
1. GET /products/browse?searchTerm=...&category=...&status=...&page=1&limit=12
2. GET /products/categories
```

**Auction Detail:**
```
1. GET /auctions/:id
2. GET /auction-products/:auctionId
3. [WebSocket] listen for bid updates → invalidate auction queries
```

**Checkout:**
```
1. GET  /carts/cart
2. POST /payments/setup-intents (if no saved card)
3. Stripe.js: confirm card setup
4. POST /payments/default-payment-method
5. POST /orders/checkout
6. Redirect to Stripe → /checkout/success
7. GET /orders/me (verify)
```

**Admin Auction Creation:**
```
1. GET  /products/auctions (available products)
2. POST /auctions
3. Cron auto-activates at startsAt
4. Cron auto-closes at endsAt, processes payments
```
