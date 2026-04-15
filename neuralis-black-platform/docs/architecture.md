# Architecture Overview

## System Architecture

The Neuralis Black GEO Intelligence Platform is a monorepo consisting of:

### Applications
- **Web** (`apps/web`) - Next.js frontend with App Router and Tailwind CSS
- **API** (`apps/api`) - Express.js REST API server
- **Worker** (`apps/worker`) - BullMQ background job processor

### Packages
- **Database** (`packages/database`) - Prisma ORM with PostgreSQL
- **GEO Engine** (`packages/geo-engine`) - Core audit logic
- **LLM Clients** (`packages/llm-clients`) - OpenAI and Google AI integrations
- **UI** (`packages/ui`) - Shared React components

### Infrastructure
- **PostgreSQL** - Primary data store
- **Redis** - Job queue (BullMQ) and caching
- **Docker** - Containerization for all services
- **Kubernetes** - Orchestration (planned)
- **Terraform** - Infrastructure as Code (planned)

## Data Flow

1. User submits a query via the Web UI
2. API receives the request and enqueues a BullMQ job
3. Worker picks up the job and runs the GEO audit engine
4. GEO engine calls LLM providers for analysis
5. Results are stored in PostgreSQL
6. User polls/receives audit results via the API
