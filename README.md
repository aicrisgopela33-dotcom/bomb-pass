# Bomb Pass API

Backend API for **Bomb Pass**, a tournament game for the SorSU Bulan Campus library.
CS 313 Software Engineering 1, A.Y. 2026-2027.

- Developer: Aicris Gopela (aicrisgopela33-dotcom), BSCS 3-2
- Group and game concept: Bomb Pass Team (Group 7)

This repository contains the CS 313 backend API for the Bomb Pass game concept developed by Bomb Pass Team (Group 7). See the Git history for commit attribution.
## Tech stack

| Layer | Tool |
|---|---|
| Runtime | Node.js 22 LTS or newer |
| Web framework | Express 5 |
| Database | PostgreSQL 16 or newer |
| ORM and migrations | Sequelize 6 with sequelize-cli |

## Setup

```
git clone [repository-url]
cd [folder-name]
npm install
```

Copy `.env.example` to `.env`, then put your own PostgreSQL password in `DB_PASSWORD`.

```
npm run db:create     (first time only)
npm run db:migrate
npm run db:seed
npm run db:check
npm run dev
```

## Environment variables

| Key | Example | Purpose |
|---|---|---|
| NODE_ENV | development | Which config block to use |
| PORT | 3001 | Port the API listens on (the library assigns the final port at deployment) |
| DB_HOST | 127.0.0.1 | PostgreSQL host |
| DB_PORT | 5432 | PostgreSQL port |
| DB_NAME | your_game_slug | Database name: your game slug, with underscores |
| DB_USER | postgres | Database user |
| DB_PASSWORD | (your own) | Database password. Never commit this. |
| HUB_API_KEY | dev-hub-key | Key the Library Game Hub sends to read results. The library gives the real one at deployment. |

## Endpoints (Hub Contract v1.2)

Base URL: `http://localhost:3001/api/v1`

| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | /health | Is the API up and can it reach the database? | 200 (503 when the database is down) |
| GET | /game-info | Slug, name, group, developer, description, player limits, version | 200 |
| GET | /results | Finished games, every player, and the top 3. Needs the `X-Hub-Key` header. Optional `?since=` | 200 (401 without the key) |

## What "completed" means in my game

A player is completed when their seat's `player_status` is `FINISHED` after the session ends. Finalized seats are saved with `final_rank`; they are completed even if some of their answers were wrong or timed out. Seats marked `FORFEITED` or `ELIMINATED` are included in the game's reported players but have `completed = false`.

## Tables

1. `users` - `20261016092535-create-users.js`
2. `question_sets` - `20261016092741-create-question-sets.js`
3. `questions` - `20261016092842-create-questions.js`
4. `choices` - `20261016093033-create-choices.js`
5. `game_sessions` - `20261016094022-create-game-sessions.js`
6. `players` - `20261016094650-create-players.js`
7. `session_question_history` - `20261016094652-create-session-question-history.js`
8. `answers` - `20261016094655-create-answers.js`
9. `penalties` - `20261016094658-create-penalties.js`
10. `exp_transactions` - `20261016094700-create-exp-transactions.js`
11. `voucher_catalog` - `20261016094703-create-voucher-catalog.js`
12. `voucher_redemptions` - `20261016094705-create-voucher-redemptions.js`

The extra `20261016094707-add-session-player-foreign-keys.js` migration is not a table migration; it adds the circular `bomb_holder_player_id` and `winner_player_id` foreign keys after `players` exists.

## Database scripts

| Command | What it does |
|---|---|
| npm run db:migrate | Runs migrations that have not run yet |
| npm run db:migrate:status | Lists every migration as up or down |
| npm run db:seed | Loads the seed data |
| npm run db:check | Counts the rows in every table |
| npm run db:reset | Empties the database, rebuilds every table and reloads the seed data |
| npm run check | Runs the same automatic check that GitHub runs after every push |
