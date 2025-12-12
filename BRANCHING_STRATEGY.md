# 🌳 Git Branching Strategy

## 📋 Branch Structure

```
main (production) ─────────────────────────────────
      ↑
      │ (merge when stable)
      │
dev (development) ─────────────────────────────────
      ↑
      │ (feature branches merge here)
      │
feature/your-feature ──────────────────────────────
```

---

## 🎯 Branch Purposes

### **`main` Branch** (Production)
- **Purpose:** Stable, production-ready code
- **Deployment:** Auto-deploys to Render
- **Protection:** Should be protected on GitHub
- **Merges:** Only from `dev` after thorough testing

### **`dev` Branch** (Development)
- **Purpose:** Active development and testing
- **Current Branch:** ✅ You are here
- **Merges:** Feature branches merge here first
- **Testing:** All new features tested here before production

### **Feature Branches** (Optional)
- **Naming:** `feature/feature-name`, `fix/bug-name`
- **Purpose:** Individual features or bug fixes
- **Merges:** Into `dev` branch

---

## 🚀 Development Workflow

### **Daily Development (Current Setup)**

You're currently on the `dev` branch. Here's your workflow:

1. **Make Changes**
   ```bash
   # Edit your code
   npm run dev  # Test locally
   ```

2. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

3. **Push to Dev**
   ```bash
   git push origin dev
   ```

4. **Test on Dev Environment** (if you set up dev deployment)

5. **When Stable → Merge to Main**
   ```bash
   git checkout main
   git pull origin main
   git merge dev
   git push origin main
   ```

---

## 📝 Commit Message Convention

Use clear, descriptive commit messages:

```bash
# Feature
git commit -m "feat: add teacher assignment API"

# Bug fix
git commit -m "fix: resolve CORS issue for production"

# Database
git commit -m "db: add indexes for quiz performance"

# Backend API
git commit -m "api: update quiz generation endpoint"

# Documentation
git commit -m "docs: update API documentation"

# Refactor
git commit -m "refactor: improve CORS configuration"
```

---

## 🔄 Merge Dev to Main (Production Release)

When you're ready to deploy to production:

### **Step 1: Ensure Dev is Clean**
```bash
git checkout dev
git status  # Should be clean
git pull origin dev
```

### **Step 2: Switch to Main**
```bash
git checkout main
git pull origin main
```

### **Step 3: Merge Dev into Main**
```bash
git merge dev
```

### **Step 4: Push to Production**
```bash
git push origin main
```

### **Step 5: Verify Deployment**
- Backend: Check Render deployment at https://logiq-backend.onrender.com
- Check logs on Render dashboard
- Test API endpoints

---

## 🛡️ Branch Protection (Recommended)

### **GitHub Settings → Branches → Add Rule**

**For `main` branch:**
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ✅ Include administrators
- ✅ Restrict who can push to matching branches

**For `dev` branch:**
- ✅ Require status checks to pass (optional)
- ⬜ Allow direct pushes (for faster development)

---

## 🎨 Current Repository Status

```
Repository: logiq-backend
Current Branch: dev ✅
Remote Tracking: origin/dev ✅
```

---

## 🔧 Quick Commands Reference

```bash
# Check current branch
git branch --show-current

# View all branches
git branch -a

# Switch to dev
git checkout dev

# Switch to main
git checkout main

# Pull latest changes
git pull origin dev    # or main

# Push changes
git push origin dev    # or main

# See commit history
git log --oneline -10

# See uncommitted changes
git status
```

---

## 📊 Deployment Status

| Branch | Environment | URL | Auto-Deploy |
|--------|-------------|-----|-------------|
| `main` | Production | https://logiq-backend.onrender.com | ✅ Render |
| `dev` | Development | Local | Manual |

---

## ⚡ Best Practices

1. **Always work on `dev` branch** for new features
2. **Test API endpoints locally** before merging to `main`
3. **Use descriptive commit messages**
4. **Pull before push** to avoid conflicts
5. **Keep `main` stable** - it's your production code
6. **Test MongoDB connections** on both environments
7. **Check environment variables** before deployment

---

## 🆘 Common Issues & Solutions

### **Merge Conflict**
```bash
# If you get conflicts during merge
git status  # See conflicted files
# Manually resolve conflicts in your editor
git add .
git commit -m "merge: resolve conflicts from dev"
git push origin main
```

### **Accidentally Committed to Wrong Branch**
```bash
# If you committed to main instead of dev
git log -1  # Copy the commit hash
git checkout dev
git cherry-pick <commit-hash>
git checkout main
git reset --hard HEAD~1
```

### **Need to Undo Last Commit**
```bash
# Keep changes but undo commit
git reset --soft HEAD~1

# Discard changes and undo commit
git reset --hard HEAD~1
```

---

## 🔐 Environment Variables

Remember to set these in Render for production:

```bash
MONGODB_URI=mongodb+srv://your-atlas-connection
PORT=8000
NODE_ENV=production
JWT_SECRET=your-secret
```

---

## 📞 Support

For issues with:
- **Git/GitHub:** Check GitHub documentation
- **Render Deployment:** Check Render dashboard
- **MongoDB:** Check Atlas dashboard
- **Code Issues:** Test on `dev` first!

---

**Remember:** `dev` = Development | `main` = Production ✨
