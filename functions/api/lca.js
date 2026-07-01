/**
 * Cloudflare Pages Function - API Proxy
 * Proxies requests to the LCA Worker
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  // Worker URL - update this to your actual Worker URL
  const WORKER_URL = env.LCA_WORKER_URL || 'https://lca-ai-proxy.workers.dev';
  
  try {
    // Get the request body
    const body = await request.text();
    
    // Forward to Worker
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: body
    });
    
    // Return the response
    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to proxy request: ' + error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
