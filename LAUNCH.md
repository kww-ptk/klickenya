# Klickenya V1 Launch Checklist

## Vercel Setup
- [ ] Connect GitHub repo to Vercel
- [ ] Add all env vars from .env.local to Vercel dashboard
- [ ] Set NEXT_PUBLIC_SITE_URL=https://klickenya.com
- [ ] Custom domain klickenya.com pointing to Vercel
- [ ] SSL certificate active (automatic on Vercel)

## Supabase
- [ ] RLS enabled on all tables
- [ ] Run migrations: listing_requests, general_contacts, ambassador_applications
- [ ] Run: pnpm create:admin to create admin user
- [ ] Test admin login at klickenya.com/login

## Sanity
- [ ] Add CORS origin: https://klickenya.com
- [ ] Add CORS origin: https://studio.klickenya.com
- [ ] Deploy Studio: cd apps/studio && npx sanity deploy
- [ ] Set Studio hostname: studio.klickenya.com
- [ ] Configure Sanity webhook for ISR revalidation
- [ ] Publish Site Settings (logo, nav, footer links)
- [ ] Add 5 destinations: watamu, kilifi, diani, nairobi, lamu
- [ ] Add 20+ listings published
- [ ] Add 5+ blog posts published
- [ ] Fill in About and How It Works page content

## SEO
- [ ] Google Search Console: verify domain
- [ ] Submit sitemap: https://klickenya.com/sitemap.xml
- [ ] Vercel Analytics enabled
- [ ] Test JSON-LD with Google Rich Results Test

## Testing
- [ ] Submit listing request form → check email arrives
- [ ] Submit contact form → check email arrives
- [ ] Submit listing enquiry → check email arrives
- [ ] Submit property enquiry → check email arrives
- [ ] Submit ambassador application → check email arrives
- [ ] Test admin login and inbox
- [ ] Verify all submissions appear in admin panel
- [ ] Lighthouse: all pages 90+ Performance, 100 SEO
- [ ] Test on iPhone Safari + Android Chrome
- [ ] Check sitemap.xml has all URLs
- [ ] Check robots.txt blocks /admin/
- [ ] Test 404 page looks correct
- [ ] Test all destination cards on homepage

## Go Live
- [ ] git add . && git commit -m "v1 launch ready"
- [ ] git push → Vercel auto-deploys
- [ ] Verify https://klickenya.com loads correctly
- [ ] Submit to Google Search Console
- [ ] Share on social media 🚀
