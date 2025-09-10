import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import net from "net";

// Ensure TypeScript knows about our global marker
declare global {
  // eslint-disable-next-line no-var
  var __APP_SERVER_STARTED__: boolean | undefined;
}


const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  if (globalThis.__APP_SERVER_STARTED__) {
    log("Server already started - skipping duplicate initialization (HMR)\n", "startup");
    return;
  }
  const server = await registerRoutes(app);

  // Utility: find the first available port starting from preferredPort
  async function findAvailablePort(preferredPort: number, maxAttempts = 10): Promise<number> {
    let port = preferredPort;
    for (let i = 0; i < maxAttempts; i++) {
      const isFree = await new Promise<boolean>((resolve) => {
        const tester = net.createServer()
          .once("error", () => {
            resolve(false);
          })
          .once("listening", () => {
            tester.close(() => resolve(true));
          })
          .listen(port, "0.0.0.0");
      });
      if (isFree) return port;
      port += 1; // try next port
    }
    throw new Error(`No available port found starting at ${preferredPort}`);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const preferred = parseInt(process.env.PORT || '5000', 10);
  const port = await findAvailablePort(preferred);

  server.listen(port, () => {
    if (port !== preferred) {
      log(`Preferred port ${preferred} in use. Server started on fallback port ${port}`);
    } else {
      log(`serving on port ${port}`);
    }
    globalThis.__APP_SERVER_STARTED__ = true;
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      log(`Port ${preferred} is already in use. If this is unexpected, terminate the other process using it.`);
    } else {
      log(`Server error: ${err.message}`);
    }
  });
})();
