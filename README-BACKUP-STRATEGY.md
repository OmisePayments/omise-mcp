# README Backup & Restore Strategy

## 📋 Available README Files

| File | Purpose | Lines | Use For |
|------|---------|-------|---------|
| `README.md` | **Active** - Alpha release documentation | 712 | Current version |
| `README-FULL.md` | **Template** - Complete documentation | 789 | Beta/Stable releases |
| `README-DEPLOYMENT.md` | Deployment guide | - | Reference |
| `README-BACKUP-STRATEGY.md` | This file - restore instructions | - | Reference |

## 🔄 Restoration Guide

### For Beta Release (1.0.0-beta)

```bash
# Step 1: Use full template as base
cp README-FULL.md README.md

# Step 2: Update version and warnings
# - Change version badge: 1.0.0 → 1.0.0-beta
# - Update warning: Add beta notice
# - Update package.json version

# Step 3: Commit changes
git add README.md package.json
git commit -m "docs: update to beta release (1.0.0-beta)"
git tag -a v1.0.0-beta -m "Beta release"
```

### For Stable Release (1.0.0)

```bash
# Step 1: Use full template as base
cp README-FULL.md README.md

# Step 2: Remove pre-release warnings
# - Update version badge: 1.0.0-beta → 1.0.0
# - Remove all alpha/beta warnings
# - Update package.json version

# Step 3: Commit and tag
git add README.md package.json
git commit -m "docs: stable release 1.0.0"
git tag -a v1.0.0 -m "Stable release 1.0.0"
```

## 📊 Version Comparison

### Alpha (Current README.md)
- ✅ Simplified for merchants (712 lines)
- ✅ Alpha warnings present
- ❌ No monitoring details (Prometheus, Grafana, Loki)
- ❌ No staging environment
- ❌ No advanced deployment

### Full (README-FULL.md)
- ✅ Complete documentation (789 lines)
- ✅ Monitoring sections (Prometheus, Grafana, Loki)
- ✅ Staging environment configuration
- ✅ Advanced deployment (deploy.sh)
- ✅ Complete project structure
- ✅ Roadmap section

## 🎯 Release Workflow

```
Current:  1.0.0-alpha (README.md - simplified)
             ↓
Beta:     1.0.0-beta (copy from README-FULL.md, update version)
             ↓
Stable:   1.0.0 (copy from README-FULL.md, remove warnings)
```

## 🔒 Git History Restoration

### View Previous Versions
```bash
# View git history
git log --oneline README.md

# View specific version
git show <commit-hash>:README.md

# Save old version without checkout
git show HEAD~1:README.md > README-OLD.md
```

### Restore from Git
```bash
# Restore from specific commit
git checkout <commit-hash> -- README.md

# Restore from before alpha changes
git checkout c505ec8 -- README.md
```

## 💡 Best Practices

1. **Always keep README-FULL.md** - It's your template for production releases
2. **Version control everything** - Git history is your backup
3. **Tag releases** - Easy to find specific versions later
4. **Update incrementally** - Alpha → Beta → Stable
5. **Test documentation** - Ensure all examples work

---

**Last Updated**: $(date)
**Maintained For**: Omise MCP Server Release Management
