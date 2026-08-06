// Drop-in replacement for the Base44 SDK client.
// Exposes the same surface the app already uses — base44.entities.X,
// base44.auth, base44.functions.invoke, base44.integrations.Core.* — but talks
// to our own Cloudflare backend (functions/api/[[path]].js) instead of Base44.

const TOKEN_KEY = 'apex_access_token';

export const getToken = () =>
  typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
export const setToken = (t) => {
  if (typeof window === 'undefined') return;
  if (t) window.localStorage.setItem(TOKEN_KEY, t);
  else window.localStorage.removeItem(TOKEN_KEY);
};

async function api(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers['authorization'] = `Bearer ${token}`;
  let payload;
  if (isForm) {
    payload = body; // FormData
  } else if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`/api/${path}`, { method, headers, body: payload });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const error = new Error((data && data.message) || `Request failed (${res.status})`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

function buildQuery({ filter, sort, limit } = {}) {
  const params = new URLSearchParams();
  if (filter && Object.keys(filter).length) params.set('filter', JSON.stringify(filter));
  if (sort) params.set('sort', sort);
  if (limit != null) params.set('limit', String(limit));
  const q = params.toString();
  return q ? `?${q}` : '';
}

// One entity accessor: base44.entities.WorkoutPlan.list(...) etc.
function makeEntity(type) {
  return {
    list: (sort, limit) => api(`entities/${type}${buildQuery({ sort, limit })}`),
    filter: (filter, sort, limit) => api(`entities/${type}${buildQuery({ filter, sort, limit })}`),
    get: (id) => api(`entities/${type}/${id}`),
    create: (data) => api(`entities/${type}`, { method: 'POST', body: data }),
    bulkCreate: (arr) => api(`entities/${type}`, { method: 'POST', body: arr }),
    update: (id, data) => api(`entities/${type}/${id}`, { method: 'PUT', body: data }),
    delete: (id) => api(`entities/${type}/${id}`, { method: 'DELETE' }),
    // Base44 exposed realtime subscriptions over a websocket. We don't have realtime
    // yet, so subscribe() is a no-op that returns an unsubscribe function, matching
    // the `const unsub = X.subscribe(cb); return unsub;` usage pattern. Consumers
    // still refetch on their own intervals/invalidations, so data stays fresh.
    subscribe: (_callback) => () => {},
  };
}

const entities = new Proxy(
  {},
  {
    get: (cache, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (!cache[prop]) cache[prop] = makeEntity(prop);
      return cache[prop];
    },
  }
);

const auth = {
  async me() {
    return api('auth/me');
  },
  async updateMe(data) {
    return api('auth/me', { method: 'PUT', body: data });
  },
  async login(email, password) {
    const res = await api('auth/login', { method: 'POST', body: { email, password } });
    setToken(res.token);
    return res.user;
  },
  async register(payload) {
    const res = await api('auth/register', { method: 'POST', body: payload });
    setToken(res.token);
    return res.user;
  },
  async isAuthenticated() {
    if (!getToken()) return false;
    try {
      const res = await api('auth/isAuthenticated');
      return !!res.authenticated;
    } catch {
      return false;
    }
  },
  // Permanently deletes the account and everything it owns (GDPR art. 17).
  async deleteMe() {
    return api('auth/me', { method: 'DELETE' });
  },
  // Machine-readable copy of the account's data (HIPAA §164.524 / GDPR art. 15).
  async exportMyData() {
    return api('auth/export');
  },
  logout(redirectUrl) {
    setToken(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/Login';
    }
  },
  redirectToLogin(nextUrl) {
    if (typeof window !== 'undefined') {
      const next = nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : '';
      window.location.href = `/Login${next}`;
    }
  },
  setToken,
};

const functions = {
  // Base44's SDK returned the raw axios response for functions, so callers
  // destructure `{ data }`. Preserve that contract.
  invoke: async (name, payload) => {
    const data = await api(`functions/${name}`, { method: 'POST', body: payload || {} });
    return { data, status: 200 };
  },
};

const integrations = {
  Core: {
    async UploadFile({ file }) {
      const form = new FormData();
      form.append('file', file);
      return api('integrations/upload', { method: 'POST', body: form, isForm: true });
    },
    async InvokeLLM(payload) {
      return api('integrations/llm', { method: 'POST', body: payload });
    },
    async SendEmail() {
      return { success: true, stubbed: true };
    },
  },
};

// appLogs.logUserInApp(...) is called by NavigationTracker; make it a no-op.
const appLogs = {
  logUserInApp: async () => ({ success: true }),
};

// Base44's hosted "agents" API, reimplemented on our stack: conversations are
// AgentConversation entities and replies come from the backend LLM. Subscribers
// are notified locally after each message round-trip.
const agentSubscribers = new Map(); // conversationId -> Set<callback>

function notifyAgentSubscribers(conversation) {
  const subs = agentSubscribers.get(conversation.id);
  if (subs) subs.forEach((cb) => { try { cb(conversation); } catch { /* subscriber error */ } });
}

const agents = {
  listConversations: async ({ agent_name } = {}) => {
    const filter = agent_name ? { agent_name } : {};
    return api(`entities/AgentConversation${buildQuery({ filter, sort: '-updated_date', limit: 50 })}`);
  },

  createConversation: async ({ agent_name, metadata } = {}) => {
    return api('entities/AgentConversation', {
      method: 'POST',
      body: { agent_name: agent_name || 'trainer_assistant', metadata: metadata || {}, messages: [] },
    });
  },

  // Append the message; when it's a user message, ask the LLM for a reply with
  // the full history as context, persist both, and notify subscribers.
  addMessage: async (conversation, message) => {
    const convoId = conversation.id;
    const current = await api(`entities/AgentConversation/${convoId}`);
    const messages = [...(current.messages || []), { ...message, ts: new Date().toISOString() }];
    let updated = await api(`entities/AgentConversation/${convoId}`, {
      method: 'PUT', body: { messages },
    });
    notifyAgentSubscribers(updated);

    const isContext = typeof message.content === 'string' && message.content.startsWith('System Context:');
    if (message.role === 'user' && !isContext) {
      const history = messages
        .map((m) => `${m.role === 'user' ? (String(m.content).startsWith('System Context:') ? 'CONTEXT' : 'TRAINER') : 'ASSISTANT'}: ${m.content}`)
        .join('\n\n');
      const prompt =
        `You are an expert AI assistant for a personal trainer inside the ApexTraining app (NASM/ISSA-aligned). ` +
        `Help with programming, nutrition strategy, client adherence, and business decisions. Be concise, practical, and specific. ` +
        `Write out any workout or meal plans in full so the trainer can copy them into the planner.\n\n` +
        `Conversation so far:\n${history}\n\nASSISTANT:`;
      let replyText;
      try {
        const out = await integrations.Core.InvokeLLM({ prompt });
        replyText = typeof out === 'string' ? out : out?.text || out?.response || null;
      } catch { replyText = null; }
      if (!replyText) replyText = 'Sorry — the AI assistant is temporarily unavailable. Please try again in a moment.';
      const withReply = [...messages, { role: 'assistant', content: replyText, ts: new Date().toISOString() }];
      updated = await api(`entities/AgentConversation/${convoId}`, {
        method: 'PUT', body: { messages: withReply },
      });
      notifyAgentSubscribers(updated);
    }
    return updated;
  },

  subscribeToConversation: (conversationId, callback) => {
    if (!agentSubscribers.has(conversationId)) agentSubscribers.set(conversationId, new Set());
    agentSubscribers.get(conversationId).add(callback);
    return () => agentSubscribers.get(conversationId)?.delete(callback);
  },
};

export const base44 = { entities, auth, functions, integrations, appLogs, agents };
export default base44;
