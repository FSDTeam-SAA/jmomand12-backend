# Website — Page-by-Page Implementation Guide

> Complete implementation guide for every page of the public-facing **Jmomand** website. For each page: purpose, route, required APIs, API call sequence, components, data flow, loading/error/empty states, caching, and user interactions.

---

## Table of Contents

1. [Landing Page](#1-landing-page)
2. [Product Browse](#2-product-browse)
3. [Product Detail](#3-product-detail)
4. [Auction Listing](#4-auction-listing)
5. [Auction Detail](#5-auction-detail)
6. [Auctions by Day](#6-auctions-by-day)
7. [Login](#7-login)
8. [Register](#8-register)
9. [Verify Email](#9-verify-email)
10. [Forgot Password](#10-forgot-password)
11. [Reset Password](#11-reset-password)
12. [Cart](#12-cart)
13. [Wishlist](#13-wishlist)
14. [Checkout Success](#14-checkout-success)
15. [Checkout Cancel](#15-checkout-cancel)
16. [Order History](#16-order-history)
17. [Profile / Account](#17-profile--account)
18. [Payment Methods](#18-payment-methods)
19. [Auction Dashboard (My Bids)](#19-auction-dashboard-my-bids)
20. [Pickup Schedule](#20-pickup-schedule)
21. [Pickup QR Verify](#21-pickup-qr-verify)
22. [Contact](#22-contact)
23. [Terms of Service](#23-terms-of-service)

---

## 1. Landing Page

| | |
|---|---|
| **Route** | `/` |
| **Layout** | Website layout (Navbar + Footer) |
| **Auth** | None |
| **Purpose** | Hero section, featured categories, active auctions preview, newsletter signup |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /products/categories` | Display category grid/cards | 10 min |
| 2 | `GET /auctions/active?limit=6` | Show featured active auctions | 30 sec |

### Components

```
LandingPage
├── HeroSection                    # Static hero with CTA → /products or /auctions
├── FeaturedCategories
│   └── CategoryCard[]             # Image + name → /products?category=X
├── ActiveAuctionsPreview
│   └── AuctionCard[]              # Title, countdown, highest bid → /auctions/[id]
│   └── "View All Auctions" link   # → /auctions
├── HowItWorks                     # Static 3-step guide
├── NewsletterSection
│   └── NewsletterForm             # POST /newsletters/subscribe
└── Footer                         # Static links, contact info
```

### Data Flow

1. Page loads → fetch categories and active auctions in parallel via `Promise.all`.
2. Categories render as clickable cards linking to `/products?category=X`.
3. Active auctions render as `AuctionCard` components with live countdown timers.
4. Newsletter form submits to `/newsletters/subscribe` with optimistic "Already subscribed" handling.

### Loading State

- Skeleton placeholders for category grid (6 cards) and auction cards (6 cards).
- Hero section renders immediately (static content).

### Error State

- If categories fail: show empty state "Categories coming soon".
- If auctions fail: hide auction section gracefully.
- Newsletter error: show toast "Subscription failed. Please try again."

### Empty State

- No active auctions: Show "No live auctions right now. Check back soon!" with link to `/auctions`.

### User Interactions

- Click category → navigate to `/products?category=X`.
- Click auction card → navigate to `/auctions/[id]`.
- Submit newsletter → toast success "Subscribed!" or "Already subscribed".
- "Browse Products" CTA → `/products`.
- "View Auctions" CTA → `/auctions`.

---

## 2. Product Browse

| | |
|---|---|
| **Route** | `/products` |
| **Layout** | Website layout |
| **Auth** | None |
| **Purpose** | Browse and filter all products with search, category, condition, status, price, and sort controls |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /products/browse?...filters` | Paginated product list | 5 min |
| 2 | `GET /products/categories` | Category filter sidebar | 10 min |

### Query Parameters

```typescript
interface ProductBrowseParams {
  searchTerm?: string;       // Search by title, description, category
  category?: string;         // Exact category name
  condition?: string;        // Comma-separated: "brand_new,like_new"
  type?: 'for_sale' | 'for_auction';
  priceRange?: 'under_100' | '100_500' | '500_1000' | '1000_5000' | '5000_plus';
  minPrice?: number;
  maxPrice?: number;
  status?: string;           // Comma-separated: "buy_now,live_auction,ending_soon,upcoming_auction"
  minBid?: number;
  maxBid?: number;
  sortBy?: string;           // Default: "createdAt"
  sortOrder?: 'asc' | 'desc'; // Default: "desc"
  page?: number;             // Default: 1
  limit?: number;            // Default: 10
}
```

### Components

```
ProductBrowsePage
├── SearchBar                     # Debounced search input
├── FilterSidebar (desktop) / FilterDrawer (mobile)
│   ├── CategoryFilter            # Checkbox list from /products/categories
│   ├── ConditionFilter           # Multi-select checkboxes (10 conditions)
│   ├── StatusFilter              # Multi-select: buy_now, live_auction, ending_soon, upcoming_auction
│   ├── PriceFilter               # Preset ranges + custom min/max
│   ├── BidRangeFilter            # Min/max current bid
│   └── TypeFilter                # Radio: all / for_sale / for_auction
├── SortSelect                    # Sort by: Newest, Price Low→High, Price High→Low
├── ProductGrid
│   └── ProductCard[]             # Image, title, price/bid, condition badge, category
├── Pagination                    # Page navigation with total count
└── ActiveFilters                 # Removable filter chips above grid
```

### Data Flow

1. Page loads → fetch products with default filters (`page=1, limit=12, sortBy=createdAt, sortOrder=desc`) and categories in parallel.
2. URL search params sync with filter state (shareable URLs).
3. Filter changes → debounced query update (300ms) → re-fetch.
4. Pagination → update `page` param → re-fetch.
5. Sort change → update `sortBy`/`sortOrder` → re-fetch with `page=1`.

### URL Sync

All filters are persisted as URL search params for shareability:
`/products?category=Mobile&condition=brand_new&status=buy_now&page=2`

### Loading State

- Initial load: Full-page skeleton grid (12 placeholder cards).
- Filter/pagination change: Show skeleton overlay on grid (keep current data visible behind).

### Error State

- API error: Show error banner with retry button.
- Network error: "Unable to load products. Please check your connection and try again."

### Empty State

- No products match filters: "No products found matching your criteria. Try adjusting your filters."
- Clear filters CTA button.

### User Interactions

- Type in search → debounced auto-search.
- Toggle filter checkboxes → instant re-fetch.
- Click product card → navigate to `/products/[id]`.
- Click "Add to Cart" on card (if logged in + for_sale) → add to cart mutation + toast.
- Click "Bid Now" on card (if logged in + for_auction + active) → navigate to auction detail.
- Infinite scroll or traditional pagination (configurable).

---

## 3. Product Detail

| | |
|---|---|
| **Route** | `/products/[id]` |
| **Layout** | Website layout |
| **Auth** | None (browse); User (add to cart/wishlist) |
| **Purpose** | Full product detail with images, specifications, purchase/bid CTA |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /products/:id` | Product details | 5 min |
| 2 | `GET /auction-products/details/:auctionProductId` | Bid data (if auction product) | 30 sec |

> **Note**: The second call is needed only if this product is part of an auction. The frontend needs to determine this — check if `type === 'for_auction'` and query `auction-products` by product ID (may need a lookup or the detail page can use `GET /auction-products/:auctionId` if the auction context is known).

### Components

```
ProductDetailPage
├── ImageGallery                   # Main image + thumbnails, zoom on hover
├── ProductInfo
│   ├── Breadcrumb                 # Home > Category > Product
│   ├── Title
│   ├── ConditionBadge
│   ├── PriceDisplay               # For sale: $price | For auction: "Current bid: $X" + "Reserve: $X"
│   ├── StockInfo                  # "X in stock" (for sale) or bid count
│   ├── CategoryBadge
│   ├── ColorSwatches              # Display color options
│   ├── Manufacturer               # If available
│   └── InventoryId                # "SKU: PRD-XXXXXX-MM-YY"
├── ProductDescription             # Full description text
├── ActionPanel
│   ├── BuyNowButton               # (for_sale only) → add to cart
│   ├── AddToCartButton            # (for_sale + logged in) → add to cart
│   ├── AddToWishlistButton        # (logged in) → add to wishlist
│   ├── BidSection                 # (for_auction + active) → BidForm
│   │   ├── CurrentBidDisplay
│   │   ├── MinimumNextBidInfo
│   │   └── BidForm (amount input + submit)
│   └── LoginPrompt                # (not logged in) → "Log in to bid/buy"
└── RelatedProducts                # Optional: products in same category
```

### Data Flow

1. Page loads → fetch product by ID.
2. If `type === 'for_auction'` → also fetch auction product detail for bid info.
3. If auction is active → start countdown timer for auction end.
4. Bid form submission → `POST /bid` → optimistic update → invalidate auction queries.

### Loading State

- Skeleton: Image gallery placeholder + info block skeleton + description skeleton.

### Error State

- Product not found: "Product not found" with back link.
- API error: Error page with retry.

### Empty State

- N/A (product either exists or doesn't).

### User Interactions

- Click thumbnail → swap main image.
- Zoom on main image (hover or click).
- "Add to Cart" → mutation + cart badge update + toast "Added to cart".
- "Add to Wishlist" → mutation + toast "Added to wishlist".
- "Place Bid" → bid form validation → mutation → toast "Bid placed!" or error message.
- "Log in to bid/buy" → redirect to `/auth/login?redirect=/products/[id]`.
- Share button → copy product URL.

---

## 4. Auction Listing

| | |
|---|---|
| **Route** | `/auctions` |
| **Layout** | Website layout |
| **Auth** | None |
| **Purpose** | Browse auctions grouped by status: Active, Upcoming, Closing Soon, Closed |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /auctions/active?page=1&limit=10` | Active auctions | 30 sec |
| 2 | `GET /auctions/upcoming?page=1&limit=10` | Upcoming auctions | 1 min |
| 3 | `GET /auctions/closing-soon?page=1&limit=10` | Closing within 3 days | 30 sec |
| 4 | `GET /auctions/closed?page=1&limit=10` | Ended auctions | 5 min |

### Components

```
AuctionListingPage
├── PageHeader                     # "Auctions" title + description
├── StatusTabs                     # Active | Upcoming | Closing Soon | Closed
├── AuctionGrid
│   └── AuctionCard[]              # Image, title, countdown, highest bid, product count
├── Pagination                     # Per-tab pagination
├── AuctionByDayPreview            # "Browse by Day" CTA → /auctions/by-day
└── DaySelector                    # Quick links for Mon-Sun → /auctions/by-day/[day]
```

### Data Flow

1. Page loads → fetch active auctions (default tab).
2. Tab switch → fetch corresponding auctions (lazy-load other tabs).
3. "Closing Soon" tab shows `timeRemaining` (seconds) from API.
4. Each `AuctionCard` has a live countdown timer.

### Loading State

- Tab content: Skeleton grid of 6 auction cards.

### Error State

- Tab fetch fails: "Unable to load auctions" with retry.

### Empty State

- Active: "No active auctions right now. Check upcoming auctions!"
- Closing Soon: "No auctions closing soon."
- Closed: "No closed auctions yet."

### User Interactions

- Click tab → switch displayed auctions.
- Click auction card → navigate to `/auctions/[id]`.
- Click day link → navigate to `/auctions/by-day/[day]`.
- Pagination within each tab.

---

## 5. Auction Detail

| | |
|---|---|
| **Route** | `/auctions/[id]` |
| **Layout** | Website layout |
| **Auth** | None (view); User (bid) |
| **Purpose** | Full auction detail with products, bidding interface, and real-time bid updates |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /auctions/:id` | Auction metadata + products | 30 sec |
| 2 | `GET /auction-products/:auctionId` | Detailed auction products with bid info | 30 sec |

### Components

```
AuctionDetailPage
├── AuctionHeader
│   ├── AuctionId                  # "AUC-000001-07-26"
│   ├── Title + Description
│   ├── StatusBadge
│   ├── CountdownTimer             # Live countdown to endsAt
│   └── ScheduleInfo               # "Starts: Jul 20, 2026 · Ends: Jul 27, 2026"
├── ProductList
│   └── AuctionProductCard[]       # For each product in auction:
│       ├── ProductImage
│       ├── ProductTitle + Description
│       ├── ConditionBadge
│       ├── CurrentBidDisplay      # "$250" or "No bids yet"
│       ├── HighestBidderInfo      # "You are the highest bidder!" or "Bidder #xxx"
│       ├── BidIncrementInfo       # "Min next bid: $275"
│       ├── BidForm               # Amount input + "Place Bid" button
│       ├── BidHistory             # Expandable: list of recent bids
│       └── WinnerInfo             # (ended) Winner name, final price
├── AuctionSchedule                # Start/end dates, pickup schedule
├── PickupScheduleInfo             # If auction has pickup schedule defined
└── RelatedAuctions                # Other active auctions
```

### Data Flow

1. Page loads → fetch auction detail + auction products in parallel.
2. If auction is `active` → start countdown timer; enable `refetchInterval: 30000`.
3. Socket.IO listener → on `newNotification` → invalidate auction product queries.
4. Bid submission → `POST /bid { auctionProductId, amount }` → optimistic update → on success invalidate → on error rollback.

### Bid Validation (Client-side)

```typescript
const bidSchema = z.object({
  auctionProductId: z.string().min(1),
  amount: z.number()
    .positive('Bid must be positive')
    .min(minimumNextBid, `Minimum bid is $${minimumNextBid}`),
});
```

### Loading State

- Skeleton: Auction header + 3 product card skeletons.

### Error State

- Auction not found: "This auction doesn't exist or has been removed."
- Bid error: Toast with specific message (e.g., "Minimum bid is $275", "You already have the highest bid").
- 409 Conflict: "Someone placed a higher bid. Refresh to see the latest."

### Empty State

- No products in auction: "This auction has no products yet."

### User Interactions

- Place bid → validation → mutation → toast success/error.
- Expand bid history → shows recent bids for each product.
- Click product image → navigate to `/products/[id]`.
- If ended + user won → show "You won! Check your invoice." with link to `/account/auction-dashboard`.
- Share auction → copy URL.

---

## 6. Auctions by Day

| | |
|---|---|
| **Route** | `/auctions/by-day/[day]` |
| **Layout** | Website layout |
| **Auth** | None |
| **Purpose** | Browse active auctions organized by weekday |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /auctions/by-day` | Available days with auction counts | 5 min |
| 2 | `GET /auctions/by-day?day=[day]` | Auctions for selected day | 30 sec |

### Components

```
AuctionByDayPage
├── DaySelector                    # Horizontal scroll: Mon, Tue, Wed, Thu, Fri, Sat, Sun
│   └── DayTab[]                   # Active days highlighted with auction count badge
├── SelectedDayHeader              # "Monday Auctions · 5 auctions"
├── AuctionList
│   └── AuctionCard[]              # Auction cards for selected day
└── NoAuctionsForDay               # Empty state if day has no auctions
```

### Data Flow

1. Page loads → fetch available days → highlight current selection from URL param.
2. If `[day]` param present → fetch auctions for that day.
3. Click day tab → navigate to `/auctions/by-day/[selectedDay]`.
4. If URL has no day param → show day selector only.

### Loading State

- Day tabs: horizontal skeleton bar.
- Auction list: skeleton card grid.

### Empty State

- Day has no auctions: "No auctions scheduled for [Day]. Try another day!"
- No days available: "No auctions scheduled this week. Check back soon!"

### User Interactions

- Click day tab → URL update → fetch auctions.
- Click auction card → `/auctions/[id]`.

---

## 7. Login

| | |
|---|---|
| **Route** | `/auth/login` |
| **Layout** | Minimal layout (centered card, no navbar) |
| **Auth** | None |
| **Purpose** | User login with email and password |

### API Calls

| # | Endpoint | Purpose |
|---|---|---|
| 1 | `POST /auth/login { email, password }` | Authenticate user |

### Components

```
LoginPage
├── AuthCard
│   ├── Logo
│   ├── LoginForm (React Hook Form + Zod)
│   │   ├── EmailInput
│   │   ├── PasswordInput (with show/hide toggle)
│   │   ├── "Forgot password?" link → /auth/forgot-password
│   │   └── SubmitButton "Log In"
│   ├── Divider
│   └── "Don't have an account? Register" link → /auth/register
└── ErrorDisplay                    # Inline error for invalid credentials
```

### Form Schema

```typescript
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
```

### Data Flow

1. User fills form → client-side Zod validation.
2. Submit → `POST /auth/login`.
3. On success → store `accessToken` + `user` in Zustand → redirect to `?redirect` param or `/`.
4. On 404/401 → display "Invalid email or password" inline.
5. If user `isSuspend` or `isBlocked` → display specific error from backend.

### Error States

- Invalid credentials: "No account found with the provided credentials." or "Invalid password".
- Suspended: "Your account has been suspended."
- Blocked: "Your account has been blocked."
- Unverified: "Please verify your email before logging in." → link to `/auth/verify-email`.

### User Interactions

- Submit form → loading spinner on button.
- Enter key submits form.
- "Forgot password?" → `/auth/forgot-password`.
- "Register" → `/auth/register`.
- If redirected from protected route, login redirects back after success.

---

## 8. Register

| | |
|---|---|
| **Route** | `/auth/register` |
| **Layout** | Minimal layout |
| **Auth** | None |
| **Purpose** | Create new account and trigger email verification |

### API Calls

| # | Endpoint | Purpose |
|---|---|---|
| 1 | `POST /users/register { firstName, lastName, email, password }` | Create account |

### Components

```
RegisterPage
├── AuthCard
│   ├── Logo
│   ├── RegisterForm
│   │   ├── FirstNameInput
│   │   ├── LastNameInput
│   │   ├── EmailInput
│   │   ├── PasswordInput (min 6 chars with strength indicator)
│   │   ├── ConfirmPasswordInput (client-side match validation)
│   │   └── SubmitButton "Create Account"
│   ├── Divider
│   └── "Already have an account? Log in" link → /auth/login
└── TermsCheckbox                    # "I agree to the Terms of Service"
```

### Form Schema

```typescript
const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

### Data Flow

1. Fill form → client-side validation.
2. Submit → `POST /users/register`.
3. On success → store `accessToken` + `user` in Zustand → redirect to `/auth/verify-email`.
4. On 409 Conflict → "User already exists" (if verified). If unverified, backend re-sends OTP and redirects to verify.

### Error States

- Duplicate email (verified): "An account with this email already exists."
- Password too short: "Password must be at least 6 characters."
- Validation errors: Inline field-level errors.

### User Interactions

- Real-time password match validation.
- Password strength indicator.
- Submit → loading state on button.
- "Log in" link → `/auth/login`.

---

## 9. Verify Email

| | |
|---|---|
| **Route** | `/auth/verify-email` |
| **Layout** | Minimal layout |
| **Auth** | Bearer token (from registration) |
| **Purpose** | Enter 6-digit OTP to verify email address |

### API Calls

| # | Endpoint | Purpose |
|---|---|---|
| 1 | `POST /users/email-verifications { otp }` | Verify email |
| 2 | `POST /users/email-verifications/resend` | Resend OTP |

### Components

```
VerifyEmailPage
├── AuthCard
│   ├── Logo
│   ├── "Verify your email" heading
│   ├── Description text: "We sent a 6-digit code to [email]"
│   ├── OTPInput                     # 6 individual digit inputs
│   ├── VerifyButton "Verify Email"
│   ├── ResendLink                   # "Didn't receive the code? Resend" (with 60s cooldown)
│   └── SuccessMessage               # "Email verified! Redirecting to login..."
└── CountdownTimer                   # 5-minute OTP expiry indicator
```

### Data Flow

1. Page loads → check if user has accessToken (from registration flow). If not, redirect to `/auth/register`.
2. User enters 6-digit code → submit → `POST /users/email-verifications { otp }`.
3. On success → toast "Email verified!" → redirect to `/auth/login` after 2 seconds.
4. On error (expired): "OTP has expired. Please request a new one."
5. Resend → `POST /users/email-verifications/resend` → start 60s cooldown.

### Loading State

- Verify button: loading spinner during submission.
- Resend cooldown: countdown "Resend in 58s".

### Error States

- Invalid OTP: "Invalid OTP. Please try again."
- Expired OTP: "OTP has expired." + auto-show resend option.
- Already verified: "User already verified." → redirect to login.

### User Interactions

- Auto-focus next digit input on entry.
- Auto-submit when all 6 digits entered.
- Paste support (paste full code into first input).
- Resend link (with 60s cooldown timer).

---

## 10. Forgot Password

| | |
|---|---|
| **Route** | `/auth/forgot-password` |
| **Layout** | Minimal layout |
| **Auth** | None |
| **Purpose** | Request password reset OTP |

### API Calls

| # | Endpoint | Purpose |
|---|---|---|
| 1 | `POST /auth/forgot-password { email }` | Send reset OTP |

### Components

```
ForgotPasswordPage
├── AuthCard
│   ├── Logo
│   ├── "Forgot your password?" heading
│   ├── Description: "Enter your email to receive a reset code"
│   ├── EmailForm
│   │   ├── EmailInput
│   │   └── SubmitButton "Send Reset Code"
│   └── "Back to login" link → /auth/login
└── SuccessMessage                    # "If an account exists, we sent a reset code."
```

### Data Flow

1. Enter email → submit → `POST /auth/forgot-password`.
2. On success → store returned `accessToken` in Zustand (scoped for OTP flow) → redirect to `/auth/reset-password`.
3. On error (user not found): Still show success message (don't leak whether email exists).

### User Interactions

- Submit → loading spinner.
- Always show generic success message regardless of whether email exists (security).

---

## 11. Reset Password

| | |
|---|---|
| **Route** | `/auth/reset-password` |
| **Layout** | Minimal layout |
| **Auth** | Bearer token (from forgot-password flow) |
| **Purpose** | Enter OTP + new password to reset |

### API Calls

| # | Endpoint | Purpose |
|---|---|---|
| 1 | `POST /auth/verify-otp { otp }` | Verify OTP |
| 2 | `POST /auth/reset-password { newPassword }` | Set new password |

### Components

```
ResetPasswordPage
├── AuthCard (multi-step)
│   ├── Step 1: OTP Verification
│   │   ├── OTPInput (6 digits)
│   │   └── SubmitButton "Verify Code"
│   ├── Step 2: New Password
│   │   ├── NewPasswordInput
│   │   ├── ConfirmPasswordInput
│   │   └── SubmitButton "Reset Password"
│   └── Step 3: Success
│       ├── Checkmark icon
│       └── "Password reset successfully! Redirecting to login..."
└── ResendLink                        # "Resend code" with cooldown
```

### Data Flow

1. Step 1: Enter OTP → `POST /auth/verify-otp`.
2. On success → advance to Step 2 (new password form).
3. Step 2: Enter new password → `POST /auth/reset-password`.
4. On success → show success message → redirect to `/auth/login` after 3 seconds.
5. On error: "New password cannot be the same as the current password."

### User Interactions

- Step progression with visual indicator.
- Password strength indicator.
- Auto-redirect after success.

---

## 12. Cart

| | |
|---|---|
| **Route** | `/cart` |
| **Layout** | Website layout |
| **Auth** | User |
| **Purpose** | View and manage cart items before checkout |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /carts/cart` | Fetch cart items | 0 (always fresh) |
| 2 | `PATCH /carts/quantity/:id` | Increase/decrease quantity | Mutation |
| 3 | `DELETE /carts/:id` | Remove item | Mutation |

### Components

```
CartPage
├── PageHeader                     # "Shopping Cart (3 items)"
├── CartItems
│   └── CartItemCard[]             # For each item:
│       ├── ProductImage           # → /products/[id]
│       ├── ProductTitle           # → /products/[id]
│       ├── UnitPrice              # "$299.00"
│       ├── QuantityControl        # [-] [3] [+] buttons
│       ├── LineTotal              # "$897.00"
│       └── RemoveButton           # X icon → delete
├── CartSummary
│   ├── Subtotal                   # Sum of line totals
│   ├── ItemCount                  # "3 items"
│   ├── CheckoutButton "Proceed to Checkout" → POST /orders/checkout
│   └── ContinueShoppingLink       # → /products
├── EmptyCart                       # Empty state
│   ├── CartIcon
│   ├── "Your cart is empty"
│   └── "Browse Products" CTA → /products
└── SuggestedProducts               # Optional: "You might also like"
```

### Data Flow

1. Page loads → fetch cart items.
2. Quantity change → optimistic update → `PATCH /carts/quantity/:id { action: "increase"/"decrease" }`.
3. Remove → confirm dialog → `DELETE /carts/:id` → refetch.
4. Checkout button → `POST /orders/checkout` → redirect to Stripe Checkout URL.

### Loading State

- Initial: Skeleton cart item cards (3 placeholders).
- Quantity change: Spinner on quantity buttons.

### Error States

- Stock exceeded: "Only X items available" → auto-adjust quantity.
- Product removed from stock: "Product no longer available" → auto-remove from cart.
- Checkout error: "Unable to start checkout. Please try again."

### Empty State

- "Your cart is empty. Browse our products to find something you love!" + CTA.

### User Interactions

- Increase/decrease quantity → immediate UI update.
- Remove → confirmation dialog → remove with undo toast (3 seconds).
- Click product image/title → `/products/[id]`.
- Checkout → loading state → redirect to Stripe.

---

## 13. Wishlist

| | |
|---|---|
| **Route** | `/wishlist` |
| **Layout** | Website layout |
| **Auth** | User |
| **Purpose** | View and manage wishlisted items |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /carts/wishlist` | Fetch wishlist items | 5 min |
| 2 | `DELETE /carts/:id` | Remove from wishlist | Mutation |
| 3 | `POST /carts` { type: 'cart' } | Move to cart | Mutation |

### Components

```
WishlistPage
├── PageHeader                     # "My Wishlist (5 items)"
├── WishlistGrid
│   └── WishlistItemCard[]         # For each item:
│       ├── ProductImage → /products/[id]
│       ├── ProductTitle → /products/[id]
│       ├── PriceDisplay
│       ├── "Move to Cart" button  → POST /carts { type: 'cart' }
│       └── "Remove" button        → DELETE /carts/:id
└── EmptyWishlist                   # Empty state
```

### Data Flow

1. Fetch wishlist items.
2. "Move to Cart" → `POST /carts { productId, type: 'cart', quantity: 1 }` → remove from wishlist → add to cart → invalidate both queries.
3. Remove → confirm → `DELETE /carts/:id`.

### Empty State

- "Your wishlist is empty. Save items you love for later!" + browse CTA.

### User Interactions

- Move to cart → success toast "Moved to cart".
- Remove → confirmation + undo toast.
- Click product → navigate to detail page.

---

## 14. Checkout Success

| | |
|---|---|
| **Route** | `/checkout/success?session_id={CHECKOUT_SESSION_ID}` |
| **Layout** | Website layout |
| **Auth** | User |
| **Purpose** | Confirm successful payment and show order details |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /orders/me` | Fetch latest order | 0 (fresh) |

> The Stripe webhook (`POST /orders/webhook`) processes the payment server-side. By the time the user arrives here, the order should already be created.

### Components

```
CheckoutSuccessPage
├── SuccessIcon                     # Animated checkmark
├── "Payment Successful!" heading
├── OrderSummary
│   ├── OrderNumber                 # "ORD-2026-1001"
│   ├── ItemsList
│   │   └── OrderItem[]             # Title, qty, price
│   ├── TotalPaid
│   └── PickupCode                  # "Pickup Code: A1B2C3D4"
├── PickupQrCode                    # Display QR image from pickupQrDataUrl
├── NextSteps
│   ├── "Schedule your pickup" CTA → /pickup/schedule
│   └── "View order history" link → /orders
└── "Continue Shopping" link → /products
```

### Data Flow

1. Page loads → fetch latest orders → find order matching this checkout session.
2. Display order confirmation with pickup code and QR.
3. Show next-step CTAs.

### Loading State

- Loading spinner while fetching order.

### Error State

- Order not found: "Your payment was processed. Please check your email for confirmation."

### User Interactions

- Download/print QR code.
- Click "Schedule pickup" → `/pickup/schedule`.

---

## 15. Checkout Cancel

| | |
|---|---|
| **Route** | `/checkout/cancel` |
| **Layout** | Website layout |
| **Auth** | User |
| **Purpose** | Inform user that checkout was cancelled |

### Components

```
CheckoutCancelPage
├── CancelIcon                      # X circle icon
├── "Checkout Cancelled" heading
├── "Your payment was not processed." description
├── "Return to Cart" CTA → /cart
└── "Continue Shopping" link → /products
```

### API Calls

None. This is a static page.

### User Interactions

- "Return to Cart" → `/cart` (cart items preserved).

---

## 16. Order History

| | |
|---|---|
| **Route** | `/orders` |
| **Layout** | Website layout |
| **Auth** | User |
| **Purpose** | View all past orders |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /orders/me` | Fetch user's orders | 1 min |

### Components

```
OrdersPage
├── PageHeader                     # "My Orders"
├── OrderList
│   └── OrderCard[]                # For each order:
│       ├── OrderNumber            # "ORD-2026-1001"
│       ├── Date                   # "Jul 20, 2026"
│       ├── StatusBadge            # pending / paid / failed / cancelled
│       ├── ItemsPreview           # Product thumbnails + "3 items"
│       ├── TotalAmount
│       ├── PickupCode             # "Code: A1B2C3D4" (if paid)
│       ├── PickupStatus           # "Pickup scheduled" or "Schedule pickup" CTA
│       └── ViewDetails expansion  # Full item list
└── EmptyOrders                     # Empty state
```

### Data Flow

1. Fetch orders sorted by `createdAt` desc.
2. Display order cards with status badges and pickup CTAs.

### Loading State

- Skeleton order cards (3 placeholders).

### Empty State

- "You haven't placed any orders yet. Start shopping!" + browse CTA.

### User Interactions

- Expand order → show full item details.
- "Schedule pickup" → `/pickup/schedule?orderId=X` (if order is paid and not yet scheduled).
- "Track pickup" → show appointment status.

---

## 17. Profile / Account

| | |
|---|---|
| **Route** | `/account` |
| **Layout** | Website layout |
| **Auth** | User |
| **Purpose** | View and edit profile information |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /users/me` | Fetch profile | 5 min |
| 2 | `PATCH /users/me` | Update profile | Mutation |

### Components

```
AccountPage
├── PageHeader                     # "My Account"
├── Sidebar/TabNav
│   ├── Profile (active)
│   ├── Payment Methods
│   └── Auction Dashboard
├── ProfileSection
│   ├── AvatarUpload               # Click to change → PATCH /users/me (FormData)
│   ├── ProfileForm (React Hook Form)
│   │   ├── FirstNameInput
│   │   ├── LastNameInput
│   │   ├── EmailInput (read-only)
│   │   ├── PhoneInput
│   │   ├── StreetInput
│   │   ├── LocationInput
│   │   ├── PostalCodeInput
│   │   ├── DateOfBirthInput (date picker)
│   │   └── SaveButton
│   └── PasswordSection
│       ├── ChangePasswordForm
│       │   ├── CurrentPasswordInput
│       │   ├── NewPasswordInput
│       │   ├── ConfirmNewPasswordInput
│       │   └── ChangeButton → POST /auth/change-password
│       └── "Forgot password?" link → /auth/forgot-password
└── AccountStatus
    ├── VerificationBadge          # "Verified ✓" or "Not verified"
    └── MemberSince                # "Member since Jul 2026"
```

### Data Flow

1. Fetch profile → populate form.
2. Edit fields → submit → `PATCH /users/me` → refetch profile → toast "Profile updated".
3. Avatar change → file input → `PATCH /users/me` (FormData with `image`) → refetch.
4. Change password → `POST /auth/change-password` → toast success.

### Loading State

- Profile skeleton (avatar placeholder + form field skeletons).

### Error States

- "Current password is incorrect" → inline error.
- "New password cannot be the same as the current password."

### User Interactions

- Click avatar → file picker → auto-upload.
- Form field changes → enable save button.
- Save → loading state on button → success toast.

---

## 18. Payment Methods

| | |
|---|---|
| **Route** | `/account/payment-methods` |
| **Layout** | Website layout (within account section) |
| **Auth** | User |
| **Purpose** | Manage saved payment methods (Stripe cards) |

### API Calls

| # | Endpoint | Purpose |
|---|---|---|
| 1 | `GET /users/me` | Check current payment method status |
| 2 | `GET /payments/test-helper-status` | Check if test mode active |
| 3 | `POST /payments/setup-intents` | Create Stripe SetupIntent → get clientSecret |
| 4 | `POST /payments/default-payment-method` | Save confirmed card |
| 5 | `POST /payments/test-default-payment-method` | Test mode: quick save test card |

### Components

```
PaymentMethodsPage
├── SavedCardSection
│   ├── CardDisplay                # "Visa ending in 4242" or "No card saved"
│   ├── DefaultBadge               # "Default payment method"
│   └── RemoveOption               # (Future: remove card)
├── AddCardSection
│   ├── StripeElementsProvider     # @stripe/react-stripe-js
│   │   └── CardElement            # Stripe secure card input
│   ├── "Save Card" button
│   └── SetupIntent status tracking
├── TestModeHelper                 # (Dev/test only)
│   ├── TestCardSelector           # pm_card_visa, pm_card_mastercard, etc.
│   └── "Quick Save Test Card" button
└── SecurityNote                   # "Your card details are handled securely by Stripe."
```

### Stripe Flow

1. **Normal flow:**
   - Click "Add Card" → `POST /payments/setup-intents` → receive `clientSecret`.
   - Render Stripe `CardElement` with `clientSecret`.
   - User enters card → Stripe.js confirms setup.
   - On success → `POST /payments/default-payment-method { setupIntentId }` → card saved.
   - Refetch profile → `hasDefaultPaymentMethod: true`.

2. **Test mode flow:**
   - Show test card buttons (pm_card_visa, etc.).
   - Click → `POST /payments/test-default-payment-method { testPaymentMethodId }` → card instantly saved.

### Loading State

- SetupIntent creation: spinner.
- Card confirmation: "Processing..." on button.

### Error States

- "Stripe is not configured" → "Payment setup is currently unavailable."
- Card declined → "Your card was declined. Please try a different card."
- SetupIntent not completed → "Please confirm your card details first."

### User Interactions

- Enter card → Stripe.js handles all sensitive data (PCI compliance).
- Save → loading → success toast "Card saved successfully!".
- Test card → instant save → success toast.

---

## 19. Auction Dashboard (My Bids)

| | |
|---|---|
| **Route** | `/account/auction-dashboard` |
| **Layout** | Website layout (within account section) |
| **Auth** | User |
| **Purpose** | View personal bidding activity: active bids, won auctions, lost auctions |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /bid/me/dashboard` | Bid activity summary | 30 sec |

### Components

```
AuctionDashboardPage
├── SummaryCards                    # 3 stat cards
│   ├── Active Bids (count)        # Blue
│   ├── Won (count)                # Green
│   └── Lost (count)               # Red
├── Tabs                            # Active | Won | Lost
├── ActiveTab
│   └── ActiveBidCard[]            # For each active bid:
│       ├── ProductImage + Title   # → /auctions/[id]
│       ├── CurrentBid             # "$250"
│       ├── YourBid                # "$220"
│       ├── IsLeading?             # ✓ "You're the highest bidder" or "Outbid by $30"
│       ├── TotalBids              # "12 bids"
│       ├── CountdownTimer         # Time until auction ends
│       ├── MinimumNextBid         # "Min next bid: $275"
│       └── "Bid Again" button → /auctions/[id]
├── WonTab
│   └── WonBidCard[]               # For each won auction:
│       ├── ProductImage + Title
│       ├── WinningBid             # "$450"
│       ├── WonDate
│       ├── PaymentStatus          # Badge: pending/paid/failed
│       ├── PickupStatus           # Badge: pending/scheduled/completed
│       ├── InvoiceNumber          # Link to invoice
│       └── "Schedule Pickup" CTA → /pickup/schedule (if ready)
├── LostTab
│   └── LostBidCard[]              # For each lost auction:
│       ├── ProductImage + Title
│       ├── YourFinalBid           # "$200"
│       ├── WinningBid             # "$350"
│       └── EndedDate
└── EmptyTabs                       # Empty state for each tab
```

### Data Flow

1. Fetch dashboard data → returns `{ summary: { active, won, lost }, active[], won[], lost[] }`.
2. Render summary cards and tab content.
3. Active bids have live countdown timers.
4. Won items show payment/pickup status from invoice/appointment data.

### Loading State

- Summary cards: number skeletons.
- Tab content: card skeletons.

### Empty States

- Active: "You don't have any active bids. Browse auctions to start bidding!"
- Won: "You haven't won any auctions yet. Keep bidding!"
- Lost: "No lost bids. Every bid counts!"

### User Interactions

- Click tab → switch content.
- "Bid Again" → navigate to auction detail.
- "Schedule Pickup" → `/pickup/schedule`.
- Click product → navigate to auction detail.

---

## 20. Pickup Schedule

| | |
|---|---|
| **Route** | `/pickup/schedule` |
| **Layout** | Website layout |
| **Auth** | User |
| **Purpose** | Schedule pickup for paid auction items or orders |

### API Calls

| # | Endpoint | Purpose | Cache |
|---|---|---|---|
| 1 | `GET /pickups/ready-invoices` | Invoices ready for pickup scheduling | 1 min |
| 2 | `GET /pickups/slots` | Available pickup time slots | 5 min |
| 3 | `POST /pickups` | Schedule pickup appointment | Mutation |
| 4 | `GET /pickups/me` | Existing appointments | 1 min |

### Components

```
PickupSchedulePage
├── PageHeader                     # "Schedule a Pickup"
├── StepIndicator                  # Step 1: Select Items → Step 2: Choose Slot → Step 3: Confirm
├── Step1: SelectInvoices
│   ├── InvoiceCheckboxList        # Select paid invoices to include
│   │   └── InvoiceCheckbox[]      # Product image, title, invoice number, amount
│   └── "Continue" button
├── Step2: ChooseSlot
│   ├── SlotCalendar               # Available slots with dates/times
│   │   └── SlotCard[]             # Date, time range, available spots, items capacity
│   ├── SlotCapacityInfo           # "X of Y spots available · X of Z items remaining"
│   └── "Continue" button
├── Step3: Confirm
│   ├── AppointmentSummary
│   │   ├── SelectedItems          # List of invoices/products
│   │   ├── SelectedSlot           # Date/time
│   │   └── PickupInstructions     # From GET /settings/public
│   ├── "Confirm Pickup" button   → POST /pickups
│   └── "Back" button
├── ExistingAppointments           # Show already scheduled pickups
│   └── AppointmentCard[]          # Slot time, status, items, pickup code
└── EmptyState                     # No invoices ready
```

### Data Flow

1. Fetch ready invoices + available slots in parallel.
2. Step 1: User selects invoices via checkboxes.
3. Step 2: User picks a time slot → validate capacity client-side.
4. Step 3: Confirm → `POST /pickups { slotId, invoiceIds[] }`.
5. On success → toast "Pickup scheduled!" → refetch appointments → show confirmation.

### Loading State

- Initial: skeleton lists for invoices and slots.
- Submission: "Scheduling..." on confirm button.

### Error States

- Slot full: "This time slot is no longer available. Please choose another."
- Item already scheduled: "One or more items are already scheduled."
- No ready invoices: "No items ready for pickup yet."

### Empty State

- No ready invoices: "You don't have any items ready for pickup yet. Items become available after payment confirmation."
- No available slots: "No pickup slots available at the moment. Please check back later."

### User Interactions

- Multi-step wizard with back/forward navigation.
- Select/deselect invoices.
- Select slot → visual highlight.
- Confirm → success animation.

---

## 21. Pickup QR Verify

| | |
|---|---|
| **Route** | `/pickup/verify` |
| **Layout** | Minimal layout |
| **Auth** | None (public verification page) |
| **Purpose** | Verify a pickup QR code or pickup code at the warehouse |

### API Calls

| # | Endpoint | Purpose |
|---|---|---|
| 1 | `POST /invoices/verify-pickup { tokenOrCode }` | Verify pickup |

> This endpoint requires **Admin** auth. In practice, this page is used by warehouse staff who are logged in as admin. The token/code comes from the URL query param: `/pickup/verify?token=XXXX`.

### Components

```
PickupVerifyPage
├── VerifyForm
│   ├── CodeInput                   # Manual pickup code entry
│   └── "Verify" button → POST /invoices/verify-pickup
├── VerificationResult              # (shown after successful verify)
│   ├── ValidIcon                   # ✓ Green checkmark
│   ├── CustomerName
│   ├── ProductTitle + InventoryId
│   ├── InvoiceNumber
│   ├── Amount
│   ├── PickupCode
│   └── "Complete Pickup" button → POST /pickups/complete
└── InvalidResult                   # X icon + "Invalid code"
```

### Data Flow

1. If URL has `?token=X` → auto-verify on page load.
2. Otherwise → show code input form.
3. Verify → `POST /invoices/verify-pickup { tokenOrCode }` → show result.
4. If valid → show "Complete Pickup" button → `POST /pickups/complete { pickupCode }`.

### User Interactions

- Enter code → verify → see customer/item details.
- Complete pickup → confirmation → redirect.

---

## 22. Contact

| | |
|---|---|
| **Route** | `/contact` |
| **Layout** | Website layout |
| **Auth** | None |
| **Purpose** | Send a message to the platform administrators |

### API Calls

| # | Endpoint | Purpose |
|---|---|---|
| 1 | `POST /contacts { firstName, lastName, email, phone, message }` | Send message |

### Components

```
ContactPage
├── PageHeader                     # "Contact Us"
├── ContactInfo                    # Static: address, email, phone
├── ContactForm (React Hook Form)
│   ├── FirstNameInput
│   ├── LastNameInput
│   ├── EmailInput
│   ├── PhoneInput
│   ├── MessageTextArea
│   └── SubmitButton "Send Message"
└── FAQSection                     # Optional: common questions
```

### Form Schema

```typescript
const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(1, 'Phone number is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});
```

### Data Flow

1. Fill form → client validation → submit → `POST /contacts`.
2. On success → toast "Message sent successfully!" → clear form.
3. Backend sends email to admin email address via nodemailer.

### Loading State

- Submit button: loading spinner.

### Error State

- Submission error: "Failed to send message. Please try again or email us directly."

### User Interactions

- Form validation on blur.
- Submit → loading → success → clear form.
- Prefill email if user is logged in.

---

## 23. Terms of Service

| | |
|---|---|
| **Route** | `/terms` |
| **Layout** | Website layout |
| **Auth** | None |
| **Purpose** | Static terms of service page |

### Components

```
TermsPage
├── PageHeader                     # "Terms of Service"
├── ContentSection                 # Static markdown/HTML content
│   ├── Acceptance of Terms
│   ├── Auction Rules
│   ├── Payment Terms
│   ├── Pickup Policy
│   ├── Returns & Refunds
│   └── Contact Information
└── LastUpdated                    # "Last updated: July 2026"
```

### API Calls

None. Static content.

### Data Flow

Render static content. Optionally fetch from a CMS in the future.

---

## Global Website Behaviors

### Navbar

```typescript
// components/website/Navbar.tsx
// Shows on all (website) pages
├── Logo → /
├── NavLinks: Products | Auctions | Contact
├── SearchIcon → opens search overlay → /products?searchTerm=X
├── CartIcon + Badge (item count from cartStore)
├── WishlistIcon + Badge
├── AuthSection:
│   ├── If logged out: "Log In" + "Register" buttons
│   ├── If logged in: Avatar dropdown
│   │   ├── "My Account" → /account
│   │   ├── "My Orders" → /orders
│   │   ├── "My Bids" → /account/auction-dashboard
│   │   ├── "Payment Methods" → /account/payment-methods
│   │   ├── "Logout" → clear auth + redirect to /
│   │   └── If admin: "Admin Dashboard" → /admin
│   └── NotificationBell (if admin)
├── MobileMenu (hamburger → slide-out drawer)
└── CartDrawer (slide-out from right)
```

### Footer

```typescript
// components/website/Footer.tsx
├── Logo + Description
├── Quick Links: Products, Auctions, Contact
├── Account: Login, Register, My Orders
├── Legal: Terms of Service, Privacy Policy
├── Newsletter Signup → POST /newsletters/subscribe
├── Social Links (placeholder)
└── Copyright: "© 2026 Discount Deals. All rights reserved."
```

### Checkout Flow Summary

```
User clicks "Add to Cart" (on product or auction)
  → POST /carts { productId, type: 'cart' }
  → Cart badge updates

User clicks "Checkout" (in cart)
  → POST /orders/checkout
  → If no saved card:
      → POST /payments/setup-intents
      → Stripe.js CardElement confirms
      → POST /payments/default-payment-method
  → POST /orders/checkout
  → Redirect to Stripe Checkout URL
  → Stripe processes payment
  → Success: redirect to /checkout/success?session_id=X
  → Webhook: POST /orders/webhook processes payment, creates order, clears cart
  → /checkout/success shows order confirmation + pickup code + QR

User clicks "Schedule Pickup" (from success page or order history)
  → /pickup/schedule
  → Select invoices → pick slot → confirm
  → POST /pickups { slotId, invoiceIds }
```
