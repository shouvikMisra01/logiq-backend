# Deploying LogiQ Backend to Render

This guide will help you deploy the LogiQ backend to Render.com.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. Your GitHub repository: https://github.com/shouvikMisra01/logiq-backend
3. A MongoDB database (MongoDB Atlas recommended)
4. OpenAI API key (for AI features)

## Step 1: Set up MongoDB Atlas (if you don't have one)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user
4. Whitelist all IPs (0.0.0.0/0) for Render access
5. Get your connection string (should look like: `mongodb+srv://username:password@cluster.mongodb.net/dbname`)

## Step 2: Deploy to Render

### Option A: Deploy with render.yaml (Recommended)

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Click "New +"** → **"Blueprint"**
3. **Connect your GitHub repository**: `shouvikMisra01/logiq-backend`
4. **Render will detect `render.yaml`** and set up the service automatically
5. **Configure Environment Variables** (see Step 3 below)
6. **Click "Apply"** to deploy

### Option B: Manual Deployment

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Click "New +"** → **"Web Service"**
3. **Connect your GitHub repository**: `shouvikMisra01/logiq-backend`
4. **Configure the service:**
   - **Name**: `logiq-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)
5. **Click "Create Web Service"**
6. **Configure Environment Variables** (see Step 3 below)

## Step 3: Configure Environment Variables

After creating the service, add these environment variables in the Render dashboard:

### Required Variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `8000` | Port number (Render auto-assigns, but keep as 8000) |
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB connection string |
| `JWT_SECRET` | Generate a strong secret | Used for JWT token signing |
| `OPENAI_API_KEY` | `sk-...` | Your OpenAI API key |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | Your frontend URL for CORS |

### Generate JWT_SECRET:

You can generate a secure secret with this command:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Or use: https://generate-secret.vercel.app/64

## Step 4: Deploy and Verify

1. **Wait for deployment** (usually 5-10 minutes for first deployment)
2. **Check deployment logs** in the Render dashboard
3. **Verify health endpoint**:
   - Visit: `https://your-app.onrender.com/api/health`
   - Should return: `{"status": "ok"}` or similar

4. **Test API endpoints**:
   ```bash
   # Test login
   curl -X POST https://your-app.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@logiq.com","password":"admin123"}'
   ```

## Step 5: Seed the Database

After successful deployment, seed your database with test users:

1. **SSH into your Render service** (in dashboard, go to Shell tab)
2. **Run seed command**:
   ```bash
   npm run seed
   ```

Or create an API endpoint trigger for seeding.

## Step 6: Update Frontend

Update your frontend's `.env` file to point to the Render backend:

```env
NEXT_PUBLIC_API_URL=https://your-app.onrender.com
```

Note: Remove the `/api` suffix - it's added automatically by the frontend code.

## Troubleshooting

### Issue: Build fails

**Solution**: Check build logs in Render dashboard. Common issues:
- Missing dependencies in `package.json`
- TypeScript compilation errors
- Node version mismatch

### Issue: Service crashes on start

**Solution**:
1. Check if `MONGODB_URI` is correctly set
2. Verify MongoDB Atlas allows connections from 0.0.0.0/0
3. Check environment variables are set correctly

### Issue: 503 Service Unavailable

**Solution**:
- Free tier services sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- Upgrade to paid plan for 24/7 uptime

### Issue: CORS errors

**Solution**:
- Make sure `FRONTEND_URL` environment variable is set correctly
- Update CORS configuration in `src/index.ts` if needed

## Important Notes

### Free Tier Limitations:
- ⏰ Services sleep after 15 minutes of inactivity
- 🐌 First request after sleep is slow (30-60s cold start)
- 💾 750 hours/month free
- 🚀 Upgrade to paid plan ($7/month) for always-on service

### Performance Tips:
1. Use a paid plan for production
2. Use MongoDB Atlas (M0 free tier is sufficient for development)
3. Monitor your service in the Render dashboard
4. Set up auto-deploy from GitHub for automatic updates

## Auto-Deploy from GitHub

Render automatically deploys when you push to the `main` branch:

```bash
cd /Users/shouvik_misra/Project/personal_projects/logiq-backend
git add .
git commit -m "Update backend"
git push origin main
```

Render will detect the push and automatically rebuild and redeploy! 🚀

## Monitoring

- **Logs**: View in Render dashboard → Logs tab
- **Metrics**: View in Render dashboard → Metrics tab
- **Events**: Track deployments in Events tab

## Need Help?

- Render Docs: https://render.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Support: Contact Render support in dashboard

---

**Your backend will be live at**: `https://logiq-backend.onrender.com` (or similar)

Good luck with your deployment! 🎉
