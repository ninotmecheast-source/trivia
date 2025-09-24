import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, registerRSS } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";

import cors from "cors";
import { z } from "zod";
import { StockService } from "./stockService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const app = express();

// Configure CORS. Allow origins defined in the ALLOWED_ORIGINS environment
// variable (comma separated). If not specified or set to "*", all origins
// will be allowed. This tightens access to the API by default.
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
let allowedOrigins: string[] | undefined;
if (allowedOriginsEnv && allowedOriginsEnv !== "*") {
  allowedOrigins = allowedOriginsEnv
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (!allowedOrigins || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Multer setup
// Configure multer to restrict file size and file types for uploads. Only
// accept JPEG, PNG and GIF images to reduce the risk of arbitrary file
// uploads. Files are stored temporarily under the uploads directory and
// renamed after validation below.
const upload = multer({
  dest: path.resolve(__dirname, "../client/public/uploads"),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowedMime = ["image/jpeg", "image/png", "image/gif"];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = [".jpg", ".jpeg", ".png", ".gif"];
    if (allowedMime.includes(file.mimetype) && allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG and GIF images are allowed"));
    }
  },
});

// Instantiate a single StockService. In a production deployment this
// could be constructed with a per-user or per-session scope; for this
// simple demo we keep a single instance.
const stockService = new StockService(10000);

// ---------------- STOCK TRADER -----------------
// Schema for validating trade requests. Enforces positive integer shares and
// positive price, and restricts symbols to a reasonable set of alphanumeric
// characters. Additional restrictions can be added as needed.
const tradeSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .regex(/^[A-Za-z0-9.\-]+$/, { message: "Invalid ticker symbol" }),
  shares: z
    .preprocess((val) => {
      if (typeof val === "string") return Number(val);
      return val;
    }, z.number().int().positive({ message: "Shares must be a positive integer" })),
  price: z
    .preprocess((val) => {
      if (typeof val === "string") return Number(val);
      return val;
    }, z.number().positive({ message: "Price must be a positive number" })),
});

// Get a quote. Uses the StockService cache to reduce upstream API calls.
app.get("/api/quote/:symbol", async (req, res) => {
  const { symbol } = req.params;
  try {
    const quote = await stockService.getQuote(symbol);
    res.json(quote);
  } catch (err) {
    console.error("Error fetching quote:", err);
    res.status(500).json({ error: "Failed to fetch stock data" });
  }
});

// Buy shares endpoint. Validates input before delegating to the service.
app.post("/api/buy", (req, res) => {
  const parseResult = tradeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid trade data", details: parseResult.error.errors });
  }
  const { symbol, shares, price } = parseResult.data;
  try {
    const result = stockService.buy(symbol, shares, price);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Trade failed" });
  }
});

// Sell shares endpoint. Validates input and delegates to the service.
app.post("/api/sell", (req, res) => {
  const parseResult = tradeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid trade data", details: parseResult.error.errors });
  }
  const { symbol, shares, price } = parseResult.data;
  try {
    const result = stockService.sell(symbol, shares, price);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Trade failed" });
  }
});

// Retrieve current portfolio and balance
app.get("/api/portfolio", (req, res) => {
  res.json({ balance: stockService.getBalance(), portfolio: stockService.getPortfolio() });
});

// ---------------- RSS POSTS -----------------
app.post("/api/rss/add", upload.single("image"), (req: Request, res: Response) => {
  // Only allow this endpoint if an admin token matches. If ADMIN_TOKEN is set in
  // the environment, require callers to provide an identical token via the
  // X-Admin-Token header. Without a valid token, return 401 Unauthorized.
  const configuredToken = process.env.ADMIN_TOKEN;
  if (configuredToken) {
    const headerToken = req.headers["x-admin-token"];
    if (!headerToken || headerToken !== configuredToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const { title, link, description } = req.body;
  const file = req.file;
  if (!title || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Helper to escape XML special characters to prevent breaking the feed
  const escapeXml = (str: string) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const rssPath = path.resolve(__dirname, "../client/public/rss.xml");
  if (!fs.existsSync(rssPath)) {
    const baseRss = `<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0">
        <channel>
          <title>Triveast News</title>
          <link>https://triveast.com/news</link>
          <description>Latest updates and news from Triveast</description>
          <language>en-us</language>
          <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        </channel>
      </rss>`;
    fs.writeFileSync(rssPath, baseRss, "utf8");
  }
  let xml = fs.readFileSync(rssPath, "utf8");

  let imageTag = "";
  if (file) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = [".jpg", ".jpeg", ".png", ".gif"];
    if (!allowedExt.includes(ext)) {
      // remove uploaded temp file if extension is invalid
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: "Invalid file type" });
    }
    // rename file to include extension
    const newFileName = `${file.filename}${ext}`;
    const uploadDir = path.resolve(__dirname, "../client/public/uploads");
    const newPath = path.join(uploadDir, newFileName);
    fs.renameSync(file.path, newPath);
    imageTag = `<enclosure url="/uploads/${newFileName}" type="image/${ext.replace(".", "")}" />`;
  }
  const newItem = `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link || "https://triveast.com/news")}</link>
      <description>${escapeXml(description)}</description>
      ${imageTag}
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  `;
  xml = xml.replace("</channel>", `${newItem}\n</channel>`);
  fs.writeFileSync(rssPath, xml, "utf8");
  res.json({ success: true, message: "Post added!" });
});

// ---------------- LOGGING -----------------
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;
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
      if (logLine.length > 120) logLine = logLine.slice(0, 119) + "…";
      log(logLine);
    }
  });
  next();
});

// ---------------- BOOTSTRAP -----------------
(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
    registerRSS(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
