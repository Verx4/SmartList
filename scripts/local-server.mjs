import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, request as httpProxyRequest } from "node:http";
import { request as httpsProxyRequest } from "node:https";
import { extname, resolve, sep } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const clientRoot = resolve(root, "dist", "client");
const internalPort = Number(process.env.VINEXT_INTERNAL_PORT ?? 3001);
const publicPort = Number(process.env.PORT ?? 3000);
const backendPort = Number(process.env.BACKEND_PORT ?? 8000);
const backendUrl = new URL(
  process.env.BACKEND_URL ?? `http://127.0.0.1:${backendPort}`,
);
const backendProxyRequest =
  backendUrl.protocol === "https:" ? httpsProxyRequest : httpProxyRequest;
const vinextBin = resolve(root, "node_modules", "vinext", "dist", "cli.js");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

const app = spawn(
  process.execPath,
  [vinextBin, "start", "--port", String(internalPort), "--hostname", "127.0.0.1"],
  { cwd: root, env: process.env, stdio: "inherit" },
);

function staticPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  const candidate = resolve(clientRoot, `.${decoded}`);
  if (candidate !== clientRoot && !candidate.startsWith(`${clientRoot}${sep}`)) {
    return null;
  }
  return candidate;
}

const server = createServer((request, response) => {
  const requestPath = request.url ?? "/";
  const isApiRequest = requestPath.startsWith("/api/");
  if (isApiRequest) {
    const proxy = backendProxyRequest(
      {
        hostname: backendUrl.hostname,
        port: backendUrl.port || undefined,
        path: `${backendUrl.pathname.replace(/\/$/, "")}${requestPath}`,
        method: request.method,
        headers: { ...request.headers, host: backendUrl.host },
      },
      (upstream) => {
        response.writeHead(upstream.statusCode ?? 502, upstream.headers);
        upstream.pipe(response);
      },
    );
    proxy.on("error", () => {
      if (!response.headersSent) {
        response.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      }
      response.end(JSON.stringify({ detail: "O servidor de geração está iniciando." }));
    });
    request.pipe(proxy);
    return;
  }

  const candidate = staticPath(request.url ?? "/");
  if (
    candidate &&
    candidate !== clientRoot &&
    existsSync(candidate) &&
    statSync(candidate).isFile()
  ) {
    const type =
      contentTypes[extname(candidate).toLowerCase()] ?? "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": request.url?.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600",
    });
    createReadStream(candidate).pipe(response);
    return;
  }

  const proxy = httpProxyRequest(
    {
      hostname: "127.0.0.1",
      port: internalPort,
      path: request.url,
      method: request.method,
      headers: request.headers,
    },
    (upstream) => {
      response.writeHead(upstream.statusCode ?? 502, upstream.headers);
      upstream.pipe(response);
    },
  );
  proxy.on("error", () => {
    if (!response.headersSent) {
      response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    }
    response.end("A interface está iniciando. Atualize a página em alguns segundos.");
  });
  request.pipe(proxy);
});

server.listen(publicPort, "0.0.0.0", () => {
  console.log(`Engenharia Slides disponível em http://127.0.0.1:${publicPort}`);
});

function shutdown() {
  server.close();
  app.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
app.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`O servidor da aplicação encerrou com código ${code}.`);
  }
});
