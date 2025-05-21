export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname;

    // Serve index.html for root path
    if (path === '/') {
      path = '/index.html';
    }

    // Get the file from the site bucket
    const file = await env.ASSETS.fetch(request);
    
    if (file.status === 404) {
      return new Response('Not Found', { status: 404 });
    }

    // Set appropriate content type
    const contentType = getContentType(path);
    const headers = new Headers(file.headers);
    headers.set('Content-Type', contentType);

    return new Response(file.body, {
      status: file.status,
      headers
    });
  }
};

function getContentType(path) {
  if (path.endsWith('.html')) return 'text/html';
  if (path.endsWith('.js')) return 'application/javascript';
  if (path.endsWith('.css')) return 'text/css';
  return 'text/plain';
} 