---
name: vercel-deployment
description: "Expert knowledge for deploying to Vercel. Use when: vercel, deploy, deployment, hosting, production."
source: vibeship-spawner-skills (Apache 2.0)
---

# Vercel Deployment

Vercel deployment expert for deploying Angular and Node.js applications.

## Core Principles

1. Environment variables - different for dev/preview/production
2. Edge vs Serverless - choose the right runtime
3. Build optimization - minimize cold starts and bundle size
4. Preview deployments - use for testing before production
5. Monitoring - set up analytics and error tracking

---

## Distillai Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Angular Frontend (SSG/SSR)              │   │
│  │              https://distillai.app                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Railway                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Node.js Backend API                     │   │
│  │              https://api.distillai.app                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Supabase                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────────┐   │
│  │ PostgreSQL │  │  Storage  │  │    Authentication     │   │
│  └───────────┘  └───────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

### Frontend (Vercel)

```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_API_URL=https://api.distillai.app
```

### Backend (Railway)

```bash
# Environment Variables
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...
GEMINI_API_KEY=AIxxx...
FRONTEND_URL=https://distillai.app
```

### Security Rules

| Variable | Prefix | Exposed To |
|----------|--------|------------|
| Public keys | `NEXT_PUBLIC_` | Browser (OK) |
| API keys | No prefix | Server only |
| Service keys | No prefix | Server only |

> **NEVER** put `SUPABASE_SERVICE_KEY` or `GEMINI_API_KEY` in `NEXT_PUBLIC_`

---

## Vercel Configuration

### vercel.json for Angular

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "ng build --configuration production",
  "outputDirectory": "dist/distillai/browser",
  "framework": null,
  "routes": [
    {
      "src": "/assets/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)\\.(.*)$",
      "dest": "/$1.$2"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## Railway Configuration

### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Dockerfile (Alternative)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/app.js"]
```

---

## Build Optimization

### Angular Build

```json
// angular.json
{
  "projects": {
    "distillai": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kb",
                  "maximumError": "1mb"
                }
              ],
              "outputHashing": "all",
              "optimization": true,
              "sourceMap": false
            }
          }
        }
      }
    }
  }
}
```

### Node.js Build

```json
// package.json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/app.js",
    "start:prod": "NODE_ENV=production node dist/app.js"
  }
}
```

---

## CORS Configuration

### Backend CORS

```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://distillai.app', 'https://www.distillai.app']
    : ['http://localhost:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
```

---

## Preview Deployments

### Vercel Preview

- Automatic on every PR
- Unique URL: `distillai-xxx-team.vercel.app`
- Use for testing before merge

### Environment Strategy

| Environment | URL | Database |
|-------------|-----|----------|
| Production | distillai.app | Production DB |
| Preview | *.vercel.app | Staging DB |
| Development | localhost:4200 | Local/Dev DB |

---

## Sharp Edges

| Issue | Severity | Solution |
|-------|----------|----------|
| NEXT_PUBLIC_ exposes secrets | Critical | Only use for truly public values |
| Preview using production DB | High | Set up separate staging DB |
| Function too large | High | Split into smaller functions |
| CORS errors | Medium | Configure backend CORS properly |
| Stale cache | Medium | Use proper cache headers |

---

## Deployment Checklist

### Pre-Deploy

- [ ] All environment variables set
- [ ] Production build works locally
- [ ] API endpoints configured correctly
- [ ] CORS origins updated
- [ ] No secrets in client code

### Post-Deploy

- [ ] Health check passes
- [ ] Authentication works
- [ ] API calls succeed
- [ ] File uploads work
- [ ] Error tracking active
