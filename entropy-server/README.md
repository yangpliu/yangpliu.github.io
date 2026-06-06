# Entropy Online Server

The GitHub Pages site is static, so multiplayer rooms need this Node server
deployed as a separate web service.

## Deploy

One easy option is Render:

1. Create a new Render web service from this repository, or use the root
   `render.yaml` blueprint.
2. Use `npm install` as the build command.
3. Use `npm run entropy-online` as the start command.
4. Set `ALLOWED_ORIGINS` to `https://yangpliu.github.io`.
5. Copy the service URL after deployment.

## Connect GitHub Pages

Set the deployed server URL in `entropy-game/online-config.js`:

```js
window.ENTROPY_ONLINE_API_BASE = "https://your-render-service.onrender.com";
```

Commit and push that change to GitHub Pages. The public page at
`https://yangpliu.github.io/entropy-online.html` will then create and join rooms
through the deployed server.

## Local Test

Run:

```bash
npm run entropy-online
```

Then open:

```text
http://localhost:8787/entropy-online.html
```
