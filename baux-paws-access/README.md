# FlixDog Provider Portal

A provider backoffice application for managing dog & human experiences, trips, and bookings.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Backend**: Supabase
- **Charts**: Recharts

## Project Structure

```
src/
├── components/           # UI Components
│   ├── ui/              # shadcn/ui base components (auto-generated)
│   ├── common/          # Shared/reusable components
│   ├── booking/         # Booking-related components
│   ├── admin/           # Admin panel components
│   └── analytics/       # Chart and analytics components
│
├── pages/               # Page components (route targets)
│   ├── Index.tsx        # Landing page
│   ├── Auth.tsx         # Login/Signup
│   ├── Dashboard.tsx    # Provider dashboard
│   ├── Orders.tsx       # Order management
│   ├── Analytics.tsx    # Provider analytics
│   ├── Admin.tsx        # Admin panel
│   └── NotFound.tsx     # 404 page
│
├── services/            # Business logic & API calls
│   ├── booking.service.ts
│   ├── provider.service.ts
│   └── auth.service.ts
│
├── types/               # TypeScript interfaces
│   ├── booking.types.ts
│   └── provider.types.ts
│
├── config/              # Configuration & constants
│   └── constants.ts
│
├── hooks/               # Custom React hooks
│   ├── use-toast.ts
│   └── use-mobile.tsx
│
├── lib/                 # Utility functions
│   └── utils.ts
│
├── integrations/        # External service clients
│   └── supabase/
│       ├── client.ts    # Supabase client (auto-generated)
│       └── types.ts     # Database types (auto-generated)
│
└── App.tsx              # Main app with routing

supabase/
├── functions/           # Edge Functions
│   └── auto-complete-bookings/
└── config.toml          # Supabase configuration
```

## Key Concepts

### User Roles
- **Admin**: Full access to admin panel, provider management, signup codes
- **Provider**: Access to dashboard, bookings, analytics for their own data

### Booking Flow
1. Bookings come from external system (Shopify)
2. Providers see bookings in dashboard
3. Providers can confirm/cancel bookings
4. System auto-completes bookings after event date

### Data Model
- **Providers** (profiles): Company info, contact details, active status
- **Bookings**: Customer info, event details, dates, status
- **Events**: Classes, Experiences, Trips (separate tables)
- **Signup Codes**: One-time codes for provider registration

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Environment

Create a `.env.local` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=https://zyonwzilijgnnnmhxvbo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
VITE_SUPABASE_PROJECT_ID=zyonwzilijgnnnmhxvbo
```

See `.env.example` for a template.

## Authentication

- Email/password authentication via Supabase Auth
- Signup requires invitation code (managed by admin)
- Admin users redirect to `/admin`, providers to `/dashboard`

## Database Security

- Row Level Security (RLS) enabled on all tables
- Providers can only access their own data
- Admin role checked via `has_role()` database function

---

## Deployment

This application can be deployed to Vercel, Netlify, or any platform that supports Vite applications.

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`