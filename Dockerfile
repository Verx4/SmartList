FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

RUN rm -rf ./*

COPY *.html ./
COPY admin ./admin
COPY assets ./assets
COPY css ./css
COPY js ./js
COPY manifest.webmanifest ./
COPY service-worker.js ./
COPY nginx.frontend.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:${PORT:-8080}/health || exit 1
