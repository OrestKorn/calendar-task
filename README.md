# Calendar Task – Run Instructions

## Prerequisites

- Node.js 18+
- npm

## Frontend (React + Vite)

From the project root:

```bash
cd calendar-task
npm install
npm run dev
```

The app will be available at the URL printed by Vite (typically `http://localhost:5173`).

## Backend (Node.js + Express + MongoDB)

From the `server` folder:

```bash
cd calendar-task/server
npm install
npm run dev
```

The API will run on `http://localhost:5001`.

Make sure `.env` in the `server` folder contains a valid MongoDB connection string, for example:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/calendar?retryWrites=true&w=majority
PORT=5001
```

