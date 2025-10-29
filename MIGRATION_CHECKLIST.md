# MenuFlow Production Migration Checklist

Quick reference guide for migrating to GitHub + Cursor + Supabase + Vercel

## Pre-Migration Setup

### Accounts & Services
- [ ] Create Supabase account and project
- [ ] Create GitHub repository
- [ ] Create Vercel account
- [ ] Download and setup Cursor IDE
- [ ] Purchase custom domain (optional)

### Credentials to Save
- [ ] Supabase Project URL
- [ ] Supabase Anon Key
- [ ] Supabase Service Role Key
- [ ] Supabase Database Connection String
- [ ] GitHub repository URL
- [ ] Vercel project URL

---

## Database Migration

### Supabase Setup
- [ ] Create Supabase project
- [ ] Enable Email/Password authentication
- [ ] Enable Realtime on orders and chat_messages tables
- [ ] Configure drizzle.config.ts for Supabase
- [ ] Push schema: `npm run db:push`
- [ ] Verify all 7 tables created

### Row Level Security (RLS)
- [ ] Enable RLS on all tables
- [ ] Create policies for vendors table
- [ ] Create policies for menu_items table
- [ ] Create policies for tables table
- [ ] Create policies for orders table
- [ ] Create policies for chat_messages table
- [ ] Create policies for file_uploads table
- [ ] Create policies for bills table

### Data Migration
- [ ] Export data from Neon database
- [ ] Import data to Supabase
- [ ] Verify row counts match
- [ ] Test sample queries
- [ ] Create auth_vendor_mapping table

---

## Code Refactoring

### Authentication
- [ ] Install `@supabase/supabase-js`
- [ ] Create `client/src/lib/supabase.ts`
- [ ] Update `client/src/lib/auth-context.tsx`
- [ ] Create `server/middleware/auth.ts`
- [ ] Replace localStorage with Supabase Auth
- [ ] Test login/logout functionality

### Serverless Functions
- [ ] Create `/api` directory structure
- [ ] Convert Express routes to Vercel functions
- [ ] Update API endpoints (auth, menu, orders, etc.)
- [ ] Test each endpoint locally
- [ ] Add authentication middleware to protected routes

### Realtime
- [ ] Remove custom WebSocket server code
- [ ] Update `use-websocket.tsx` for Supabase Realtime
- [ ] Subscribe to orders channel
- [ ] Subscribe to chat_messages channel
- [ ] Test real-time updates

### Configuration
- [ ] Create `vercel.json`
- [ ] Update `package.json` scripts
- [ ] Create `.env.local` for development
- [ ] Update `vite.config.ts` if needed
- [ ] Add `.env*.local` to `.gitignore`

---

## Environment Variables

### Local Development (.env.local)
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_KEY`
- [ ] `SUPABASE_DATABASE_URL`
- [ ] `VITE_APP_URL`

### Vercel Production
- [ ] Add all environment variables in Vercel dashboard
- [ ] Set for Production environment
- [ ] Set for Preview environment
- [ ] Set for Development environment

---

## Testing

### Local Testing
- [ ] Registration with Supabase Auth
- [ ] Login/Logout
- [ ] Menu CRUD operations
- [ ] Table management (Pro/Elite)
- [ ] Order creation
- [ ] Order status updates
- [ ] Smart order merging
- [ ] Real-time notifications
- [ ] Chat functionality
- [ ] File uploads
- [ ] Owner role features
- [ ] Waiter role restrictions
- [ ] Kitchen role restrictions
- [ ] Tier restrictions (Starter/Pro/Elite)

### Staging Testing
- [ ] Deploy to Vercel staging
- [ ] Test all features on staging
- [ ] Load testing
- [ ] Security testing
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility

---

## Deployment

### GitHub
- [ ] Push code to GitHub
- [ ] Setup branch protection
- [ ] Configure GitHub Actions (optional)

### Vercel
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Add environment variables
- [ ] Test preview deployment
- [ ] Deploy to production

### Custom Domain
- [ ] Purchase domain
- [ ] Add domain in Vercel
- [ ] Configure DNS records (A and CNAME)
- [ ] Wait for DNS propagation
- [ ] Verify SSL certificate

### Supabase Configuration
- [ ] Update Site URL to custom domain
- [ ] Add redirect URLs for authentication
- [ ] Test auth flows with production URL

---

## Post-Deployment

### Monitoring
- [ ] Setup Sentry for error tracking
- [ ] Setup analytics (PostHog/Google Analytics)
- [ ] Setup uptime monitoring
- [ ] Monitor Vercel deployment logs
- [ ] Monitor Supabase performance dashboard
- [ ] Setup alerts for errors

### Optimization
- [ ] Enable Vercel Edge caching
- [ ] Optimize images
- [ ] Check bundle size
- [ ] Add database indexes
- [ ] Test page load speeds
- [ ] Monitor Core Web Vitals

### Backup & Security
- [ ] Enable daily Supabase backups
- [ ] Test database restore procedure
- [ ] Verify RLS policies working
- [ ] Test rate limiting
- [ ] Security audit
- [ ] Update dependencies

---

## Rollback Plan

### Emergency Rollback
- [ ] Keep Neon database active for 1 week
- [ ] Document revert procedure
- [ ] Test rollback in staging
- [ ] Have DNS revert plan ready

---

## Final Checklist Before Go-Live

- [ ] All environment variables set
- [ ] SSL certificate active
- [ ] All tests passing
- [ ] Load testing completed
- [ ] Backup strategy in place
- [ ] Monitoring tools configured
- [ ] Error tracking active
- [ ] Team trained on new stack
- [ ] Documentation updated
- [ ] Users notified of migration (if applicable)

---

## Cost Tracking

### Monthly Costs
- [ ] Supabase: Free tier or Pro ($25/mo)
- [ ] Vercel: Free tier or Pro ($20/mo)
- [ ] Domain: $10-15/year
- [ ] Error tracking (Sentry): Free tier available
- [ ] Total estimated: $0-50/month

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Vercel Discord**: https://vercel.com/discord
- **GitHub Issues**: Track bugs and features

---

## Timeline

- **Week 1**: Database setup and data migration
- **Week 2**: Authentication and API refactoring
- **Week 3**: Realtime and environment configuration
- **Week 4**: Testing and domain setup
- **Week 5**: Production deployment and monitoring

---

## Success Criteria

✅ All features working in production  
✅ Zero downtime migration  
✅ Proper authentication and security  
✅ SSL certificate active  
✅ Monitoring and alerts configured  
✅ Response times < 200ms for API calls  
✅ 99.9% uptime maintained  
✅ All user roles functioning correctly  
✅ Tier restrictions enforced  

---

## Notes

Use this checklist alongside the detailed MIGRATION_PLAN.txt document.
Check off items as you complete them to track progress.

Good luck! 🚀
