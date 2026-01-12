import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://miyoovimtupziuehtcxi.supabase.co'
const supabaseKey = 'sb_publishable_7tYoyf8nDNyC9uOyAyMFwA_smS-SExR'

const supabase = createClient(supabaseUrl, supabaseKey)

 export default supabase;