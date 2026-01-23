import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase kalitlari topilmadi. Netlify Environment Variables qismini tekshiring.")
}

const supabase = createClient(supabaseUrl, supabaseKey)
export default supabase