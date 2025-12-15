# RWA Asset Platform - How to Start All Services

## Prerequisites
- Node.js 20+ and npm 10+
- Docker and Docker Compose
- Git

## Quick Start (All Services)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Database & Redis (Docker)
```bash
docker-compose up -d postgres redis
```

This starts:
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Step 3: Run Database Migrations
```bash
cd apps/api && npx prisma migrate dev
```

### Step 4: Seed the Database (Optional - for demo data)
```bash
cd apps/api && npm run seed
```

### Step 5: Start the API Server
In a new terminal:
```bash
npm run dev:api
```
API will be available at: **http://localhost:4000**

### Step 6: Start the Web Application
In another new terminal:
```bash
npm run dev:web
```
Or directly:
```bash
cd apps/web && npm run dev
```
Web app will be available at: **http://localhost:3002**

---

## All Commands Summary

```bash
# Terminal 1 - Start infrastructure
docker-compose up -d postgres redis

# Terminal 2 - Start API (from project root)
npm run dev:api

# Terminal 3 - Start Web (from project root)
npm run dev:web
```

---

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Web App | http://localhost:3002 | Main frontend application |
| API Server | http://localhost:4000 | Backend REST API |
| API Health | http://localhost:4000/api/v1/health | API health check |
| Marketplace API | http://localhost:4000/api/v1/assets/marketplace | Public assets endpoint |
| Auctions API | http://localhost:4000/api/v1/auctions | Public auctions endpoint |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |

---

## Stop All Services

```bash
# Stop Docker containers
docker-compose down

# Stop API and Web (press Ctrl+C in their terminals)
```

---

## Troubleshooting

### Port Already in Use
If port 4000 or 3002 is already in use:
```bash
# Find process using port
lsof -i :4000
lsof -i :3002

# Kill process
kill -9 <PID>
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps

# Restart PostgreSQL
docker-compose restart postgres
```

### Redis Connection Issues
```bash
# Check if Redis is running
docker ps

# Restart Redis
docker-compose restart redis
```

### Reset Everything
```bash
# Stop all containers and remove volumes
docker-compose down -v

# Restart fresh
docker-compose up -d postgres redis
cd apps/api && npx prisma migrate dev
cd apps/api && npm run seed