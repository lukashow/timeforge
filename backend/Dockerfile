FROM oven/bun:1

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

# Create virtual environment and install dependencies
# Create virtual environment and install dependencies
# matches path expected by runner.ts: path.join(path.dirname(SOLVER_PATH), '.venv', 'bin', 'python')
# We create it in /venv and symlink to avoid issues with COPY overwriting or path permissions
RUN python3 -m venv /venv && \
    /venv/bin/pip install ortools && \
    mkdir -p src/or-tools && \
    ln -s /venv src/or-tools/.venv

# Build the application
RUN bun run build

ENV PORT=3001
EXPOSE 3001

CMD ["bun", "run", "start"]
