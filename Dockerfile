FROM denoland/deno:latest

WORKDIR /app

# Cache dependencies in a separate layer
COPY deno.json deno.lock ./
RUN deno install --allow-import

# Copy source code
COPY source/ source/

# Data directory for KV and dumps
ENV HOME=/data
RUN mkdir -p /data/.smith/dumps

CMD ["deno", "run", "--env", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "--allow-run", "--allow-import", "--unstable-kv", "./source/main.ts"]
