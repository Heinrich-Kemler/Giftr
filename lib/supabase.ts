// SERVER-SIDE ONLY - never import in a client component.
// All data access flows through API routes using the service-role client.
// The client is created lazily on first use so that importing this module
// never throws when environment variables are missing, keeping
// 'npm run build' working with no env vars set.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { config } from "./config"

// Cached service-role client. Created on first call to getServiceClient().
let serviceClient: SupabaseClient | null = null

// Returns the server-side admin (service-role) Supabase client used by API
// routes. The client is instantiated lazily and memoised so that the module
// can be imported safely without any environment variables present.
export function getServiceClient(): SupabaseClient {
  if (serviceClient === null) {
    serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return serviceClient
}
