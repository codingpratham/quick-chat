# Quick-Chat Client

This is the React + Tailwind CSS v4 frontend for the Quick-chat chat application, built using Vite.

## Tech Stack

- **Framework**: React 19 (TypeScript)
- **Styling**: Tailwind CSS v4 (Zero-config, fast, fully CSS-driven theme configuration)
- **Icons**: Lucide React
- **Dev Server**: Vite (configured with an HTTP API proxy to avoid CORS issues)

## Features

- Sleek Dark glassmorphic user interface.
- Secure, token-based state management mapping to httpOnly server cookies.
- Real-time messages list with instant auto-scroll, member lists, and system event logging.
- Channel management: self-join restriction screen, user invitations, and creator moderation (kick action).

## Development Setup

1. Make sure the backend server in the `../server` folder is running on port `3000`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open the browser to the address shown in the terminal (usually `http://localhost:5173`).

## Production Build

To compile the application for production deployment:
```bash
npm run build
```
The output assets will be built to the `dist/` directory.
