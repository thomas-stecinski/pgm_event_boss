# PGM Event Boss

Application temps reel avec React, Express et Socket.IO.

## Prerequis

- Node.js
- Docker

## Installation

### 1. Redis

```bash
cd backend
docker compose up -d
```

### 2. Backend

```bash
cd backend
npm install
```

Variables d'environnement (`backend/.env`) :

```
PORT=3001
CORS_ORIGIN=http://localhost:5173
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev_secret_change_me
```

### 3. Frontend

```bash
cd frontend
npm install
```

Variables d'environnement (`frontend/.env`) :

```
VITE_BACKEND_URL=http://localhost:3001
```

## Lancement

```bash
# Backend
cd backend
npm run dev

# Frontend (dans un autre terminal)
cd frontend
npm run dev
```

Le frontend est accessible sur `http://localhost:5173` et le backend sur `http://localhost:3001`.
