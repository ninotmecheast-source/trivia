import fetch from "node-fetch";

/**
 * In-memory service to manage a simple stock trading simulation. This class
 * encapsulates balance and portfolio state, provides helper methods for
 * retrieving quotes (with a basic cache), and ensures state updates are
 * consistent across buy and sell operations. In the future this could be
 * refactored to persist data in a database or external cache.
 */
export class StockService {
  private balance: number;
  private portfolio: Record<string, { shares: number; avgPrice: number }>;
  // Cache quotes for a short period to reduce upstream API calls
  private quoteCache: Map<string, { timestamp: number; data: { symbol: string; price: number; change: number } }>;
  // Cache TTL in milliseconds (default 60 seconds)
  private readonly cacheTtl: number;

  constructor(initialBalance: number = 10000, cacheTtlMs: number = 60_000) {
    this.balance = initialBalance;
    this.portfolio = {};
    this.quoteCache = new Map();
    this.cacheTtl = cacheTtlMs;
  }

  /**
   * Fetch a stock quote for the given symbol. If a cached value exists and
   * hasn't expired, return it. Otherwise fetch from Yahoo Finance.
   */
  async getQuote(symbol: string): Promise<{ symbol: string; price: number; change: number }> {
    const key = symbol.toUpperCase();
    const now = Date.now();
    const cached = this.quoteCache.get(key);
    if (cached && now - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(key)}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch stock data");
    }
    const data: any = await response.json();
    const quote = data?.quoteResponse?.result?.[0];
    if (!quote) {
      throw new Error("Invalid quote response");
    }
    const result = {
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChangePercent,
    };
    this.quoteCache.set(key, { timestamp: now, data: result });
    return result;
  }

  /**
   * Buy shares of a stock. Throws an error if funds are insufficient or
   * arguments are invalid. Returns updated balance and portfolio on success.
   */
  buy(symbol: string, shares: number, price: number): { balance: number; portfolio: Record<string, { shares: number; avgPrice: number }> } {
    const key = symbol.toUpperCase();
    const cost = shares * price;
    if (cost > this.balance) {
      throw new Error("Not enough funds");
    }
    this.balance -= cost;
    if (!this.portfolio[key]) {
      this.portfolio[key] = { shares: 0, avgPrice: 0 };
    }
    const holding = this.portfolio[key];
    holding.avgPrice = (holding.avgPrice * holding.shares + cost) / (holding.shares + shares);
    holding.shares += shares;
    return { balance: this.balance, portfolio: this.getPortfolio() };
  }

  /**
   * Sell shares of a stock. Throws an error if there aren't enough shares. On
   * success returns updated balance and portfolio. If all shares are sold,
   * removes the position from the portfolio.
   */
  sell(symbol: string, shares: number, price: number): { balance: number; portfolio: Record<string, { shares: number; avgPrice: number }> } {
    const key = symbol.toUpperCase();
    const position = this.portfolio[key];
    if (!position || position.shares < shares) {
      throw new Error("Not enough shares");
    }
    const revenue = shares * price;
    this.balance += revenue;
    position.shares -= shares;
    if (position.shares === 0) {
      delete this.portfolio[key];
    }
    return { balance: this.balance, portfolio: this.getPortfolio() };
  }

  /**
   * Get the current portfolio and balance. Returns a shallow copy of the
   * portfolio to prevent external mutation.
   */
  getPortfolio(): Record<string, { shares: number; avgPrice: number }> {
    return Object.fromEntries(
      Object.entries(this.portfolio).map(([sym, position]) => [sym, { ...position }])
    );
  }

  getBalance(): number {
    return this.balance;
  }
}