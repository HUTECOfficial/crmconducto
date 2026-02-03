import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mnrfsdrjadretxesjxhu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ucmZzZHJqYWRyZXR4ZXNqeGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDAxNTUsImV4cCI6MjA4NTY3NjE1NX0.kAC452FQXZeSyHMB99OnWuTNNJlg_q6GA_0dn9CcgpI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
