export default {
  async fetch(request, env) {
    const headers = {
      "Access-Control-Allow-Origin": env.ALLOW_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    const gistId = env.GIST_ID;
    const token = env.GITHUB_TOKEN;
    if (!gistId || !token) {
      return new Response(JSON.stringify({ error: "Missing env vars" }), {
        status: 500,
        headers,
      });
    }

    const gistUrl = `https://api.github.com/gists/${gistId}`;

    if (request.method === "GET") {
      const res = await fetch(gistUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "flappy-nexus-worker",
          Accept: "application/vnd.github+json",
        },
      });
      const gist = await res.json();
      const file = gist.files && gist.files["leaderboard.json"];
      const data = file ? JSON.parse(file.content || "[]") : [];
      return new Response(JSON.stringify(data), { headers });
    }

    if (request.method === "POST") {
      const url = new URL(request.url);
      const wipeParam = url.searchParams.get("wipe");
      let body = null;
      try {
        body = await request.json();
      } catch (_) {
        body = null;
      }
      const rawName = body && body.name ? String(body.name).trim() : "";
      const isWipe = (body && (body.wipe === true || rawName.toUpperCase() === "WIPE"))
        || wipeParam === "1"
        || wipeParam === "true";
      const entry = rawName && Number.isFinite(body && body.score)
        ? { name: rawName, score: Number(body.score) }
        : null;

      if (!isWipe && !entry) {
        return new Response(JSON.stringify({ error: "Invalid payload" }), {
          status: 400,
          headers,
        });
      }

      const res = await fetch(gistUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "flappy-nexus-worker",
          Accept: "application/vnd.github+json",
        },
      });
      const gist = await res.json();
      const file = gist.files && gist.files["leaderboard.json"];
      let data = [];
      try {
        data = file ? JSON.parse(file.content || "[]") : [];
      } catch (_) {
        data = [];
      }

      const top = isWipe ? [] : data.concat(entry).sort((a, b) => b.score - a.score).slice(0, 50);

      await fetch(gistUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "flappy-nexus-worker",
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: {
            "leaderboard.json": { content: JSON.stringify(top) },
          },
        }),
      });

      return new Response(JSON.stringify(top), { headers });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  },
};
