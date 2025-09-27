# NodeTriviaQuest

## Overview

NodeTriviaQuest is a full-stack TypeScript application that combines an interactive trivia game with additional features including a stock trading simulator and news feed system. The application demonstrates modern web development practices with strict input validation, modular architecture, and a responsive React UI. It features a component-driven frontend built with shadcn/ui and Tailwind CSS, paired with an Express.js backend that integrates with external APIs and provides caching for optimal performance.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built as a Single Page Application (SPA) using React with TypeScript and Vite as the build tool. The UI follows Material Design principles with a system-based approach for a content-focused gaming experience. The component library is built on shadcn/ui components with Radix UI primitives, styled with Tailwind CSS using a custom design system that includes light/dark mode support.

Key architectural decisions:
- **Component Structure**: Modular component design with reusable UI components (CategorySelector, QuestionDisplay, GameResults, etc.)
- **State Management**: React hooks and TanStack Query for server state management
- **Styling**: Tailwind CSS with custom CSS variables for theming and consistent spacing units
- **Routing**: React Router for client-side navigation between trivia game, admin panel, news, and stock trading sections

### Backend Architecture
The server uses Express.js with TypeScript in ESM module format, organized around modular route handlers and service classes. The architecture emphasizes separation of concerns with dedicated services for different features.

Key architectural decisions:
- **Modular Routes**: Separate route handlers for trivia, stock trading, RSS feed, and admin functions
- **Service Layer**: Dedicated service classes (StockService, TriviaAPIService, Storage) for business logic
- **Input Validation**: Comprehensive Zod schemas for runtime type checking and API validation
- **Caching Strategy**: In-memory caching for external API responses (trivia questions, stock quotes) to reduce upstream requests
- **File Handling**: Multer for image uploads with size and type restrictions

### Data Storage Solutions
The application uses a hybrid storage approach combining PostgreSQL for persistent data and in-memory storage for caching and session management.

Key architectural decisions:
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Tables for categories, questions, and game sessions with proper foreign key relationships
- **Caching**: In-memory Map-based caching for trivia questions (10-minute TTL) and stock quotes (60-second TTL)
- **Session Storage**: In-memory storage for game sessions with full CRUD operations

### Authentication and Authorization
The application implements a simple token-based authentication system for administrative functions.

Key architectural decisions:
- **Admin Access**: Environment variable-based admin token system for RSS publishing
- **CORS Configuration**: Configurable CORS origins via environment variables with fallback to allow all
- **Session Management**: PostgreSQL session store using connect-pg-simple

## External Dependencies

### Third-Party APIs
- **Open Trivia Database (opentdb.com)**: Source for trivia questions across multiple categories
- **Yahoo Finance API**: Real-time stock quote data for the trading simulator

### Database and Infrastructure
- **Neon Database**: PostgreSQL database hosting with serverless connection pooling
- **WebSocket Support**: ws library for Neon database connections

### Development and Build Tools
- **Vite**: Frontend build tool with React plugin and development server
- **Drizzle Kit**: Database schema management and migrations
- **ESBuild**: Server-side bundling for production builds

### UI and Styling Framework
- **shadcn/ui**: Component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **Google Fonts**: Inter and JetBrains Mono fonts for typography

### Validation and Type Safety
- **Zod**: Runtime type validation for API endpoints and data schemas
- **TypeScript**: Static type checking across the entire application stack
- **Drizzle-Zod**: Integration between Drizzle ORM and Zod for schema validation