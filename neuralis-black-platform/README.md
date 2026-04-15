# Neuralis Black — GEO Intelligence Platform

AI-powered Generative Engine Optimization (GEO) audit platform that helps optimize content for visibility in AI-generated search results.

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Express.js, Node.js 20
- **Database**: PostgreSQL 16 with Prisma ORM
- **Queue**: Redis + BullMQ
- **AI**: OpenAI GPT-4o, Google Gemini 1.5 Pro
- **Build**: TurboRepo, npm workspaces
- **Deploy**: Docker, Kubernetes, Terraform

## Project Structure

```
neuralis-black-platform/
├── apps/
│   ├── web/                    # Next.js Frontend
│   ├── api/                    # Node.js Backend API
│   └── worker/                 # BullMQ Audit Workers
├── packages/
│   ├── database/               # Prisma ORM & migrations
│   ├── geo-engine/             # Core GEO audit logic
│   ├── llm-clients/           # LLM API integrations
│   └── ui/                     # Shared React components
├── infra/
│   ├── docker/                 # Dockerfiles
│   ├── kubernetes/             # K8s manifests
│   └── terraform/              # IaC definitions
├── scripts/
│   └── setup/                  # Setup scripts
└── docs/                       # Documentation
```

## Quick Start

### Prerequisites

- Node.js >= 18
- Docker & Docker Compose
- npm

### Setup

```bash
cd neuralis-black-platform

# Run setup script
./scripts/setup/setup.sh

# Or manually:
cp .env.example .env
npm install
npm run db:generate
```

### Development

```bash
# Start PostgreSQL and Redis
docker-compose up postgres redis -d

# Run database migrations
npm run db:migrate

# Start all services in development mode
npm run dev
```

### Docker Compose (Full Stack)

```bash
docker-compose up
```

This starts all services:
- **Web**: http://localhost:3000
- **API**: http://localhost:4000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## Environment Variables

See `.env.example` for all required environment variables.

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://neuralis:neuralis_dev@localhost:5432/neuralis_black` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `PORT` | API server port | `4000` |
| `JWT_SECRET` | JWT signing secret | — |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `GOOGLE_AI_API_KEY` | Google AI API key | — |
| `NEXT_PUBLIC_API_URL` | API URL for frontend | `http://localhost:4000` |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/audits` | Start a new GEO audit |
| `GET` | `/api/audits/:id` | Get audit details |
| `GET` | `/api/audits` | List all audits |
| `GET` | `/api/users/me` | Get current user |
| `GET` | `/api/subscriptions` | Get subscriptions |

## License

MIT
