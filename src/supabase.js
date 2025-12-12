import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ngchghtqdhdjgzwdmbgv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nY2hnaHRxZGhkamd6d2RtYmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjA4NDIsImV4cCI6MjA3MzMzNjg0Mn0.AGQTRCtheKE6DQ15KF5PSeAr-bFkLer3pgMUKThJY-I'

export const supabase = createClient(supabaseUrl, supabaseKey)