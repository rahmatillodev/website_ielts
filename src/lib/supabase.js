import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log("supabaseUrl" , supabaseUrl)
console.log("supabaseKey" , supabaseKey)
if (import.meta.env) {
  console.log("Prod mode: URL status:", !!supabaseUrl)
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase kalitlari topilmadi. Netlify Environment Variables qismini tekshiring.")
}

const supabase = createClient(supabaseUrl, supabaseKey)
export default supabase;