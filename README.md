# 📊 Habit Tracker Pro

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-18+-green)
![Database](https://img.shields.io/badge/database-SQLite%20%7C%20PostgreSQL-blue)

**Build better habits, one day at a time**

[Live Demo](https://habit-tracker-pro.vercel.app) | [Report Bug](https://github.com/YOUR_USERNAME/habit-tracker-pro/issues) | [Request Feature](https://github.com/YOUR_USERNAME/habit-tracker-pro/issues)

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [🔧 Installation](#-installation)
- [🌐 API Endpoints](#-api-endpoints)
- [📄 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📝 License](#-license)

---

## ✨ Features

### Core Features

| Feature | Description |
|---------|-------------|
| ✅ **Habit Tracking** | Create, edit, and delete habits with daily tracking |
| 🔥 **Streak Counter** | Track consecutive days of habit completion |
| 📊 **Analytics Dashboard** | Visualize progress with charts and statistics |
| 📅 **Calendar View** | Color-coded calendar showing daily activity |
| 🔔 **Smart Reminders** | Daily notifications at custom times |
| 📄 **PDF Reports** | Generate professional monthly progress reports |
| 💾 **Data Export** | Export data as JSON for backup |

### AI Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Habit Coach** | Get personalized motivation and advice |
| 💡 **Habit Suggestions** | AI-powered habit recommendations |
| 📚 **Science Explanations** | Learn the science behind habit formation |
| 🔄 **Recovery Support** | Get help rebuilding after missed days |

### User Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Email/Password or Google OAuth login |
| 🌙 **Dark Mode** | Toggle between light and dark themes |
| 📱 **Responsive Design** | Works on desktop, tablet, and mobile |

---

## 🏗️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure |
| CSS3 | Styling & Animations |
| JavaScript (Vanilla) | Interactivity |
| Chart.js | Data visualization |
| html2canvas + jsPDF | PDF generation |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express.js | Web framework |
| SQLite / PostgreSQL | Database |
| JWT | Authentication |
| bcryptjs | Password hashing |

### APIs & Services

| Service | Purpose |
|---------|---------|
| Habit AI API | AI coaching responses |
| Google OAuth (optional) | Social login |

---

## 📁 Project Structure

```text
habit-tracker/
│
├── backend/
│   ├── database.js          # Database operations (SQLite/PostgreSQL)
│   ├── server.js            # Express server & API routes
│   ├── auth.js              # JWT authentication
│   ├── auth-google.js       # Google OAuth (optional)
│   ├── db.js                # PostgreSQL connection pool
│   ├── package.json         # Backend dependencies
│   ├── package-lock.json
│   └── .env                 # Environment variables
│
├── frontend/
│   ├── index.html           # Main dashboard app
│   ├── landing.html         # Marketing/landing page
│   ├── login.html           # Login page
│   ├── signup.html          # Signup page
│   ├── auth-callback.html   # OAuth callback handler
│   ├── style.css            # Global styles & themes
│   ├── script.js            # Frontend logic & API calls
│   ├── chart.js             # Chart.js configuration
│   └── assets/              # Images, icons, fonts
│
├── vercel.json              # Vercel deployment configuration
├── .gitignore               # Git ignore rules
└── README.md                # Project documentation
