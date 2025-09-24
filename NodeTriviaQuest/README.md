# NodeTriviaQuest

NodeTriviaQuest is a full-stack TypeScript/React application that provides
an interactive trivia game, a simple stock trading simulator, and a
lightweight news feed system. It demonstrates a number of modern web
development practices, including strict runtime input validation with
Zod, modular Express routes, server-side caching for external APIs,
and a component-driven React UI built with Tailwind CSS and shadcn/ui
components.

## Features

### Trivia Game

- Choose from multiple trivia categories (general knowledge, science,
  history, sports, entertainment and music) and play endlessly. Questions
  are fetched from the [Open Trivia Database](https://opentdb.com/) via the
  server, decoded and cached. The client uses the unified API instead of
  calling the third‑party service directly.
- Tracks your score, correct answers and wrong answers. Results are
  persisted in a game session and can be updated as you play.
- Supports skipping questions and decodes special characters so that
  questions render correctly.

### Stock Trading Simulator

- Simulates buying and selling of stock shares using live quote data
  sourced from Yahoo Finance. A `StockService` class encapsulates
  balance and portfolio state and caches quotes for a short period
  (60 seconds) to reduce upstream requests.
- Input validation via Zod ensures that ticker symbols are well formed,
  share quantities are positive integers, and prices are positive
  numbers. Attempts to trade with insufficient funds or shares are
  rejected with descriptive errors.
- Returns current balance and portfolio in a single API call.

### News Feed (RSS)

- Simple endpoint to append news items to an RSS feed. Posts include a
  title, link, description, optional image, and publication date.
- Image uploads are restricted to JPEG, PNG and GIF files up to
  5 MB. Files are renamed on upload and stored under
  `client/public/uploads/`.
- A token‑based admin check protects the news publishing endpoint. Set
  `ADMIN_TOKEN` in your environment and include the same token in the
  `X-Admin-Token` header when posting. If the environment variable is
  unset the endpoint is open (useful in development).
- All strings are XML‑escaped to prevent malformed RSS output. If
  `rss.xml` does not exist it is created with a base structure.

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm or npm

### Installation

1. Clone the repository and change into its directory:

   ```bash
   git clone <repo-url>
   cd NodeTriviaQuest
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. (Optional) Create a `.env` file in the root with any environment
   variables you need:

   ```env
   # Comma‑separated list of allowed origins for CORS. Use * to allow all.
   ALLOWED_ORIGINS=http://localhost:5173

   # Token required to post to /api/rss/add. If set, clients must send
   # X-Admin-Token header with the same value.
   ADMIN_TOKEN=supersecret
   ```

### Running in Development

Start the server and the Vite dev server together with:

```bash
npm run dev
```

This will run the Express API on port 5000 and the React client on a
random port served through Vite middleware. You can navigate to
`http://localhost:5000` to open the application in your browser. API
requests from the client will be proxied to the same port.

### Building for Production

To create an optimized production build, run:

```bash
npm run build
```

This compiles the client with Vite and bundles the server into
`dist/index.js` using esbuild. Serve the application with

```bash
npm start
```

The production server serves static files from `server/public` and falls
back to `index.html` for client-side routing.

## API Overview

### Trivia Endpoints

| Method | Endpoint | Description |
|-------:|:---------|:-----------|
| GET | `/api/categories` | List all available trivia categories. |
| GET | `/api/categories/:categoryId/questions?limit=N` | Fetch `N` questions for a category. Questions are cached on the server. |
| POST | `/api/game-sessions` | Create a game session. Accepts categoryId, totalQuestions, score, correctAnswers, startTime and optionally endTime/questionResults. |
| GET | `/api/game-sessions/:id` | Retrieve a game session by ID. |
| PATCH | `/api/game-sessions/:id` | Update a game session (score, correctAnswers, endTime, questionResults). Validation ensures correctAnswers ≤ totalQuestions. |
| DELETE | `/api/game-sessions/:id` | Delete a game session. |

### Stock Endpoints

| Method | Endpoint | Description |
|-------:|:---------|:-----------|
| GET | `/api/quote/:symbol` | Get the latest quote for a ticker symbol. Uses a 60‑second cache. |
| POST | `/api/buy` | Buy shares. Requires JSON body `{ symbol, shares, price }`. Validates input and returns updated balance and portfolio. |
| POST | `/api/sell` | Sell shares. Same body as buy. Validates input and returns updated balance and portfolio. |
| GET | `/api/portfolio` | Get current balance and portfolio. |

### News Endpoint

| Method | Endpoint | Description |
|-------:|:---------|:-----------|
| POST | `/api/rss/add` | Add a news item to the RSS feed. Requires `title` and `description` fields; optional `link` and an image upload (field name `image`). If `ADMIN_TOKEN` is set, must provide `X-Admin-Token` header. |

## Security Considerations

This project includes several measures to harden the application:

- **CORS**: Only origins specified in `ALLOWED_ORIGINS` are allowed to access the API. Requests from other origins are blocked.
- **Input Validation**: All dynamic routes and JSON bodies are validated with Zod before use. Invalid inputs return descriptive 400 responses.
- **File Upload Filtering**: Only JPEG, PNG and GIF files up to 5 MB are accepted on the RSS endpoint. Unexpected file extensions are rejected.
- **Admin Authentication**: News publishing requires a secret token if `ADMIN_TOKEN` is defined. Without it, unauthorized clients cannot publish.
- **XML Escaping**: All user‑provided strings are escaped before being inserted into RSS to prevent malformed XML or injection.
- **Quote Caching**: Stock quotes are cached to limit calls to the Yahoo Finance API and mitigate potential denial of service.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
