export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Let the static assets try first
    const response = await env.ASSETS.fetch(request);

    // If 404 and it's not a static file (no extension), serve index.html
    if (response.status === 404 && !url.pathname.includes('.')) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
    }

    return response;
  }
};
