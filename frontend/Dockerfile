# Stage 1: Build static assets
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx + SSL
FROM nginx:alpine

RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/selfsigned.key \
    -out /etc/nginx/certs/selfsigned.crt \
    -subj "/C=US/ST=State/L=City/O=IronForgeAI/OU=IT/CN=30.31.32.136"

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
