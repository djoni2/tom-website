import POLLS from './polls.json';

// Only these origins get a successful CORS response, so the vote endpoint
// can't be casually hit from an unrelated site. Includes the dev blog
// (dev.timesofmadeira.com, per dev_publish_result.txt) so polls can be
// verified there before main-1 is merged to main.
const ALLOWED_ORIGINS = [
  'https://www.timesofmadeira.com',
  'https://timesofmadeira.com',
  'https://dev.timesofmadeira.com'
];

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin'
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(origin))
  });
}

async function hashIp(ip, salt) {
  if (!ip) return null;
  const data = new TextEncoder().encode(salt + ip);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getResults(db, pollId, poll, voterId) {
  const { results } = await db
    .prepare('SELECT option_key, COUNT(*) as n FROM votes WHERE poll_id = ? GROUP BY option_key')
    .bind(pollId)
    .all();
  const counts = {};
  results.forEach((row) => { counts[row.option_key] = row.n; });

  const options = poll.options.map((o) => ({ key: o.key, label: o.label, votes: counts[o.key] || 0 }));
  const total = options.reduce((sum, o) => sum + o.votes, 0);

  let yourOption = null;
  if (voterId) {
    const row = await db
      .prepare('SELECT option_key FROM votes WHERE poll_id = ? AND voter_id = ?')
      .bind(pollId, voterId)
      .first();
    if (row) yourOption = row.option_key;
  }

  return { question: poll.question, options, total, voted: !!yourOption, yourOption };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean); // ['polls', ':id', 'vote'?]

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (parts[0] !== 'polls' || !parts[1]) {
      return json({ error: 'not_found' }, 404, origin);
    }

    const pollId = parts[1];
    const poll = POLLS[pollId];
    if (!poll) return json({ error: 'not_found' }, 404, origin);

    // GET /polls/:id?voterId=...
    if (request.method === 'GET' && parts.length === 2) {
      const voterId = url.searchParams.get('voterId') || '';
      const data = await getResults(env.DB, pollId, poll, voterId);
      return json(data, 200, origin);
    }

    // POST /polls/:id/vote
    if (request.method === 'POST' && parts.length === 3 && parts[2] === 'vote') {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: 'bad_request' }, 400, origin);
      }

      const option = body && body.option;
      const voterId = body && body.voterId;
      if (!option || !voterId || typeof voterId !== 'string' || voterId.length > 100) {
        return json({ error: 'bad_request' }, 400, origin);
      }
      if (!poll.options.some((o) => o.key === option)) {
        return json({ error: 'bad_request' }, 400, origin);
      }

      const ipHash = await hashIp(request.headers.get('CF-Connecting-IP'), env.IP_HASH_SALT || 'tom-polls');

      try {
        await env.DB
          .prepare('INSERT INTO votes (poll_id, option_key, voter_id, ip_hash) VALUES (?, ?, ?, ?)')
          .bind(pollId, option, voterId, ipHash)
          .run();
      } catch (e) {
        if (!String(e && e.message).includes('UNIQUE')) {
          // Not the UNIQUE(poll_id, voter_id) violation we expect for a repeat
          // voter -- a real DB problem, so say so instead of lying "already_voted".
          return json({ error: 'server_error' }, 500, origin);
        }
        // This voter already has a row for this poll.
        try {
          const data = await getResults(env.DB, pollId, poll, voterId);
          return json(Object.assign({ error: 'already_voted' }, data), 409, origin);
        } catch (e2) {
          return json({ error: 'server_error' }, 500, origin);
        }
      }

      try {
        const data = await getResults(env.DB, pollId, poll, voterId);
        return json(data, 201, origin);
      } catch (e) {
        return json({ error: 'server_error' }, 500, origin);
      }
    }

    return json({ error: 'not_found' }, 404, origin);
  }
};
