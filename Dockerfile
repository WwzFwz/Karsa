# One container, because the product is one container (D2).
#
# Section 7 promises two installs that differ only in configuration: a teacher's
# laptop with no internet at all, and a cluster an institution runs itself. That
# promise only holds if there is one image and the difference is environment
# variables, so this file builds the whole thing -- client, room service and
# document sync -- into a single process listening on one port.
#
#   docker build -t karsa .
#   docker run -p 3000:3000 -e KARSA_SECRET=... -v karsa-data:/data karsa
#
# Speech models are deliberately NOT baked in. They are about 700 MB, most
# rooms never need the large one, and an image that carries them would be an
# image nobody pulls. Mount them instead (see docs/pemasangan.md).

# ---- build ------------------------------------------------------------------
# One stage builds both halves, because they are not independent: the server
# bundles the client's own core/ and store/ into its seed module (seed/entry.ts)
# so a room created by the server starts with exactly the rules the app uses.
# That bundling runs esbuild out of the root install, so the root dependencies
# have to be present when the server is built.
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies before source, so a change to a component does not re-run two
# installs.
COPY package.json package-lock.json ./
RUN npm ci
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

COPY . .

# The client, including the ONNX runtime copied out of node_modules (D81): a
# room can hold every model file locally and still hear nothing if the runtime
# that reads them comes from a CDN.
RUN npm run build

# The server, plus the seed bundle.
RUN cd server && npm run build && npm prune --omit=dev

# ---- run --------------------------------------------------------------------
FROM node:22-alpine
ENV NODE_ENV=production

# `resolve('../dist')` is how the server finds the client build, so the two
# have to keep this shape relative to each other.
WORKDIR /app/server
COPY --from=build /app/dist /app/dist
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/node_modules ./node_modules
COPY --from=build /app/server/package.json ./package.json

# The database is the one thing in here worth keeping, so it lives outside the
# image on a volume of its own rather than in the working directory.
ENV KARSA_DATA=/data/karsa.sqlite
RUN mkdir -p /data && chown -R node:node /data
VOLUME ["/data"]

# Where speech models go when an install serves its own (D81). Empty by
# default: `KARSA_MODELS` is only read when it is set.
#   -v /path/to/models:/models -e KARSA_MODELS=/models
#   and build the client with VITE_MODEL_URL=/models

EXPOSE 3000
USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/rooms').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# node:sqlite is still behind a flag on Node 22 (D76). It was chosen over a
# native module because a native module is the part of a Node install that most
# often fails to build on Windows and on slim images; one flag is the price.
CMD ["node", "--experimental-sqlite", "--no-warnings", "dist/main.js"]
