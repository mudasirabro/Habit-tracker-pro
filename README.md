# 📊 Habit Tracker Pro & Task Master

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_Website-2ea44f?style=for-the-badge&logo=vercel&logoColor=white)](https://habit-tracker-pro-eight.vercel.app/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon.tech-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br />

**A complete productivity suite combining Habit Tracking, Daily Task Master with Priority Management, Pomodoro Focus Studio, Ambient Generative Soundscapes, and 24/7 AI Coaching.**

[🚀 Explore Live Demo](https://habit-tracker-pro-eight.vercel.app/) · [✨ Features](#-features) · [🏗️ Architecture](#️-architecture--tech-stack) · [🚀 Getting Started](#-getting-started) · [📖 API Reference](#-api-reference)

</div>

---

## 🌟 Overview

**Habit Tracker Pro** is an ergonomic, fatigue-free productivity workspace built on **Human-Computer Interaction (HCI)** principles. It unites daily habit formation with granular task prioritization, customizable Pomodoro sprints, mindful breathing, ambient soundscapes, and AI coaching.

Deployed as a unified full-stack application on **Vercel** with an Express serverless backend and serverless **PostgreSQL on Neon.tech**.

---

## ✨ Features

### 🎯 1. Habit & Streak Tracking
- **CRUD Operations**: Add, edit, rename, and delete custom daily habits.
- **Interactive Check-ins**: 7-day matrix check-ins with optimistic state updates.
- **Streak Engine**: Real-time streak tracking and overall completion statistics.

### 📋 2. Task Master (Daily Task Management)
- **Prioritize with Clarity**: Color-coded priorities — 🔴 **High**, 🟡 **Medium**, 🟢 **Low**.
- **Dynamic Filtering**: Instant views for `All`, `Active`, `High Priority`, and `Completed`.
- **Victory Celebrations**: Interactive particle confetti bursts & pentatonic victory chimes upon completing tasks.
- **One-Click Pomodoro Binding**: Send any task directly to the Pomodoro timer for targeted execution.

### ⏱️ 3. Pomodoro Focus Studio
- **Configurable Modes**: 🎯 **Focus (25m)**, ☕ **Short Break (5m)**, 🌴 **Long Break (15m)**.
- **Animated Circular SVG Timer**: Smooth countdown visualization with stroke-dashoffset physics.
- **Session Tracker**: Visual 4-Pomodoro cycle counters (🍅🍅⚪⚪) and cumulative daily focus minutes.
- **Mindfulness Bell**: Tibetan singing bowl audio cue via Web Audio API on session completion.

### 🧘 4. Zen Flow Space & Soundscapes
- **Live Generative Soundscapes (100% Web Audio API — zero external files)**:
  - 🌧️ **Cozy Rain**: Pink noise synthesis with lowpass filtering.
  - 🌊 **Ocean Surf**: Modulated tidal surf with LFO dynamics.
  - 🧠 **40Hz Gamma Flow**: Binaural cognitive focus beat for deep flow states.
  - 🍃 **Forest Wind**: Soft ambient woodland breeze.
- **4-7-8 Calming Breathing Guide**: Rhythmic expanding/contracting visual orb to eliminate cognitive stress.
- **Fullscreen Zen Mode**: One-click distraction-free workspace.

### 🛡️ 5. Focus Shield (Do Not Disturb & Screen Stay-Awake)
- **Screen WakeLock API**: Keeps your laptop display awake without sleeping during deep work sessions.
- **Distraction Muting**: Mutes in-app alert chimes during deep work.
- **OS Focus Assist Guide**: Visual guidance for Windows/macOS system-level DND.

### 🤖 6. AI Habit & Productivity Coach
- **Mindfulness & Motivation**: Personalized motivational advice based on your habit progress.
- **Healthy Eating Guidance**: Science-backed suggestions for sustainable nutrition habits.
- **Habit Science Explanations**: Overcome procrastination with evidence-based psychology.

### 📊 7. Analytics & Data Integrity
- **Activity Heatmap Calendar**: Color-graded monthly matrix visualizing daily intensity.
- **Weekly Trend Charts**: Powered by `Chart.js 4.4` with automatic theme adaptation.
- **Export Capabilities**: Download JSON backups or formatted PDF progress reports.
- **Light / Dark Mode**: Gentle, eye-friendly glassmorphic interface designed to prevent visual fatigue.

---

## 🏗️ Architecture & Tech Stack

```mermaid
graph LR
    Client[Browser / Frontend Client] -->|Static Assets / UI| VercelEdge[Vercel Edge CDN]
    Client -->|API Requests /api/*| VercelFunc[Vercel Serverless API Handler]
    VercelFunc -->|Express.js Router| AuthMiddleware[JWT Auth Middleware]
    AuthMiddleware -->|pg.Pool SSL| NeonPostgres[(Neon.tech Serverless PostgreSQL)]
    VercelFunc -->|HTTPS| HabitAI[AI Coach Service]
```

### Technology Breakdown

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | HTML5, Modern CSS3 (Variables, Grid, Glassmorphism), Vanilla JavaScript (ES6+) |
| **Audio Engine** | Native **Web Audio API** (Generative soundscapes & synthesized chimes) |
| **Data Visualization** | `Chart.js 4.4` |
| **Export Utilities** | `jsPDF`, `html2canvas` |
| **Backend Runtime** | `Node.js (>=18)`, `Express.js` (Serverless Function Architecture) |
| **Database** | `PostgreSQL` hosted on **Neon.tech** via `pg` connection pool with SSL |
| **Authentication** | `JSON Web Tokens (JWT)`, `bcryptjs` password hashing (10 salt rounds) |
| **Hosting & Deployment** | **Vercel** (Unified Frontend + Serverless API routing) |

---

## 📁 Project Structure

```text
habit-tracker-pro/
├── api/
│   ├── index.js             # Vercel Serverless API root entrypoint
│   └── [...path].js         # Dynamic catch-all serverless route handler
│
├── backend/
│   ├── auth.js              # JWT authentication & password verification
│   ├── database.js          # PostgreSQL connection pool, schema migration & CRUD
│   ├── server.js            # Express application routes & CORS setup
│   ├── package.json         # Backend dependency definitions
│   └── .env.example         # Template for environment variables
│
├── frontend/
│   ├── landing.html         # Marketing & feature showcase landing page
│   ├── index.html           # Authenticated unified productivity dashboard
│   ├── login.html           # User login interface
│   ├── Signup.html          # New account registration interface
│   ├── config.js            # Dynamic API host resolver
│   ├── script.js            # Task Master, Pomodoro, Zen Soundscapes & Habit logic
│   ├── chart.js             # Chart.js visualization logic & themes
│   └── style.css            # Responsive HCI design system & animations
│
├── package.json             # Root package definitions for Vercel builds
├── vercel.json              # Vercel routing and rewrite configuration
├── render.yaml              # Render blueprint (optional alternative host)
├── .gitignore               # Git ignored patterns
└── README.md                # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- A free [Neon.tech](https://neon.tech) PostgreSQL database account (or local PostgreSQL)

### 1. Clone Repository
```bash
git clone https://github.com/mudasirabro/Habit-tracker-pro.git
cd Habit-tracker-pro
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the `backend/` folder (or copy from `backend/.env.example`):

```bash
cp backend/.env.example backend/.env
```

Fill in your configuration:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_2026
DATABASE_URL=postgresql://username:password@ep-xyz-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
HABITAI_API_KEY=your_habitai_api_key_here
```

### 4. Start Local Development Server
```bash
npm start
```
The server will start at `http://localhost:3000` and automatically initialize database tables on Neon.

---

## 📖 API Reference

### Authentication
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token | No |
| `GET` | `/api/auth/verify` | Validate current session token | Bearer Token |

### Daily Task Master
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/tasks` | Get all tasks for user (ordered by priority) | Bearer Token |
| `POST` | `/api/tasks` | Create a new task (`title`, `priority`) | Bearer Token |
| `PUT` | `/api/tasks/:id` | Update task title and priority | Bearer Token |
| `DELETE` | `/api/tasks/:id` | Delete a task | Bearer Token |
| `POST` | `/api/tasks/:id/toggle` | Toggle task completion status | Bearer Token |

### Habits & Entries
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/habits` | Get all habits for the authenticated user | Bearer Token |
| `POST` | `/api/habits` | Create a new habit | Bearer Token |
| `PUT` | `/api/habits/:id` | Update habit name | Bearer Token |
| `DELETE` | `/api/habits/:id` | Delete a habit & all associated entries | Bearer Token |
| `POST` | `/api/habits/:id/toggle` | Toggle daily completion status | Bearer Token |
| `GET` | `/api/entries` | Get completion history entries | Bearer Token |

### AI Coach & System
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/coach/mindfulness`| Get mindfulness habit advice | Bearer Token |
| `POST` | `/api/coach/eating` | Get healthy eating suggestions | Bearer Token |
| `POST` | `/api/coach/meditation`| Get meditation guidance | Bearer Token |
| `GET` | `/api/health` | Service health status check | No |

---

## 🔒 Security & Data Integrity

- **Password Hashing**: Secure salted hashes generated using `bcryptjs` (10 rounds). Plaintext passwords are never stored.
- **SQL Injection Protection**: All queries utilize parameterized values (`$1, $2, ...`).
- **Data Isolation**: Strict user-level authorization ensures users can only access and modify their own records (`WHERE user_id = $userId`).
- **Cascade Deletion**: Foreign key constraints automatically clean up related entries upon habit/task deletion.
- **Zero Secrets in Git**: Sensitive credentials and connection strings are managed strictly through environment variables.

---

## 🌐 Deployment to Vercel

1. Push your repository to GitHub.
2. Import the repository into your **Vercel Dashboard**.
3. In **Settings → Environment Variables**, add:
   - `DATABASE_URL` (from Neon.tech)
   - `JWT_SECRET` (secure random string)
   - `HABITAI_API_KEY` (AI Coach key)
4. Click **Deploy**. Vercel will build both the frontend and serverless API functions automatically!

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free for personal and commercial use.

---

<div align="center">
Built with ❤️ for building better daily habits and achieving peak focus.
</div>
