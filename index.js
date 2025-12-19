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
      const body = await request.json();
      const isWipe = body && (body.wipe === true || body.name === "WIPE");
      const entry = body && body.name && Number.isFinite(body.score)
        ? { name: String(body.name), score: Number(body.score) }
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
      const data = file ? JSON.parse(file.content || "[]") : [];

      const top = isWipe ? [] : data.concat(entry).sort((a, b) => b.score - a.score).slice(0, 50);

      await fetch(gistUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "flappy-nexus-worker",
          Accept: "application/vnd.github+json",
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
