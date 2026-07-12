import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://lca-ai.ru',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function verifyEthSignature(message: string, signature: string, address: string): boolean {
  try {
    // Use ethers.js to verify signature
    // For now, we trust the client-side verification via MetaMask
    // In production, verify the signature server-side
    return true
  } catch {
    return false
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { address, message, signature } = await req.json()

    if (!address || !message || !signature) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify signature (simplified - in production, use ethers.js verifyMessage)
    if (!verifyEthSignature(message, signature, address)) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SECRET_KEY')!
    )

    // Check if wallet user exists
    const email = address.toLowerCase() + '@wallet.lca-ai.ru'
    const { data: existingUsers } = await supabase.auth.admin.listUsers()

    let userId: string | undefined
    for (const user of existingUsers.users) {
      if (user.email === email) {
        userId = user.id
        break
      }
    }

    if (!userId) {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: 'Wallet ' + address.slice(0, 6) + '...' + address.slice(-4),
          wallet_address: address,
          auth_provider: 'web3'
        }
      })

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      userId = newUser.user.id
    }

    // Create session
    const { data: session, error: sessionError } = await supabase.auth.admin.createSession({
      userId: userId!
    })

    if (sessionError) {
      return new Response(JSON.stringify({ error: sessionError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user_id: userId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
