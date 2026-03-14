import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing x-user-id header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const embedding = body?.embedding

    if (!Array.isArray(embedding) || embedding.length !== 128) {
      return new Response(
        JSON.stringify({ error: 'embedding must be a 128-element number array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get or create user_profile by external_user_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('external_user_id', userId)
      .single()

    let profileId: string
    if (profile) {
      profileId = profile.id
    } else {
      const { data: newProfile, error: insertErr } = await supabase
        .from('user_profiles')
        .insert({ external_user_id: userId, phone_number: 'pending' })
        .select('id')
        .single()
      if (insertErr) throw insertErr
      profileId = newProfile!.id
    }

    const embeddingStr = `[${embedding.join(',')}]`

    // Replace existing embeddings for this user (no unique on user_id)
    await supabase.from('face_embeddings').delete().eq('user_id', profileId)

    const { data: inserted, error } = await supabase
      .from('face_embeddings')
      .insert({ user_id: profileId, embedding: embeddingStr })
      .select('id')
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ id: inserted!.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
