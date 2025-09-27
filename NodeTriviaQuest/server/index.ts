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
import { db } from "./db";
import { rssPosts, type InsertRssPost } from "@shared/schema";
import { desc } from "drizzle-orm";

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
// uploads. Files are stored in memory to avoid filesystem dependency in production.
const upload = multer({
  storage: multer.memoryStorage(),
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
app.post("/api/rss/add", upload.single("image"), async (req: Request, res: Response) => {
  try {
    // Require ADMIN_TOKEN unconditionally for security. This endpoint must be protected
    // to prevent unauthorized posting. The ADMIN_TOKEN environment variable must be set.
    const configuredToken = process.env.ADMIN_TOKEN;
    if (!configuredToken) {
      return res.status(500).json({ error: "Server configuration error: ADMIN_TOKEN not set" });
    }
    
    const headerToken = req.headers["x-admin-token"];
    if (!headerToken || headerToken !== configuredToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { title, link, description } = req.body;
    const file = req.file;
    if (!title || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let imageUrl: string | undefined;
    let imageType: string | undefined;

    if (file) {
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExt = [".jpg", ".jpeg", ".png", ".gif"];
      if (!allowedExt.includes(ext)) {
        // No file cleanup needed with memory storage
        return res.status(400).json({ error: "Invalid file type" });
      }
      
      // Convert image buffer to base64 for database storage (production-safe)
      const base64Image = `data:image/${ext.replace(".", "")};base64,${file.buffer.toString('base64')}`;
      imageUrl = base64Image;
      imageType = `image/${ext.replace(".", "")}`;
      
      // No file cleanup needed with memory storage
    }

    // Create RSS post in database
    const newPost: InsertRssPost = {
      title,
      description,
      link: link || "https://triveast.com/news",
      imageUrl,
      imageType,
      pubDate: new Date()
    };

    await db.insert(rssPosts).values(newPost);
    res.json({ success: true, message: "Post added!" });
    
  } catch (error) {
    console.error("Error adding RSS post:", error);
    res.status(500).json({ error: "Failed to add post" });
  }
});

// Dynamic RSS XML endpoint - generates RSS feed from database
app.get("/rss.xml", async (req: Request, res: Response) => {
  try {
    // Helper to escape XML special characters
    const escapeXml = (str: string) =>
      String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;");

    // Fetch all RSS posts from database, ordered by publication date (newest first)
    const posts = await db.select().from(rssPosts).orderBy(desc(rssPosts.pubDate));

    // Generate RSS XML
    const lastBuildDate = posts.length > 0 ? posts[0].pubDate.toUTCString() : new Date().toUTCString();
    
    let rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Triveast News</title>
    <link>https://triveast.com/</link>
    <description>Latest updates and news from Triveast</description>
    <language>en-us</language>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>

`;

    // Add each post as RSS item
    for (const post of posts) {
      rssXml += `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(post.link || "https://triveast.com/news")}</link>
      <description>${escapeXml(post.description)}</description>`;
      
      if (post.imageUrl && post.imageType) {
        rssXml += `
      <enclosure url="${escapeXml(post.imageUrl)}" type="${escapeXml(post.imageType)}" />`;
      }
      
      rssXml += `
      <pubDate>${escapeXml(post.pubDate.toUTCString())}</pubDate>
    </item>

`;
    }

    rssXml += `</channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(rssXml);
    
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    res.status(500).json({ error: "Failed to generate RSS feed" });
  }
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
