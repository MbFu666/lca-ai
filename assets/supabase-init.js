// Shared Supabase bootstrap (review #15: single init instead of six copies).
// Requires @supabase/supabase-js to be loaded before this file.
// Exposes: window.SB_URL, window.SB_KEY (anon), window.sb (client or null).
(function () {
  var SB_URL = 'https://pbisngkepszwzzjivxus.supabase.co';
  // Anon key is public by design; RLS + edge functions enforce authorization.
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiaXNuZ2tlcHN6d3p6aml2eHVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NDQzMjQsImV4cCI6MjA5OTAyMDMyNH0.RV7GaTA7Wo2JIPMChh8j4ro7eXqZA9g_vCOnfjJ1bJY';
  window.SB_URL = SB_URL;
  window.SB_KEY = SB_KEY;
  window.sb = (window.supabase && window.supabase.createClient) ? window.supabase.createClient(SB_URL, SB_KEY) : null;
})();
