// Requests are served from public/ before this script runs. One that matches
// no file and is not a page navigation lands here and goes straight back to
// asset serving, which answers with Hugo's 404 page. The script exists for the
// cron in wrangler.jsonc: it calls the Worker's own deploy hook, so Workers
// Builds rebuilds the site and a future-dated post goes live.
export default {
  fetch: (request, env) => env.ASSETS.fetch(request),

  async scheduled(controller, env) {
    const response = await fetch(env.DEPLOY_HOOK, { method: "POST" });
    if (!response.ok)
      throw new Error(`deploy hook answered ${response.status}`);
  },
};
