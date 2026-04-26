# 📚 Adaptive Study Planner

An adaptive study planner that helps students organize their subjects, schedule sessions, and track progress — built with React, Node.js, Express, and MongoDB.

---

## ✨ Features

- 🔐 User authentication (register / login with JWT)
- 📋 Create and manage multiple exam study plans
- 🗓️ Auto-generated adaptive day-by-day study schedules
- 📊 Progress tracking and performance analytics
- 🧠 Weakness detection — low-confidence topics get auto-rescheduled
- 💬 Daily feedback system (completed / not done + confidence)
- 📄 PDF export of full schedule
- 🎉 Celebration overlay when day is complete
- ⚙️ Settings — edit profile, change password, delete account
- 📱 PWA-ready — installable on any phone from the browser

---

## 🛠️ Tech Stack

### Frontend (`client/`)
| Tech | Purpose |
|------|---------|
| React 19 + Vite | UI framework + build tool |
| Tailwind CSS | Styling |
| Framer Motion | Animations & page transitions |
| React Router | Navigation |
| Axios | API calls |
| Recharts | Charts & analytics |
| jsPDF | PDF schedule export |
| canvas-confetti | Celebration animation |

### Backend (`server/`)
| Tech | Purpose |
|------|---------|
| Node.js + Express | REST API |
| MongoDB + Mongoose | Database |
| JWT | Authentication |
| bcryptjs | Password hashing |
| dotenv | Environment config |

---

## 📁 Project Structure

```
AI Study Planner/
├── client/                    # React frontend
│   ├── public/                # Static assets & PWA files
│   └── src/
│       ├── components/        # Reusable UI components
│       ├── context/           # React context (Auth, Plan)
│       ├── pages/             # Route-level pages
│       └── services/          # API service layer
│
└── server/                    # Node.js backend
    ├── config/                # Database connection
    ├── controllers/           # Route handlers
    ├── middleware/            # Auth middleware
    ├── models/                # Mongoose schemas
    ├── routes/                # Express routes
    └── services/              # Scheduler & adaptive AI logic
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone the repository
```bash
git clone https://github.com/Mohamedjasick/Adaptive-Study-Planner.git
cd Adaptive-Study-Planner
```

### 2. Setup the Backend
```bash
cd server
npm install
```

Create a `.env` file inside `server/`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

Start the server:
```bash
node index.js
```

### 3. Setup the Frontend
```bash
cd client
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update name / daily hours |
| PUT | `/api/auth/change-password` | Change password |
| DELETE | `/api/auth/account` | Delete account |

### Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plans` | Get all plans |
| POST | `/api/plans` | Create plan + schedule |
| POST | `/api/plans/preview` | Preview schedule feasibility |
| PUT | `/api/plans/:id` | Update plan |
| DELETE | `/api/plans/:id` | Delete plan + cascade |

### Schedule
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schedule` | Get full schedule |
| GET | `/api/schedule/today` | Today's topics (single plan) |
| GET | `/api/schedule/today-all` | Today's topics (all plans) |
| PUT | `/api/schedule/regenerate/:planId` | Regenerate with new settings |

### Feedback
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/feedback` | Submit topic feedback |
| GET | `/api/feedback` | Get all feedback |
| GET | `/api/feedback/weak-topics` | Get weak topics |
| GET | `/api/feedback/progress` | Get progress stats |

---

## 📦 Deployment

### Backend → Render
1. Push to GitHub
2. Create new Web Service on [Render](https://render.com)
3. Set root directory to `server`
4. Build command: `npm install`
5. Start command: `node index.js`
6. Add environment variables: `MONGO_URI`, `JWT_SECRET`, `PORT`

### Frontend → Vercel
1. Push to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Set root directory to `client`
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variable: `VITE_API_URL=https://your-render-url.onrender.com/api`

## 🌐 Live Demo

- **App:** https://adaptive-study-planner-hmj.vercel.app
- **API:** https://adaptive-study-planner.onrender.com
---

## 📱 PWA Installation

Once deployed on HTTPS, open the app in Chrome on your phone. You'll see an "Add to Home Screen" prompt — tap it and the app installs like a native app with no browser bar.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).