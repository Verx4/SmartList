FROM node:22-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PRIVATE_STORAGE_PATH=/app/backend/private_storage \
    BACKEND_PORT=8000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY backend/requirements.txt /tmp/backend-requirements.txt
RUN python3 -m pip install --break-system-packages --no-cache-dir -r /tmp/backend-requirements.txt

COPY . .
RUN pnpm build && mkdir -p /app/backend/private_storage

EXPOSE 10000

CMD ["sh", "-c", "cd /app/backend && alembic upgrade head && python3 -m app.seed && uvicorn app.main:app --host 127.0.0.1 --port 8000 & cd /app && pnpm start:local"]
