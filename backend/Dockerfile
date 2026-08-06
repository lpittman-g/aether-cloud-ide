FROM node:22-bookworm

# Docker CLI so the API can spawn sibling containers when the socket is mounted
RUN apt-get update \
  && apt-get install -y --no-install-recommends docker.io python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "run", "start"]
