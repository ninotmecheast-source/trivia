import React, { useState, useEffect } from "react";

function Stocktrading() {
  const [symbol, setSymbol] = useState("AAPL");
  const [quote, setQuote] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>({});
  const [balance, setBalance] = useState(0);
  const [shares, setShares] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/portfolio`)
      .then((res) => res.json())
      .then((data) => {
        setPortfolio(data.portfolio);
        setBalance(data.balance);
      })
      .catch(() => setError("Failed to load portfolio"));
  }, []);

  const getQuote = async () => {
    try {
      const res = await fetch(`/api/quote/${symbol}`);
      const data = await res.json();

      if (!data || !data.price) {
        setError("Invalid ticker symbol or no data available.");
        setQuote(null);
      } else {
        setQuote(data);
        setError(null);
      }
    } catch {
      setError("Failed to fetch stock quote.");
    }
  };

  const trade = async (type: "buy" | "sell") => {
    if (!quote) return;
    try {
      const res = await fetch(`/api/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          shares,
          price: quote.price,
        }),
      });
      const data = await res.json();
      setPortfolio(data.portfolio);
      setBalance(data.balance);
    } catch {
      setError("Trade failed.");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "700px", margin: "auto" }}>
      <h1>📈 Stock Trading Simulator</h1>
      <p>💵 Balance: ${balance.toFixed(2)}</p>

      <div>
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        />
        <button onClick={getQuote}>Get Quote</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {quote && (
        <div>
          <h2>
            {quote.symbol}: $
            {quote.price !== undefined ? quote.price.toFixed(2) : "N/A"} (
            {quote.change !== undefined ? quote.change.toFixed(2) : "N/A"}%)
          </h2>
          <input
            type="number"
            value={shares}
            min={1}
            onChange={(e) => setShares(Number(e.target.value))}
          />
          <button onClick={() => trade("buy")}>Buy</button>
          <button onClick={() => trade("sell")}>Sell</button>
        </div>
      )}

      <h2>📊 Portfolio</h2>
      <ul>
        {Object.entries(portfolio).map(([sym, pos]: any) => (
          <li key={sym}>
            {sym}: {pos.shares} shares @ $
            {pos.avgPrice !== undefined ? pos.avgPrice.toFixed(2) : "N/A"}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Stocktrading;
