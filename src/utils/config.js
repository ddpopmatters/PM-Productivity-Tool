// Application Configuration
export const APP_CONFIG = {
  ORG_NAME: "Population Matters",
  ORG_DOMAIN: "populationmatters.org",
  LOGO_URL: "https://populationmatters.org/wp-content/uploads/2022/03/PM-logo.png",
  DEBUG_MODE: false,
  AUTH_ENABLED: true,
};

// Supabase Configuration
export const SUPABASE_CONFIG = {
  ENABLED: true,
  SUPABASE_URL: "https://jzalaltexmotkusvqoew.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YWxhbHRleG1vdGt1c3Zxb2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDAxMDUsImV4cCI6MjA4MzQxNjEwNX0.hr4GB0m7GU2mWS_MBu_8JykWtmRGY_aI6cPe8jjhTx0",
};

// Team definitions
export const TEAMS = [
  "Advocacy & Influence",
  "Fundraising",
  "Research",
  "Operations",
  "Communications"
];

// Workflow statuses
export const STATUSES = [
  "Not Started",
  "In Progress",
  "Ready for Review",
  "Blocked",
  "Done"
];

// Default seed users (fallback when Supabase unavailable)
export const SEED_USERS = [
  { email: "jameen.kaur@populationmatters.org", name: "Jameen Kaur", team: "Advocacy & Influence", role: "admin" },
  { email: "daniel.davis@populationmatters.org", name: "Dan Davis", team: "Advocacy & Influence", role: "manager" },
  { email: "emma.lewendon-strutt@populationmatters.org", name: "Emma Lewendon-Strutt", team: "Research", role: "member" },
  { email: "josh.hill@populationmatters.org", name: "Josh Hill", team: "Research", role: "member" },
  { email: "francesca.harrison@populationmatters.org", name: "Francesca Harrison", team: "Advocacy & Influence", role: "member" },
  { email: "madeleine.hewitt@populationmatters.org", name: "Madeleine Hewitt", team: "Advocacy & Influence", role: "member" },
  { email: "shweta.shirodkar@populationmatters.org", name: "Shweta Shirodkar", team: "Advocacy & Influence", role: "member" }
];

// Manager hierarchy
export const MANAGERS = [
  {
    name: "Jameen Kaur",
    email: "jameen.kaur@populationmatters.org",
    team: "Advocacy & Influence",
    reports: ["Dan Davis", "Francesca Harrison", "Madeleine Hewitt", "Shweta Shirodkar"]
  },
  {
    name: "Dan Davis",
    email: "daniel.davis@populationmatters.org",
    team: "Advocacy & Influence",
    reports: ["Francesca Harrison"]
  }
];

// User names (for dropdowns and assignments)
export const USERS = [
  "Dan Davis",
  "Jameen Kaur",
  "Emma Lewendon-Strutt",
  "Josh Hill",
  "Francesca Harrison",
  "Madeleine Hewitt",
  "Shweta Shirodkar"
];

// Kanban board statuses
export const KANBAN_STATUSES = [
  "Idea",
  "Discovery",
  "Preparation",
  "In Delivery",
  "Delivered",
  "Impact Assessment",
  "Done"
];

// Timeline types for date selection
export const TIMELINE_TYPES = [
  { value: "date", label: "Specific Date" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" }
];

// Job statuses (simplified 3-stage workflow)
export const JOB_STATUSES = [
  { id: 'todo', label: 'To Do', color: 'graystone' },
  { id: 'in_progress', label: 'In Progress', color: 'blue' },
  { id: 'done', label: 'Done', color: 'green' }
];

// Whiteboard sticky note colors
export const STICKY_COLORS = [
  { name: 'Yellow', bg: '#fef3c7', border: '#fbbf24' },
  { name: 'Blue', bg: '#dbeafe', border: '#3b82f6' },
  { name: 'Green', bg: '#dcfce7', border: '#22c55e' },
  { name: 'Pink', bg: '#fce7f3', border: '#ec4899' },
  { name: 'Purple', bg: '#f3e8ff', border: '#a855f7' },
  { name: 'Orange', bg: '#ffedd5', border: '#f97316' },
  { name: 'White', bg: '#ffffff', border: '#e5e7eb' }
];

// Text formatting options for whiteboards
export const TEXT_SIZES = [
  { name: 'Small', title: '12px', body: '10px' },
  { name: 'Medium', title: '14px', body: '12px' },
  { name: 'Large', title: '18px', body: '14px' },
  { name: 'X-Large', title: '24px', body: '18px' }
];

export const TEXT_COLORS = [
  { name: 'Dark', color: '#1f2937' },
  { name: 'Gray', color: '#6b7280' },
  { name: 'Blue', color: '#1d4ed8' },
  { name: 'Green', color: '#15803d' },
  { name: 'Red', color: '#dc2626' },
  { name: 'Purple', color: '#7c3aed' },
  { name: 'White', color: '#ffffff' }
];

export const FONT_FAMILIES = [
  { name: 'Sans', value: 'system-ui, -apple-system, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'ui-monospace, monospace' },
  { name: 'Handwritten', value: 'Comic Sans MS, cursive' }
];

// CSS class constants
export const SELECT_BASE_CLASSES =
  "dropdown-font rounded-full border border-black bg-white px-4 py-2 text-sm font-normal text-black shadow-[0_0_20px_rgba(15,157,222,0.2)] transition hover:bg-black hover:text-white focus:border-black focus:outline-none focus:ring-4 focus:ring-[#0F9DDE]/40 focus:ring-offset-2 focus:ring-offset-[#CFEBF8] disabled:cursor-not-allowed disabled:opacity-60";

export const INPUT_BASE_CLASSES =
  "w-full rounded-lg border border-graystone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-aqua-200";
