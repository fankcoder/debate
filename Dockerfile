FROM docker.m.daocloud.io/library/node:22-alpine AS build

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM docker.m.daocloud.io/library/nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
