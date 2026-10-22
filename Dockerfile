FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
ENV NODE_ENV=production \
    SULY_PUBLIC_ORIGIN=https://suly-ky79x.manus.space
RUN pnpm build && pnpm exec expo export --platform web --output-dir dist-web

EXPOSE 3000

CMD ["pnpm", "start"]
