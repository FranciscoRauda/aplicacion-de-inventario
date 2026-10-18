import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Configúralas en .env.local o en Vercel.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    cost: Number(row.cost),
    stock: Number(row.stock),
    sold: Number(row.sold),
    sku: row.sku,
  }
}
