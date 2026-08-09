# Discount Deals DMV Backend API

Enterprise High-Concurrency Live Auction & E-Commerce Backend Service built with Node.js, Express, TypeScript, MongoDB Atlas, Redis, Socket.IO, BullMQ, and Grafana Loki Monitoring Stack.

Designed and engineered to easily sustain **10,000+ concurrent active bidders and catalog viewers**.

---

## 🚀 High-Concurrency Architecture (10,000+ Active Users)

```mermaid
graph TD
    Client["10,000+ Concurrent Clients"] --> Nginx["Nginx SSL Proxy"]
    Nginx --> PM2Cluster["PM2 Cluster Mode (Multi-Core CPUs, 2048MB Cap)"]
    PM2Cluster --> RedisCache["Redis Cache Stampede Shield (Stale-While-Revalidate + Mutex)"]
    PM2Cluster --> SocketRedis["Socket.IO + Redis Adapter (Multi-Node WS Broadcast)"]
    PM2Cluster --> MongoPool["MongoDB Atlas (maxPoolSize=100)"]
    PM2Cluster --> RateLimiter["Rate Limiting (200 req/min API, 15 bids/10s)"]
    
    PM2Cluster --> Promtail["Promtail Log Shipper Agent"]
    Promtail --> Loki["Grafana Loki Log Engine (Port 3100)"]
    Loki --> Grafana["Grafana Web Dashboard (Port 3030)"]
```

### ⚡ Performance & Scalability Highlights
- **Cache Stampede (Thundering Herd) Protection:** Implemented `getOrFetchWithCache()` in `src/utils/redis.cache.ts`. Uses a **Single-Flight Mutex Lock** (`NX` flag) so only 1 worker queries MongoDB when a cache key expires. Remaining concurrent requests receive stale cache data instantly (**0ms DB latency hit**).
- **Stale-While-Revalidate (Soft Expiration):** Serves cached catalog queries in 1–3ms while an asynchronous background worker refreshes the cache.
- **Random TTL Jitter & Non-Blocking SCAN:** 0–20% random variance added to TTLs to prevent simultaneous key expiration. Replaced blocking `KEYS` command with non-blocking `scanStream` (`count: 100`).
- **Socket.IO Redis Adapter:** Integrates `@socket.io/redis-adapter` with `ioredis` so real-time WebSocket room updates (`auction:${auctionId}`) broadcast seamlessly across all PM2 cluster workers.
- **Database Connection Pool:** Expanded Mongoose pool to `maxPoolSize: 100` (`minPoolSize: 10`) to absorb high write concurrency during live auctions.
- **DDoS & Rate Limiting:** Global API limiter (200 req/min per IP) and Bidding limiter (15 bids / 10s per IP) shield the event loop from traffic floods.

---

## 📊 Monitoring & Logging Stack (Grafana + Loki + Promtail)

The system includes a native host-level observability pipeline for real-time error tracking, HTTP latency analytics, and log aggregation.

| Component | Service | Port | Description |
| :--- | :--- | :--- | :--- |
| **Grafana** | `grafana-server.service` | `3030` | Visual web dashboards & LogQL analytics UI |
| **Grafana Loki** | `loki.service` | `3100` | High-performance log aggregation engine |
| **Promtail** | `promtail.service` | `9080` | Log shipper scraping PM2 logs and Nginx access logs |

### 🛠️ Monitoring Access Instructions
1. Open Grafana Dashboard: `http://<server-ip>:3030`
2. Default Login: `admin` / `admin`
3. Data Source Configuration:
   - Type: **Loki**
   - URL: `http://127.0.0.1:3100`
4. Useful LogQL Queries:
   - **Tail Error Stack Traces:** `{job="discount-api", level="error"}`
   - **Stream Live Bids:** `{job="discount-api"} |= "bid"`
   - **Nginx 5xx Errors:** `{job="nginx"} |= " 50"`

---

## 🎯 Auction & Anti-Sniping Business Rules

- **Anti-Sniping Timer Extension:** If a bid is placed within the last 60 seconds before an auction ends (`endsAt - now <= 60s`), the auction timer extends automatically by **59 seconds**.
- **System Auto-Counter Bidding (Last 1 Hour):** Operates exclusively during the final hour of an auction (`endsAt - now <= 1 hour`). System counter-bids automatically up to the `reservePrice`.
- **System Bid Amount Cap:** System bids are capped at `Math.min(customerBid + bidIncrement, reservePrice)`.
- **Reserve Price Enforcement:** If an auction ends with the System User as the highest bidder, the item is marked as `unsold` (Reserve Not Met) and Stripe payment charges are bypassed.

---

## ⚙️ Tech Stack & Dependencies

- **Runtime:** Node.js (v18+) / Express 5 / TypeScript 5
- **Database:** MongoDB Atlas / Mongoose ORM
- **Cache & Pub/Sub:** Redis / ioredis
- **Real-Time WebSockets:** Socket.IO / `@socket.io/redis-adapter`
- **Background Queues:** BullMQ
- **Logging:** Pino / `pino-http`
- **Security:** Helmet / CORS / HPP / Compression / `express-rate-limit`

---

## 🛠️ Quick Start & Local Development

### 1. Environment Setup
Create a `.env` file in the root directory:
```env
NODE_ENV=development
PORT=5001
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/discountdealsdmv
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=sk_test_...
EMAIL_ADDRESS=dicountd@gmail.com
EMAIL_PASSWORD=your_app_password
```

### 2. Install Dependencies & Run
```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Build production TypeScript bundle
npm run build
```

---

## 🚀 Production Deployment & Process Management

### 1. Start PM2 Cluster
```bash
# Build TypeScript
npm run build

# Start or Reload PM2 in Cluster Mode across all CPU cores
pm2 reload ecosystem.config.js --update-env
```

### 2. Install Native Monitoring Stack on VPS
```bash
# Execute native installer script (RHEL/AlmaLinux/Ubuntu)
bash monitoring/native/install-monitoring.sh

# Verify systemd service status
systemctl status grafana-server loki promtail
```

---

## 📜 License

Private Repository - All Rights Reserved © Discount Deals DMV.
