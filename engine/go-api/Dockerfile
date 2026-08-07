# syntax=docker/dockerfile:1
FROM rust:1.83-bookworm AS sandbox
WORKDIR /src
COPY engine/sandbox-rust /src
RUN cargo build --release

FROM golang:1.22-bookworm AS gobuild
WORKDIR /src
COPY engine/go-api /src
RUN go mod tidy && CGO_ENABLED=0 go build -o /aether-api .

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=sandbox /src/target/release/aether-sandbox /usr/local/bin/aether-sandbox
COPY --from=gobuild /aether-api /usr/local/bin/aether-api
ENV PORT=4000 \
    AETHER_SANDBOX=/usr/local/bin/aether-sandbox \
    WORKSPACE_ROOT=/workspace
WORKDIR /app
EXPOSE 4000
CMD ["/usr/local/bin/aether-api"]
