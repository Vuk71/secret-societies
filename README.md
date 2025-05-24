# Secret Societies

Secret Societies is a multiplayer board game simulator of intrigue and power, built with Next.js and Firebase. Players weave plots, manage resources, and compete for dominance in a courtly setting inspired by medieval royalty.

## Features

- Create and join multiplayer game lobbies
- Real-time gameplay with player actions and game state updates
- Thematic UI with deep crimson, gold, and dark backgrounds
- Leaderboard tracking player victories
- Responsive design for desktop and mobile

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/Vuk71/secret-societies.git
   cd secret-societies
   ```

2. **Install dependencies:**
    ```sh
    npm install
    ```

3. **Configure Firebase:**
   - Copy `env.example` to `.env` and fill in your Firebase project credentials.

4. **Run the development server:**
    ```sh
    npm run dev
    ```
    The app will be available at [http://localhost:3000](http://localhost:3000).

### Build for Production

```sh
npm run build
npm start
```

## Project Structure

- `src/app` – Next.js app directory (pages, API routes)
- `src/components` – UI and game components
- `src/types` – TypeScript types for game logic
- `src/lib` – Firebase and utility functions
- `docs/blueprint.md` – Game design and style guidelines


## Scripts

- `npm run dev` – Start development server
- `npm run build` – Build for production
- `npm start` – Start production server
- `npm run lint` – Lint code
- `npm run typecheck` – TypeScript type checking