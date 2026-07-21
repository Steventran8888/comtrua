import { createClient } from "@supabase/supabase-js";

// Public anon key — safe to expose in client code. All access is governed
// by Row Level Security policies configured on the Supabase project.
const supabaseUrl = "https://qovcisdgzhwlbaeonliy.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvdmNpc2Rnemh3bGJhZW9ubGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTI5OTcsImV4cCI6MjEwMDIyODk5N30.IjBRj_CEGhPK_ykfoYfxLusEmVGWb2NnJYOuXhKzuVA";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
