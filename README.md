# PM Productivity Tool

A project management and productivity tracking tool for teams, built with React and Supabase.

## Features

- **Kanban Board & List Views** - Organize work items with drag-and-drop kanban boards or detailed list views
- **Team Workload Management** - Manager dashboard to view team workloads and project status
- **Weekly Status Reports** - Generate PDF reports for leadership updates
- **Real-time Collaboration** - Comments, subtasks, and activity tracking
- **PDF Export** - Export project views and reports to PDF
- **Role-based Access** - Admin, Manager, and Member roles with appropriate permissions

## Quick Start

1. Clone or fork this repository
2. Update the `APP_CONFIG` block in `index.html` (see Configuration below)
3. Set up your Supabase project (see Supabase Setup)
4. Deploy to GitHub Pages or your preferred hosting

## Configuration

Edit the `APP_CONFIG` block at the top of `index.html`:

```javascript
const APP_CONFIG = {
    // Authentication (Clerk)
    CLERK_PUBLISHABLE_KEY: "pk_live_YOUR_PRODUCTION_KEY",
    AUTH_ENABLED: true,

    // Database (Supabase)
    SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
    SUPABASE_ANON_KEY: "YOUR_ANON_KEY",
    SUPABASE_ENABLED: true,

    // Branding
    ORG_NAME: "Your Organization",
    ORG_DOMAIN: "yourdomain.org",
    LOGO_URL: "https://your-logo-url.png",

    // Environment
    IS_PRODUCTION: true,
    DEBUG_MODE: false  // Set to true for development
};
```

### Configuration Options

| Option | Description |
|--------|-------------|
| `CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key from [dashboard.clerk.com](https://dashboard.clerk.com) |
| `AUTH_ENABLED` | Set to `true` to enable authentication |
| `SUPABASE_URL` | Your Supabase project URL from Settings > API |
| `SUPABASE_ANON_KEY` | Your Supabase anonymous key from Settings > API |
| `SUPABASE_ENABLED` | Set to `true` to enable database functionality |
| `ORG_NAME` | Your organization name (used in UI and PDFs) |
| `ORG_DOMAIN` | Your email domain (used for placeholder text) |
| `LOGO_URL` | URL to your organization's logo |
| `IS_PRODUCTION` | Set to `true` for production deployment |
| `DEBUG_MODE` | Set to `true` to enable debug logging and local testing |

## Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the migrations in `/supabase/migrations` to create the required tables:
   - `workflow_items` - Main project/task items
   - `user_profiles` - User accounts and roles
   - `managers` - Manager hierarchy and reports
   - `activity_log` - Activity tracking
   - `notifications` - User notifications

3. Configure Row Level Security (RLS) policies as defined in the migrations

4. Set up Edge Functions environment variables in your Supabase project:
   - `RESEND_API_KEY` - API key for Resend email service
   - `FROM_EMAIL` - Sender email address for notifications
   - `APP_NAME` - Application name for email templates
   - `APP_URL` - Your deployed application URL

## Clerk Setup

1. Create a Clerk application at [dashboard.clerk.com](https://dashboard.clerk.com)

2. Configure allowed domains for your deployment

3. (Optional) Create a JWT template named `supabase` for authenticated database requests

4. Copy your publishable key to `APP_CONFIG.CLERK_PUBLISHABLE_KEY`

## Deployment

### GitHub Pages

1. Push your code to a GitHub repository
2. Go to Settings > Pages
3. Set Source to "Deploy from a branch" and select `main`
4. Your site will be available at `https://[username].github.io/[repo-name]`

### Other Hosting

The app is a single HTML file with CDN dependencies, so it can be hosted on any static hosting service:
- Netlify
- Vercel
- AWS S3
- Any web server

## Development

### Local Testing

1. Set `DEBUG_MODE: true` in `APP_CONFIG`
2. Open `index.html` directly in a browser (file:// protocol)
3. The app will use mock data in local testing mode

### Debug Mode Features

When `DEBUG_MODE` is enabled:
- Console logging is active
- Local file:// protocol testing is allowed
- Error details are shown in error boundaries
- Mock data is used when Supabase is unavailable

## Project Structure

```
PM-Productivity-Tool/
├── index.html              # Main application (single-file React app)
├── README.md               # This file
└── supabase/
    ├── migrations/         # Database migrations
    │   ├── 001_initial_schema.sql
    │   ├── 002_add_managers.sql
    │   └── ...
    └── functions/
        └── send-notification-email/
            └── index.ts    # Email notification Edge Function
```

## Technologies

- **Frontend**: React 18, Tailwind CSS, Lucide Icons
- **Backend**: Supabase (PostgreSQL, Edge Functions, Real-time)
- **Authentication**: Clerk
- **PDF Generation**: jsPDF
- **Hosting**: GitHub Pages (or any static host)

## Support

For issues and feature requests, please open an issue on GitHub.

## License

MIT License - See LICENSE file for details.
