FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    python3 \
    procps \
    coreutils \
    time \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -u 1000 -m runner

WORKDIR /app