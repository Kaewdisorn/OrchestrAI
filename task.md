# Phase 0 — Repository Baseline: Task Breakdown

**Priority:** P0**Goal:** Create a predictable production workspace before feature code.**Acceptance criteria:**

- `pnpm install` succeeds.
- `pnpm build` can run against an empty app.
- Redis starts from Kubernetes manifests (`k8s/dev/`) and is accessible via port-forward.
- PostgreSQL uses an existing instance with dedicated schemas (`orchestrai_dev`, `orchestrai_test`).
- Test schema is isolated from the development schema.

---

## Task 0.1 — Root `package.json`

**File:** `package.json`

```json
{
  "name": "orchestrai",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "format": "turbo run format",
    "test": "turbo run test",
    "test:int": "turbo run test:int",
    "test:e2e": "turbo run test:e2e",
    "prisma:migrate": "turbo run prisma:migrate --filter=api",
    "prisma:generate": "turbo run prisma:generate --filter=api"
  },
  "devDependencies": {
    "turbo": "^2.3.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

---

## Task 0.2 — `pnpm-workspace.yaml`

**File:** `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
```

---

## Task 0.3 — `turbo.json`

**File:** `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "format": {
      "outputs": []
    },
    "test": {
      "outputs": ["coverage/**"],
      "cache": false
    },
    "test:int": {
      "outputs": [],
      "cache": false
    },
    "test:e2e": {
      "outputs": [],
      "cache": false
    },
    "prisma:migrate": {
      "cache": false
    },
    "prisma:generate": {
      "cache": false,
      "outputs": ["node_modules/.prisma/**"]
    }
  }
}
```

---

## Task 0.4 — `.env.example`

**File:** `.env.example`

```dotenv
# App
NODE_ENV=development
PORT=3000

# API authentication
API_KEY=change-me-before-deploy

# PostgreSQL (development) — uses existing instance, dedicated schema
DATABASE_URL=postgresql://orchestrai:orchestrai@localhost:5432/<your_db>?schema=orchestrai_dev

# PostgreSQL (test — isolated schema on same instance)
TEST_DATABASE_URL=postgresql://orchestrai:orchestrai@localhost:5432/<your_db>?schema=orchestrai_test

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4096
OPENAI_TIMEOUT_MS=30000
OPENAI_RETRY_ATTEMPTS=3

# Agent loop
AGENT_LOOP_MAX_ITERATIONS=5
AGENT_REQUEST_TIMEOUT_MS=60000

# Vector
VECTOR_DIMENSIONS=1536

# Logging
LOG_LEVEL=info
LOG_PROMPTS=false
```

---

## Task 0.5 — `.gitignore`

**File:** `.gitignore`

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
.turbo/

# Prisma
apps/api/prisma/migrations/*.sql.bak

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Test
coverage/
.nyc_output/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/settings.json
.idea/

```

---

## Task 0.6 — Dev infrastructure (Redis k8s + PostgreSQL)

### PostgreSQL — choose one option

#### Option A — You already have PostgreSQL

Run as a superuser (`psql -U postgres`) against your existing server:

```sql
CREATE ROLE orchestrai WITH LOGIN PASSWORD 'orchestrai';
CREATE SCHEMA orchestrai_dev;
CREATE SCHEMA orchestrai_test;
GRANT ALL ON SCHEMA orchestrai_dev TO orchestrai;
GRANT ALL ON SCHEMA orchestrai_test TO orchestrai;
-- Enable pgvector once per database
CREATE EXTENSION IF NOT EXISTS vector;
```

Update `.env` with your actual database name:

```dotenv
DATABASE_URL=postgresql://orchestrai:orchestrai@localhost:5432/<your_db>?schema=orchestrai_dev
TEST_DATABASE_URL=postgresql://orchestrai:orchestrai@localhost:5432/<your_db>?schema=orchestrai_test
```

#### Option B — No PostgreSQL (spin up via k8s)

**Directory:** `k8s/postgres/`

**`k8s/postgres/namespace.yaml`**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: orchestrai-postgres
```

**`k8s/postgres/secret.yaml`**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: orchestrai-postgres
type: Opaque
stringData:
  POSTGRES_USER: orchestrai
  POSTGRES_PASSWORD: orchestrai
  POSTGRES_DB: orchestrai_dev
```

**`k8s/postgres/pvc.yaml`**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: orchestrai-postgres
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 2Gi
```

**`k8s/postgres/postgres-statefulset.yaml`**

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: orchestrai-postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: pgvector/pgvector:pg16
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: POSTGRES_USER
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: POSTGRES_PASSWORD
            - name: POSTGRES_DB
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: POSTGRES_DB
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
          readinessProbe:
            exec:
              command:
                ["pg_isready", "-U", "orchestrai", "-d", "orchestrai_dev"]
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 5
      volumes:
        - name: postgres-storage
          persistentVolumeClaim:
            claimName: postgres-pvc
```

**`k8s/postgres/service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: orchestrai-postgres
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
  type: ClusterIP
```

Apply and port-forward:

```bash
kubectl apply -f k8s/postgres/
kubectl port-forward -n orchestrai-postgres svc/postgres 5432:5432 &
```

After first start, enable pgvector and create the test schema:

```bash
kubectl exec -n orchestrai-postgres deploy/postgres -- \
  psql -U orchestrai -d orchestrai_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"

kubectl exec -n orchestrai-postgres deploy/postgres -- \
  psql -U orchestrai -d orchestrai_dev -c "CREATE SCHEMA IF NOT EXISTS orchestrai_test; GRANT ALL ON SCHEMA orchestrai_test TO orchestrai;"
```

Update `.env`:

```dotenv
DATABASE_URL=postgresql://orchestrai:orchestrai@localhost:5432/orchestrai_dev?schema=orchestrai_dev
TEST_DATABASE_URL=postgresql://orchestrai:orchestrai@localhost:5432/orchestrai_dev?schema=orchestrai_test
```

### Redis — `k8s/dev/` (namespace + Redis only)

**Directory:** `k8s/dev/`

**`k8s/dev/namespace.yaml`**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: orchestrai-dev
```

**`k8s/dev/redis-pvc.yaml`**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: orchestrai-dev
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 512Mi
```

**`k8s/dev/redis-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: orchestrai-dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: redisdata
              mountPath: /data
          readinessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: redisdata
          persistentVolumeClaim:
            claimName: redis-pvc
```

**`k8s/dev/redis-service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: orchestrai-dev
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

---

## Task 0.7 — Test infrastructure (Redis k8s + PostgreSQL schema)

PostgreSQL test isolation is handled by the `orchestrai_test` schema created in Task 0.6. No separate pod needed — Prisma scopes all queries to that schema via `TEST_DATABASE_URL`.

### Redis test — `k8s/test/` (namespace + Redis only)

**Directory:** `k8s/test/`

`emptyDir: { medium: Memory }` keeps the Redis test pod fully ephemeral — wiped on pod deletion.

**`k8s/test/namespace.yaml`**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: orchestrai-test
```

**`k8s/test/redis-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-test
  namespace: orchestrai-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-test
  template:
    metadata:
      labels:
        app: redis-test
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: redisdata
              mountPath: /data
          readinessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: redisdata
          emptyDir:
            medium: Memory
```

**`k8s/test/redis-service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-test
  namespace: orchestrai-test
spec:
  selector:
    app: redis-test
  ports:
    - port: 6379
      targetPort: 6379
```

---

## Task 0.8 — `apps/api/package.json`

**File:** `apps/api/package.json`

```json
{
  "name": "api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "lint": "eslint \"{src,test}/**/*.ts\" --fix",
    "format": "prettier --write \"{src,test}/**/*.ts\"",
    "test": "jest --config jest.config.ts --testPathPattern=\"\\.spec\\.ts$\"",
    "test:int": "jest --config jest.config.ts --testPathPattern=\"\\.int-spec\\.ts$\" --runInBand",
    "test:e2e": "jest --config jest.config.ts --testPathPattern=\"\\.e2e-spec\\.ts$\" --runInBand",
    "prisma:migrate": "prisma migrate dev",
    "prisma:generate": "prisma generate"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/cqrs": "^10.2.7",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/config": "^3.3.0",
    "@nestjs/event-emitter": "^2.1.1",
    "@nestjs/terminus": "^10.2.3",
    "@nestjs/throttler": "^6.3.0",
    "@prisma/client": "^5.22.0",
    "bullmq": "^5.34.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "ioredis": "^5.4.2",
    "openai": "^4.77.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "uuid": "^11.0.3",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.9",
    "@nestjs/schematics": "^10.2.3",
    "@nestjs/testing": "^10.4.0",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.14",
    "@types/node": "^22.10.0",
    "@types/uuid": "^10.0.0",
    "@typescript-eslint/eslint-plugin": "^8.19.0",
    "@typescript-eslint/parser": "^8.19.0",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^9.1.0",
    "jest": "^29.7.0",
    "prettier": "^3.4.2",
    "prisma": "^5.22.0",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "typescript": "^5.7.2"
  }
}
```

---

## Task 0.9 — `apps/api/tsconfig.json` (strict TypeScript)

**File:** `apps/api/tsconfig.json`

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,

    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,

    "paths": {
      "@domain/*": ["src/domain/*"],
      "@application/*": ["src/application/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@presentation/*": ["src/presentation/*"],
      "@core/*": ["src/core/*"]
    }
  },
  "include": ["src/**/*", "test/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Task 0.10 — `apps/api/tsconfig.build.json`

**File:** `apps/api/tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "exclude": [
    "node_modules",
    "test",
    "dist",
    "**/*.spec.ts",
    "**/*.int-spec.ts",
    "**/*.e2e-spec.ts"
  ]
}
```

---

## Task 0.11 — `apps/api/nest-cli.json`

**File:** `apps/api/nest-cli.json`

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "tsConfigPath": "tsconfig.build.json"
  }
}
```

---

## Task 0.12 — `apps/api/jest.config.ts`

**File:** `apps/api/jest.config.ts`

```typescript
import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.(spec|int-spec|e2e-spec)\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  collectCoverageFrom: [
    "src/domain/**/*.ts",
    "src/application/**/*.ts",
    "!src/**/*.module.ts",
    "!src/main.ts",
  ],
  coverageDirectory: "coverage",
  coverageThresholds: {
    "src/domain/**/*.ts": {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
    "src/application/**/*.ts": {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85,
    },
  },
  testEnvironment: "node",
  moduleNameMapper: {
    "^@domain/(.*)$": "<rootDir>/src/domain/$1",
    "^@application/(.*)$": "<rootDir>/src/application/$1",
    "^@infrastructure/(.*)$": "<rootDir>/src/infrastructure/$1",
    "^@presentation/(.*)$": "<rootDir>/src/presentation/$1",
    "^@core/(.*)$": "<rootDir>/src/core/$1",
  },
  projects: [
    {
      displayName: "unit",
      testRegex: "\\.spec\\.ts$",
      rootDir: ".",
      transform: {
        "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.json" }],
      },
      moduleNameMapper: {
        "^@domain/(.*)$": "<rootDir>/src/domain/$1",
        "^@application/(.*)$": "<rootDir>/src/application/$1",
        "^@infrastructure/(.*)$": "<rootDir>/src/infrastructure/$1",
        "^@presentation/(.*)$": "<rootDir>/src/presentation/$1",
        "^@core/(.*)$": "<rootDir>/src/core/$1",
      },
    },
    {
      displayName: "integration",
      testRegex: "\\.int-spec\\.ts$",
      rootDir: ".",
      transform: {
        "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.json" }],
      },
      moduleNameMapper: {
        "^@domain/(.*)$": "<rootDir>/src/domain/$1",
        "^@application/(.*)$": "<rootDir>/src/application/$1",
        "^@infrastructure/(.*)$": "<rootDir>/src/infrastructure/$1",
        "^@presentation/(.*)$": "<rootDir>/src/presentation/$1",
        "^@core/(.*)$": "<rootDir>/src/core/$1",
      },
      globalSetup: "<rootDir>/test/setup-e2e.ts",
    },
    {
      displayName: "e2e",
      testRegex: "\\.e2e-spec\\.ts$",
      rootDir: ".",
      transform: {
        "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.json" }],
      },
      moduleNameMapper: {
        "^@domain/(.*)$": "<rootDir>/src/domain/$1",
        "^@application/(.*)$": "<rootDir>/src/application/$1",
        "^@infrastructure/(.*)$": "<rootDir>/src/infrastructure/$1",
        "^@presentation/(.*)$": "<rootDir>/src/presentation/$1",
        "^@core/(.*)$": "<rootDir>/src/core/$1",
      },
      globalSetup: "<rootDir>/test/setup-e2e.ts",
    },
  ],
};

export default config;
```

---

## Execution Order Summary

| #    | Task                 | File                                 | Why first                                                  |
| ---- | -------------------- | ------------------------------------ | ---------------------------------------------------------- |
| 0.1  | Root package.json    | `package.json`                       | pnpm needs this to resolve workspaces                      |
| 0.2  | Workspace definition | `pnpm-workspace.yaml`                | Tells pnpm which packages exist                            |
| 0.3  | Turborepo pipeline   | `turbo.json`                         | Script dependencies and caching                            |
| 0.4  | Environment template | `.env.example`                       | All variables documented before any code reads them        |
| 0.5  | Gitignore            | `.gitignore`                         | Prevents secrets and artifacts from being committed        |
| 0.6  | Dev infra            | `k8s/dev/` + `k8s/postgres/` (opt B) | Redis via k8s; PostgreSQL via schema (A) or k8s pod (B)    |
| 0.7  | Test infra           | `k8s/test/`                          | Redis via k8s; test isolation via `orchestrai_test` schema |
| 0.8  | API package.json     | `apps/api/package.json`              | Pins all production and dev dependencies                   |
| 0.9  | Strict tsconfig      | `apps/api/tsconfig.json`             | Enforces strict mode and path aliases for all later code   |
| 0.10 | Build tsconfig       | `apps/api/tsconfig.build.json`       | Excludes test files from production build                  |
| 0.11 | NestJS CLI config    | `apps/api/nest-cli.json`             | Links NestJS build to the correct tsconfig                 |
| 0.12 | Jest config          | `apps/api/jest.config.ts`            | Separates unit, integration, and e2e test runs             |

## Verification Checklist

- [ ] `pnpm install` completes with no errors from the repo root.
- [x] PostgreSQL running via `k8s/postgres/`; pod is `1/1 Running`; accessible via `kubectl port-forward -n orchestrai-postgres svc/postgres 5432:5432`.
- [ ] `kubectl apply -f k8s/dev/` starts Redis (port 6379) healthy; `kubectl port-forward -n orchestrai-dev svc/redis 6379:6379` exposes it on localhost.
- [ ] `kubectl apply -f k8s/test/` starts test Redis (port 6380) healthy; `kubectl port-forward -n orchestrai-test svc/redis-test 6380:6379` exposes it on localhost.
- [ ] `pnpm build` exits 0 against a minimal empty `src/main.ts`.
- [ ] `pnpm test` runs the unit project and exits without crashing the runner.
- [ ] `pnpm lint` exits 0 on an empty `src/` directory.
- [ ] TypeScript path aliases (`@domain/`, `@application/`, `@infrastructure/`, `@presentation/`, `@core/`) resolve in both src and test files.
- [ ] `.env` is not tracked by git; `.env.example` is committed.

---

## Progress

| #    | Task                 | File(s)                        | Status  |
| ---- | -------------------- | ------------------------------ | ------- |
| 0.1  | Root `package.json`  | `package.json`                 | ✅ Done |
| 0.2  | Workspace definition | `pnpm-workspace.yaml`          | ✅ Done |
| 0.3  | Turborepo pipeline   | `turbo.json`                   | ✅ Done |
| 0.4  | Environment template | `.env.example`                 | ✅ Done |
| 0.5  | Gitignore            | `.gitignore`                   | ✅ Done |
| 0.6  | Dev infra            | `k8s/dev/` + PG schema SQL     | 🔶 In Progress (PostgreSQL k8s ✅, Redis k8s/dev/ ⬜) |
| 0.7  | Test infra           | `k8s/test/`                    | ⬜ Todo |
| 0.8  | API `package.json`   | `apps/api/package.json`        | ⬜ Todo |
| 0.9  | Strict tsconfig      | `apps/api/tsconfig.json`       | ⬜ Todo |
| 0.10 | Build tsconfig       | `apps/api/tsconfig.build.json` | ⬜ Todo |
| 0.11 | NestJS CLI config    | `apps/api/nest-cli.json`       | ⬜ Todo |
| 0.12 | Jest config          | `apps/api/jest.config.ts`      | ⬜ Todo |
