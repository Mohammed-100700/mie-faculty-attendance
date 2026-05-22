# Deployment Guide — MIE Faculty Attendance System

## Architecture
- **Backend:** Node.js + Express → Deploy to [Render](https://render.com)
- **Frontend:** React + Vite → Deploy to [Vercel](https://vercel.com)
- **Database:** MongoDB Atlas (free tier)

---

## Step 1: Set up MongoDB Atlas (Database)

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) and create a free account
2. Create a new cluster (free tier — M0)
3. Create a database user (save the username and password)
4. Set Network Access → Allow from anywhere (`0.0.0.0/0`)
5. Get your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster.xxxxx.mongodb.net/mie_faculty_attendance
   ```

---

## Step 2: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up (use GitHub)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo (`Mohammed-100700/mie-faculty-attendance`)
4. Configure:
   - **Name:** `mie-faculty-api`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
5. Add Environment Variables (click "Advanced" → "Add Environment Variable"):
   ```
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.xxxxx.mongodb.net/mie_faculty_attendance
   JWT_SECRET=<generate-a-random-64-char-string>
   JWT_EXPIRES_IN=7d
   CLIENT_URL=https://your-frontend-url.vercel.app
   EMAIL_ENCRYPTION_KEY=<your-exactly-32-character-key>
   NODE_ENV=production
   ```
6. Click **"Create Web Service"**
7. Wait for deployment (2-3 minutes)
8. Note your backend URL: `https://mie-faculty-api.onrender.com`

> ⚠️ **Important:** Generate a strong JWT secret:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
> Generate a 32-char encryption key:
> ```bash
> node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
> ```

---

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (use GitHub)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repo (`Mohammed-100700/mie-faculty-attendance`)
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add Environment Variable:
   ```
   VITE_API_URL=https://mie-faculty-api.onrender.com/api
   ```
6. Click **"Deploy"**
7. Wait for deployment (1-2 minutes)
8. Note your frontend URL: `https://mie-faculty-attendance.vercel.app`

---

## Step 4: Update Backend CORS

1. Go to your Render dashboard → `mie-faculty-api` → **"Environment"**
2. Update `CLIENT_URL` to your actual Vercel URL:
   ```
   CLIENT_URL=https://mie-faculty-attendance.vercel.app
   ```
3. The backend will auto-redeploy

---

## Step 5: Test

1. Open your Vercel URL
2. Register a new lecturer account
3. Login and test all features

---

## Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| Render | 750 hrs/month (enough for 24/7), sleeps after 15 min inactivity |
| Vercel | 100 GB bandwidth, unlimited sites |
| MongoDB Atlas | 512 MB storage |

> ⚠️ **Render free tier sleeps** after 15 minutes of inactivity. First request after sleep takes ~30 seconds. For production use, consider upgrading to Render's $7/month plan.

---

## Troubleshooting

- **CORS errors:** Make sure `CLIENT_URL` in Render matches your Vercel URL exactly
- **Login fails:** Check `JWT_SECRET` is set and is a strong random string
- **Database connection fails:** Make sure MongoDB Atlas allows connections from all IPs (`0.0.0.0/0`)
- **Email not sending:** Lecturer must configure their Gmail App Password in Settings
