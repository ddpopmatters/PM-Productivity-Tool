// Application Configuration
export const APP_CONFIG = {
  ORG_NAME: "Population Matters",
  ORG_DOMAIN: "populationmatters.org",
  DEBUG_MODE: false,
  AUTH_ENABLED: true,
};

// Supabase Configuration
export const SUPABASE_CONFIG = {
  ENABLED: true,
  SUPABASE_URL: "https://jzalaltexmotkusvqoew.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YWxhbHRleG1vdGt1c3Zxb2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNDEzMzQsImV4cCI6MjA1MTkxNzMzNH0.6ruOMKLvNflkbSPFy7Ks5TpiTf3rKy-5VfphY89x7es",
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
