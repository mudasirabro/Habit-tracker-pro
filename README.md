# Habit-tracker-pro
Habit Tracker Pro is an AI-powered habit tracking application that helps users build and maintain positive habits. Features include habit tracking with streaks, AI coaching for motivation, visual analytics, calendar views, and PDF report generation. Built with Node.js, Express, SQLite/PostgreSQL, and vanilla JavaScript.

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
habit-tracker/
├── backend/
│ ├── database.js # Database operations
│ ├── server.js # Express server
│ ├── auth.js # JWT authentication
│ ├── auth-google.js # Google OAuth (optional)
│ ├── package.json
│ └── .env
├── frontend/
│ ├── index.html # Main app
│ ├── landing.html # Marketing page
│ ├── login.html # Login page
│ ├── signup.html # Signup page
│ ├── auth-callback.html # OAuth callback
│ ├── style.css # Styles
│ ├── script.js # Frontend logic
│ ├── chart.js # Chart configuration
│ └── assets/ # Images, icons
├── vercel.json # Vercel deployment config
├── .gitignore
└── README.md


---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | v18 or higher |
| npm | v9 or higher |
| Git | Latest |

### Installation

#### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/habit-tracker-pro.git
cd habit-tracker-pro

 Install backend dependencies
bash
cd backend
npm install
3. Configure environment variables
Create .env file in backend/:

env
PORT=3000
JWT_SECRET=your_jwt_secret_key
HABITAI_API_KEY=your_habit_ai_api_key

# Optional - Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_session_secret
4. Initialize database
bash
# SQLite (default)
node server.js   # Database auto-creates

# OR PostgreSQL (production)
# Set DATABASE_URL in .env
5. Start backend server
bash
node server.js
Backend runs at: http://localhost:3000

6. Start frontend
Open a new terminal:

bash
cd frontend
npx serve . -l 61071
Frontend runs at: http://localhost:61071

7. Open the app
Navigate to: http://localhost:61071/landing.html
