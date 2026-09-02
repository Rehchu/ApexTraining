// ApexTraining backend — single Cloudflare Pages Function handling all /api/* routes.
// Bindings (wrangler.jsonc / Pages dashboard):
//   env.DB          D1 database
//   env.FILES       R2 bucket (optional; uploads fall back to data URLs if absent)
//   env.AUTH_SECRET string used to sign JWTs
//   env.PUBLIC_R2_URL  optional public base URL for the R2 bucket
//   env.LLM_API_KEY / env.LLM_MODEL  optional Anthropic key to enable InvokeLLM

const enc = new TextEncoder();

/* ------------------------------- helpers -------------------------------- */

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const err = (message, status = 400, extra = {}) =>
  json({ message, detail: message, error_type: 'HTTPException', ...extra }, status);

const nowISO = () => new Date().toISOString();

function uid() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

const b64url = (bytes) => {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64urlToBytes = (str) => {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4 ? 4 - (str.length % 4) : 0;
  const bin = atob(str + '='.repeat(pad));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/* ------------------------------- auth ----------------------------------- */

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  );
  return `pbkdf2$${iterations}$${b64url(salt)}$${b64url(bits)}`;
}

async function verifyPassword(password, stored) {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'pbkdf2') return false;
    const salt = b64urlToBytes(saltB64);
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: Number(iterStr), hash: 'SHA-256' },
      key,
      256
    );
    return b64url(bits) === hashB64;
  } catch {
    return false;
  }
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

async function signToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 };
  const p1 = b64url(enc.encode(JSON.stringify(header)));
  const p2 = b64url(enc.encode(JSON.stringify(body)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${p1}.${p2}`));
  return `${p1}.${p2}.${b64url(sig)}`;
}

async function verifyToken(token, secret) {
  try {
    const [p1, p2, sig] = token.split('.');
    if (!p1 || !p2 || !sig) return null;
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sig), enc.encode(`${p1}.${p2}`));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p2)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function bearer(request) {
  const h = request.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function userRow(row) {
  if (!row) return null;
  const data = JSON.parse(row.data || '{}');
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    user_type: row.user_type,
    created_date: row.created_date,
    updated_date: row.updated_date,
    ...data,
  };
}

// Exactly the emails listed in ADMIN_EMAILS are admins (comma-separated env var).
// Checked on every request so promotions/demotions apply without re-registering.
function resolveRole(env, email, storedRole) {
  const admins = (env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (admins.length > 0) return admins.includes(email.toLowerCase()) ? 'admin' : (storedRole === 'admin' ? 'user' : storedRole);
  return storedRole; // no allowlist configured — fall back to stored role
}

async function currentUser(request, env) {
  const token = bearer(request);
  if (!token) return null;
  const payload = await verifyToken(token, env.AUTH_SECRET || 'dev-insecure-secret');
  if (!payload) return null;
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.sub).first();
  const u = userRow(row);
  if (u) u.role = resolveRole(env, u.email, u.role);
  return u;
}

/* ------------------------------ entities -------------------------------- */

function rowToEntity(row) {
  const data = JSON.parse(row.data || '{}');
  return {
    ...data,
    id: row.id,
    created_by: row.created_by,
    created_date: row.created_date,
    updated_date: row.updated_date,
  };
}

const COLUMN_FIELDS = new Set(['id', 'created_by', 'created_date', 'updated_date']);

function fieldExpr(field) {
  if (COLUMN_FIELDS.has(field)) return field;
  return `json_extract(data, '$.${field.replace(/'/g, "''")}')`;
}

// Entity types every authenticated user of the app may read (shared/global content).
const SHARED_TYPES = new Set([
  'CommunityPost', 'TrainerCommunityPost', 'Recipe',
  'FitnessTemplate', 'MealPlanTemplate', 'WaitingList', 'BetaKey',
  'CoachingExercise',
]);

// Entity types that carry protected health information. Reads of these are
// written to the audit trail (HIPAA §164.312(b) — record access to ePHI).
const PHI_TYPES = new Set([
  'Client', 'ClientNote', 'ProgressLog', 'JournalEntry', 'SleepLog', 'StressLog',
  'Contract', 'FormCheck', 'ReadinessLog', 'HealthMetric', 'ClientNotebookPage',
]);

// Resources (files, forms, guides) are trainer→client content: a user sees
// their own resources plus everything shared by their own trainer — never
// other trainers' material. Returns extra OR-terms for ownershipClause.
async function trainerResourceTerms(env, user) {
  const { results } = await env.DB.prepare(
    `SELECT data FROM entities WHERE entity_type='Client' AND (json_extract(data,'$.email') = ? OR json_extract(data,'$.user_id') = ?)`
  ).bind(user.email, user.id).all();
  const trainerIds = [...new Set(results
    .map((r) => { try { return JSON.parse(r.data).trainer_id; } catch { return null; } })
    .filter(Boolean))];
  return trainerIds.map((tid) => ({ sql: "json_extract(data,'$.trainer_id') = ?", bind: tid }));
}

// Ownership scoping: admins see everything; everyone else only rows they own —
// rows they created, rows assigned to them as trainer, or rows about them as
// client/user (their client-record id, user id, or email).
async function ownershipClause(env, user) {
  if (!user || user.role === 'admin') return null;
  const ors = [
    { sql: 'created_by = ?', bind: user.email },
    { sql: "json_extract(data,'$.trainer_id') = ?", bind: user.id },
    { sql: "json_extract(data,'$.user_id') = ?", bind: user.id },
    { sql: "json_extract(data,'$.email') = ?", bind: user.email },
    { sql: "json_extract(data,'$.sender_id') = ?", bind: user.id },
    { sql: "json_extract(data,'$.receiver_id') = ?", bind: user.id },
  ];
  const { results } = await env.DB.prepare(
    `SELECT id FROM entities WHERE entity_type='Client' AND (json_extract(data,'$.email') = ? OR json_extract(data,'$.user_id') = ?)`
  ).bind(user.email, user.id).all();
  for (const row of results) {
    ors.push({ sql: "json_extract(data,'$.client_id') = ?", bind: row.id });
    ors.push({ sql: 'id = ?', bind: row.id });
  }
  return {
    sql: `(${ors.map((o) => o.sql).join(' OR ')})`,
    binds: ors.map((o) => o.bind),
  };
}

/* --------------------------- audit logging ------------------------------ */
// HIPAA-aligned audit trail (45 CFR §164.312(b)): records who did what to
// which record, when, and from where. Fire-and-forget so it never blocks
// a request; failures are swallowed (logging must not break the app).
/* ------------------------------- billing -------------------------------- */
// Subscription plans. `clientLimit: 0` means unlimited. Prices live in Stripe
// and are resolved by lookup key, so pricing can change there without a deploy.
const PLANS = {
  starter: { name: 'Starter', clientLimit: 10, monthly: 9, annual: 90 },
  pro: { name: 'Pro', clientLimit: 40, monthly: 19, annual: 190 },
  studio: { name: 'Studio', clientLimit: 0, monthly: 39, annual: 390 },
};
const TRIAL_DAYS = 14;
// Statuses that still grant access (Stripe keeps a subscription usable while a
// payment retries, so 'past_due' is deliberately included).
const ACTIVE_SUB_STATUSES = new Set(['active', 'trialing', 'past_due']);

// Minimal Stripe REST client — the official SDK is Node-oriented, and all we
// need is form-encoded POSTs against the API.
async function stripe(env, path, { method = 'POST', data } = {}) {
  if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured.');
  const body = data ? new URLSearchParams(flattenForStripe(data)).toString() : undefined;
  const resp = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });
  const out = await resp.json();
  if (!resp.ok) throw new Error(out?.error?.message || `Stripe error ${resp.status}`);
  return out;
}

// Stripe wants bracketed keys for nested data: metadata[plan], line_items[0][price].
function flattenForStripe(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => {
      if (item !== null && typeof item === 'object') flattenForStripe(item, `${key}[${i}]`, out);
      else out[`${key}[${i}]`] = String(item);
    });
    else if (typeof v === 'object') flattenForStripe(v, key, out);
    else out[key] = String(v);
  }
  return out;
}

// Verifies the Stripe-Signature header (HMAC-SHA256 over "timestamp.payload").
// Without this, anyone could POST fake "subscription active" events to us.
async function verifyStripeSignature(rawBody, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=').map((s) => s.trim())));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  // Reject events older than 5 minutes to blunt replay attacks.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${rawBody}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  // Constant-time compare.
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

// Reads subscription state off a user record and decides what they may do.
function subscriptionState(user) {
  const b = user?.billing || {};

  // Beta-key trainers are comped for life: full access, unlimited clients, and
  // they are never shown a paywall or asked for a card.
  if (user?.beta_key_used) {
    return {
      status: 'comped', plan: 'studio', planName: 'Founding Trainer',
      clientLimit: 0, active: true, onTrial: false, comped: true,
      trialEndsAt: null, currentPeriodEnd: null, cancelAtPeriodEnd: false,
      customerId: b.customer_id || null,
    };
  }

  const status = b.status || 'none';
  // Trainers who signed up before billing existed have no stored trial date.
  // Derive one from their account age so nobody is locked out by an upgrade.
  const trialEndsRaw = b.trial_ends_at
    || (user?.created_date ? new Date(new Date(user.created_date).getTime() + TRIAL_DAYS * 86400000).toISOString() : null);
  const trialEndsAt = trialEndsRaw ? new Date(trialEndsRaw).getTime() : null;
  const onTrial = status === 'none' && trialEndsAt != null && trialEndsAt > Date.now();
  const active = ACTIVE_SUB_STATUSES.has(status) || onTrial;
  const plan = b.plan && PLANS[b.plan] ? b.plan : null;
  return {
    status: onTrial ? 'trialing' : status,
    plan,
    planName: plan ? PLANS[plan].name : onTrial ? 'Free trial' : null,
    clientLimit: plan ? PLANS[plan].clientLimit : onTrial ? PLANS.starter.clientLimit : 0,
    active,
    onTrial,
    trialEndsAt: trialEndsRaw || null,
    currentPeriodEnd: b.current_period_end || null,
    cancelAtPeriodEnd: !!b.cancel_at_period_end,
    comped: false,
    customerId: b.customer_id || null,
  };
}

// Persists billing fields onto the user's JSON blob.
async function saveBilling(env, userId, patch) {
  const row = await env.DB.prepare('SELECT data FROM users WHERE id = ?').bind(userId).first();
  if (!row) return false;
  let data = {};
  try { data = JSON.parse(row.data || '{}'); } catch { /* corrupt blob — start fresh */ }
  data.billing = { ...(data.billing || {}), ...patch };
  await env.DB.prepare('UPDATE users SET data = ?, updated_date = ? WHERE id = ?')
    .bind(JSON.stringify(data), nowISO(), userId).run();
  return true;
}

async function audit(env, { actor, action, target, targetId, detail, request }) {
  try {
    const ip = request?.headers?.get('cf-connecting-ip') || '';
    await env.DB.prepare(
      `INSERT INTO audit_log (id, actor, action, target, target_id, detail, ip, created_date)
       VALUES (?,?,?,?,?,?,?,?)`
    ).bind(
      uid(),
      actor || 'anonymous',
      action,
      target || '',
      targetId || '',
      detail ? String(detail).slice(0, 300) : '',
      ip,
      nowISO()
    ).run();
  } catch { /* never block the request on audit failure */ }
}

// The single source of truth for "which rows of `type` may `user` touch".
// Used by BOTH the list endpoint and single-record GET/PUT/DELETE so that
// fetching a record by its id can never bypass the list's access rules.
// Returns null when no restriction applies (admins, shared content types).
async function entityScope(env, type, user) {
  if (SHARED_TYPES.has(type)) return null;
  const scope = await ownershipClause(env, user);
  if (!scope) return null; // admin
  let sql = scope.sql;
  const binds = [...scope.binds];
  if (type === 'Resource') {
    const extra = await trainerResourceTerms(env, user);
    if (extra.length) {
      sql = `(${sql} OR ${extra.map((e) => e.sql).join(' OR ')})`;
      binds.push(...extra.map((e) => e.bind));
    }
  }
  return { sql, binds };
}

// Fetch one entity only if the user is allowed to see it. Returns null when the
// row is missing OR out of scope — callers answer 404 either way, so an
// attacker cannot probe for the existence of other users' records.
async function getScopedEntity(env, type, id, user) {
  const scope = await entityScope(env, type, user);
  const sql = `SELECT * FROM entities WHERE id = ? AND entity_type = ?${scope ? ` AND ${scope.sql}` : ''}`;
  const binds = scope ? [id, type, ...scope.binds] : [id, type];
  return env.DB.prepare(sql).bind(...binds).first();
}

async function listEntities(env, type, { filter = {}, sort, limit, user }) {
  const where = ['entity_type = ?'];
  const binds = [type];
  {
    const scope = await entityScope(env, type, user);
    if (scope) {
      where.push(scope.sql);
      binds.push(...scope.binds);
    }
  }
  for (const [k, v] of Object.entries(filter || {})) {
    if (v === undefined) continue;
    if (v === null) {
      where.push(`${fieldExpr(k)} IS NULL`);
    } else if (Array.isArray(v)) {
      if (v.length === 0) { where.push('1 = 0'); continue; }
      where.push(`${fieldExpr(k)} IN (${v.map(() => '?').join(',')})`);
      binds.push(...v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)));
    } else {
      where.push(`${fieldExpr(k)} = ?`);
      binds.push(typeof v === 'object' ? JSON.stringify(v) : v);
    }
  }
  let sql = `SELECT * FROM entities WHERE ${where.join(' AND ')}`;
  let orderField = 'created_date';
  let dir = 'DESC';
  if (sort) {
    if (sort.startsWith('-')) { orderField = sort.slice(1); dir = 'DESC'; }
    else { orderField = sort; dir = 'ASC'; }
  }
  sql += ` ORDER BY ${fieldExpr(orderField)} ${dir}`;
  if (limit) { sql += ' LIMIT ?'; binds.push(Number(limit)); }
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return results.map(rowToEntity);
}

/* ------------------------------ functions ------------------------------- */

async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) return { success: false, error: 'RESEND_API_KEY not configured' };
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || 'ApexCoach <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });
  const out = await resp.json();
  if (!resp.ok) return { success: false, error: out?.message || `Resend error ${resp.status}` };
  return { success: true, id: out?.id };
}

const EDB_HOST = 'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com';
async function edbFetch(env, path) {
  if (!env.EXERCISEDB_API_KEY) return { success: false, error: 'EXERCISEDB_API_KEY not configured' };
  const resp = await fetch(`https://${EDB_HOST}${path}`, {
    headers: {
      'x-rapidapi-key': env.EXERCISEDB_API_KEY,
      'x-rapidapi-host': EDB_HOST,
    },
  });
  if (!resp.ok) return { success: false, error: `ExerciseDB ${resp.status}` };
  return resp.json();
}

const emailShell = (title, bodyHtml) => `
  <div style="font-family:Inter,Arial,sans-serif;background:#F5F7FA;padding:32px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #E4E9F0;padding:32px">
      <h2 style="margin:0 0 4px;color:#0F172A">ApexCoach</h2>
      <h3 style="margin:0 0 16px;color:#059669">${title}</h3>
      <div style="color:#334155;font-size:15px;line-height:1.6">${bodyHtml}</div>
    </div>
  </div>`;

async function runFunction(name, payload, ctx) {
  const { env, user, url } = ctx;
  switch (name) {
    case 'getAppLogo':
      return { logo_url: null };

    case 'getUserById': {
      const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload?.userId || payload?.id).first();
      return { user: userRow(row) };
    }

    case 'submitContact': {
      await env.DB.prepare(
        'INSERT INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?)'
      ).bind(uid(), 'ContactMessage', JSON.stringify(payload || {}), user?.id || null, nowISO(), nowISO()).run();
      return { success: true };
    }

    /* ---- Beta keys ---- */
    case 'claimBetaKey': {
      if (!user) return { success: false, error: 'Not logged in' };
      const key = String(payload?.key || payload?.betaKey || '').trim().toUpperCase();
      if (!key) return { success: false, error: 'No key provided' };
      const row = await env.DB.prepare(
        `SELECT * FROM entities WHERE entity_type='BetaKey' AND upper(json_extract(data,'$.key')) = ? LIMIT 1`
      ).bind(key).first();
      if (!row) return { success: false, error: 'Invalid beta key' };
      const data = JSON.parse(row.data);
      if (data.status === 'assigned' && data.trainer_id && data.trainer_id !== user.id) {
        return { success: false, error: 'This key is already in use by another account' };
      }
      if (data.assigned_email && data.assigned_email.toLowerCase() !== user.email.toLowerCase()) {
        return { success: false, error: 'This key is reserved for a different email address' };
      }
      const updated = { ...data, status: 'assigned', trainer_id: user.id, claimed_date: nowISO() };
      await env.DB.prepare('UPDATE entities SET data=?, updated_date=? WHERE id=?')
        .bind(JSON.stringify(updated), nowISO(), row.id).run();
      // Mark on the user
      const urow = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first();
      const udata = JSON.parse(urow.data || '{}');
      udata.beta_key_used = true;
      udata.beta_key_verified = true;
      udata.beta_key = key;
      await env.DB.prepare('UPDATE users SET data=?, updated_date=? WHERE id=?')
        .bind(JSON.stringify(udata), nowISO(), user.id).run();
      return { success: true, message: 'Beta access granted.' };
    }

    /* ---- Email ---- */
    case 'sendInviteEmail': {
      const to = payload?.clientEmail || payload?.email;
      if (!to) return { success: false, error: 'No recipient' };
      const signup = payload?.signupLink || url.origin + '/Login';
      return sendEmail(env, {
        to,
        subject: `${payload?.trainerName || 'Your trainer'} invited you to ApexCoach`,
        html: emailShell('You\'re invited!', `
          <p>Hi ${payload?.clientName || 'there'},</p>
          <p><strong>${payload?.trainerName || 'Your trainer'}</strong> has invited you to train together on ApexCoach — workouts, nutrition, habits, and progress tracking in one place.</p>
          <p style="margin:24px 0"><a href="${signup}" style="background:#059669;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Create your account</a></p>
          <p>See you in the app!</p>`),
      });
    }

    case 'sendResourceEmail': {
      const to = payload?.to || payload?.clientEmail || payload?.email;
      if (!to) return { success: false, error: 'No recipient' };
      return sendEmail(env, {
        to,
        subject: payload?.subject || 'New resource from your trainer',
        html: emailShell(payload?.title || 'New resource', `
          <p>${payload?.message || 'Your trainer shared a resource with you.'}</p>
          ${payload?.link ? `<p><a href="${payload.link}" style="color:#059669">Open resource</a></p>` : ''}`),
      });
    }

    case 'sendSessionReminder': {
      const to = payload?.clientEmail || payload?.to;
      if (!to) return { success: false, error: 'No recipient' };
      return sendEmail(env, {
        to,
        subject: 'Session reminder — ApexCoach',
        html: emailShell('Upcoming session', `
          <p>Reminder: you have a training session on <strong>${payload?.date || ''} ${payload?.time || ''}</strong>.</p>
          ${payload?.notes ? `<p>${payload.notes}</p>` : ''}`),
      });
    }

    case 'onNewClientOnboardingEmail':
      return { success: true };

    /* ---- Food search (USDA FoodData Central) ---- */
    case 'searchFoods': {
      if (!env.USDA_API_KEY) return { foods: [] };
      const q = encodeURIComponent(payload?.query || '');
      const size = Math.min(Number(payload?.pageSize) || 10, 25);
      const resp = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${env.USDA_API_KEY}&query=${q}&pageSize=${size}&dataType=Foundation,SR%20Legacy,Branded`
      );
      if (!resp.ok) return { foods: [], error: `USDA ${resp.status}` };
      const out = await resp.json();
      const nut = (f, ids) => {
        const n = (f.foodNutrients || []).find((x) => ids.includes(x.nutrientId));
        return n ? Math.round(n.value) : 0;
      };
      const foods = (out.foods || []).map((f) => ({
        name: f.description,
        brand: f.brandOwner || null,
        calories: nut(f, [1008, 2047, 2048]),
        protein: nut(f, [1003]),
        carbs: nut(f, [1005]),
        fat: nut(f, [1004]),
        serving: f.servingSize ? `${f.servingSize}${f.servingSizeUnit || 'g'}` : '100g',
        fdcId: f.fdcId,
      }));
      return { foods };
    }

    /* ---- Exercise search (ExerciseDB w/ videos & images, AscendAPI) ---- */
    case 'searchExercises': {
      const out = await edbFetch(env, `/api/v1/exercises/search?search=${encodeURIComponent(payload?.search || payload?.query || '')}`);
      if (!out?.success) return { exercises: [], error: out?.error };
      const exercises = (out.data || []).map((e) => ({
        id: e.exerciseId,
        exerciseId: e.exerciseId,
        name: e.name,
        gifUrl: e.imageUrl, // legacy field name used across the UI
        imageUrl: e.imageUrl,
      }));
      return { exercises };
    }

    case 'getExerciseById': {
      const out = await edbFetch(env, `/api/v1/exercises/${encodeURIComponent(payload?.id || payload?.exerciseId || '')}`);
      if (!out?.success) return { exercise: null, error: out?.error };
      const d = out.data || {};
      return {
        exercise: {
          id: d.exerciseId,
          exerciseId: d.exerciseId,
          name: d.name,
          gifUrl: d.imageUrl,
          imageUrl: d.imageUrl,
          imageUrls: d.imageUrls,
          videoUrl: d.videoUrl,
          bodyPart: (d.bodyParts || [])[0]?.toLowerCase(),
          bodyParts: d.bodyParts,
          target: (d.targetMuscles || [])[0]?.toLowerCase(),
          targetMuscles: d.targetMuscles,
          secondaryMuscles: d.secondaryMuscles,
          equipment: (d.equipments || [])[0]?.toLowerCase(),
          equipments: d.equipments,
          exerciseType: d.exerciseType,
          overview: d.overview,
          instructions: d.instructions,
        },
      };
    }

    case 'getExerciseData': {
      // Reference lists (muscles, body parts, equipment, exercise types)
      const kind = payload?.kind || payload?.type || 'bodyparts';
      const path = { muscles: '/api/v1/muscles', bodyparts: '/api/v1/bodyparts', equipments: '/api/v1/equipments', exercisetypes: '/api/v1/exercisetypes' }[kind];
      if (!path) return { data: [] };
      const out = await edbFetch(env, path);
      return { data: out?.data || [] };
    }

    /* ---- Web Push (subscriptions; VAPID) ---- */
    case 'webPush': {
      if (!user) return { success: false, error: 'Not logged in' };
      const action = payload?.action;
      if (action === 'getPublicKey') return { publicKey: env.VAPID_PUBLIC_KEY || null };
      if (action === 'subscribe') {
        const sub = payload?.subscription;
        if (!sub?.endpoint) return { success: false, error: 'No subscription' };
        const existing = await env.DB.prepare(
          `SELECT id FROM entities WHERE entity_type='PushSubscription' AND json_extract(data,'$.endpoint') = ? LIMIT 1`
        ).bind(sub.endpoint).first();
        const data = JSON.stringify({ ...sub, user_id: user.id, user_email: user.email });
        if (existing) {
          await env.DB.prepare('UPDATE entities SET data=?, updated_date=? WHERE id=?').bind(data, nowISO(), existing.id).run();
        } else {
          await env.DB.prepare(
            'INSERT INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?)'
          ).bind(uid(), 'PushSubscription', data, user.email, nowISO(), nowISO()).run();
        }
        return { success: true };
      }
      if (action === 'unsubscribe') {
        const endpoint = payload?.subscription?.endpoint;
        if (endpoint) {
          await env.DB.prepare(
            `DELETE FROM entities WHERE entity_type='PushSubscription' AND json_extract(data,'$.endpoint') = ?`
          ).bind(endpoint).run();
        }
        return { success: true };
      }
      if (action === 'test' || action === 'sendTest') {
        return { success: true, note: 'Push delivery ships with the notification service.' };
      }
      return { success: false, error: `Unknown webPush action: ${action}` };
    }

    case 'aiVoiceCoach': {
      // Text-based post-workout analysis (the voice UI was removed; this powers
      // the "AI analysis" card after logging a workout).
      const wd = payload?.workoutData || {};
      const result = await invokeLLM(
        {
          prompt: `A client just completed a workout: ${JSON.stringify(wd)}. Client profile: ${JSON.stringify({
            goals: ctx.user?.goals, fitness_level: ctx.user?.fitness_level,
          })}. Give a short post-workout analysis.`,
          response_json_schema: {
            type: 'object',
            properties: {
              performance: { type: 'string', description: 'One sentence on how the session went' },
              recovery: { type: 'string', description: 'One sentence of recovery advice' },
              nutrition: { type: 'string', description: 'One sentence on what to eat now' },
              highlight: { type: 'string', description: 'One short encouraging highlight' },
            },
          },
        },
        env
      );
      if (result && !result.__stub && typeof result === 'object') {
        return { success: true, data: result };
      }
      return { success: false };
    }

    /* ---- AI personalized recovery plan ---- */
    case 'aiPersonalizedPlans': {
      const plan = await invokeLLM(
        {
          prompt: `Create a personalized recovery plan for this client. Profile: ${JSON.stringify(payload?.clientProfile || {})}. Recent workout activity count: ${(payload?.workoutLogs || []).length}. Give practical, specific guidance for each area.`,
          response_json_schema: {
            type: 'object',
            properties: {
              sleep_optimization: { type: 'string' },
              nutrition_timing: { type: 'string' },
              stress_management: { type: 'string' },
              active_recovery_days: { type: 'string' },
              deload_schedule: { type: 'string' },
              mobility_routine: { type: 'array', items: { type: 'string' } },
              expected_outcomes: { type: 'string' },
            },
          },
        },
        env
      );
      if (plan && !plan.__stub && typeof plan === 'object') return { success: true, data: plan };
      return { success: false };
    }

    /* ---- Journal: rotating reflection prompt ---- */
    case 'generateJournalPrompt': {
      const PROMPTS = [
        'What was your biggest win today, and what is one thing you want to improve tomorrow?',
        'How did your body feel during training today? What was your energy like?',
        "What is one healthy choice you made today that you're proud of?",
        'Describe a moment today when you felt strong or capable.',
        'What got in the way of your goals today, and how will you handle it next time?',
        'How well did you sleep, and how did it affect your day?',
        'What are you grateful for in your fitness journey right now?',
        'Rate your stress today 1-10 and note what drove it.',
        'What is one small habit you want to lock in this week?',
        'If today had a theme, what would it be and why?',
      ];
      return { prompt: PROMPTS[Math.floor(Math.random() * PROMPTS.length)] };
    }

    /* ---- Journal summary: AI trainer-facing summary + sentiment,
            written back onto the JournalEntry ---- */
    case 'summarizeJournalEntry': {
      if (!user) return { success: false, error: 'Not logged in' };
      const entryId = payload?.entry_id;
      const content = String(payload?.content || '').slice(0, 4000);
      if (!entryId || !content.trim()) return { success: false };

      const out = await invokeLLM(
        {
          prompt: `A fitness client wrote this journal entry. Summarize it for their trainer in 1-2 sentences (third person, professional, flag anything the trainer should follow up on), and classify overall sentiment. Entry: """${content}"""`,
          response_json_schema: {
            type: 'object',
            properties: {
              trainer_summary: { type: 'string' },
              sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
            },
          },
        },
        env
      );
      if (!out || out.__stub || !out.trainer_summary) return { success: false };

      const row = await env.DB.prepare(
        `SELECT data FROM entities WHERE id=? AND entity_type='JournalEntry' AND created_by=? LIMIT 1`
      ).bind(entryId, user.email).first();
      if (!row) return { success: false };
      let data; try { data = JSON.parse(row.data); } catch { return { success: false }; }
      data.trainer_summary = out.trainer_summary;
      data.sentiment = out.sentiment || 'neutral';
      await env.DB.prepare('UPDATE entities SET data=?, updated_date=? WHERE id=?')
        .bind(JSON.stringify(data), nowISO(), entryId).run();
      return { success: true };
    }

    /* ---- Recovery prescription: AI protocol from today's sleep/stress logs,
            stored as an AI_SYSTEM ClientNote the Recovery page renders ---- */
    case 'generateRecoveryPrescription': {
      if (!user) return { success: false, error: 'Not logged in' };
      const clientId = payload?.client_id || user.id;
      const date = payload?.date || nowISO().split('T')[0];

      // Pull today's readiness logs for this client.
      const pick = async (type) => {
        const row = await env.DB.prepare(
          `SELECT data FROM entities WHERE entity_type=? AND json_extract(data,'$.client_id')=? AND json_extract(data,'$.date')=? ORDER BY created_date DESC LIMIT 1`
        ).bind(type, clientId, date).first();
        try { return row ? JSON.parse(row.data) : null; } catch { return null; }
      };
      const sleep = await pick('SleepLog');
      const stress = await pick('StressLog');

      const result = await invokeLLM(
        {
          prompt: `You are a certified recovery coach (NASM/ISSA aligned). Write a concise same-day recovery protocol in Markdown for a client based on today's readiness data. Data: sleep hours=${sleep?.hours_slept ?? 'unknown'}, sleep quality (1-5)=${sleep?.quality_rating ?? 'unknown'}, stress level (1-10)=${stress?.stress_level ?? 'unknown'}, stressors="${(stress?.stressors || 'none listed').slice(0, 300)}". Use short sections with bold headers: **Readiness Verdict** (one line: Train as planned / Reduce intensity / Prioritize rest), **Training Adjustment**, **Recovery Actions** (3-4 bullets), **Sleep Tonight** (1-2 bullets). Keep it under 180 words, practical and specific. No medical diagnosis.`,
        },
        env
      );
      const note = typeof result === 'string' ? result : result?.text || result?.response || null;
      if (!note || result?.__stub) return { success: false };

      const now = nowISO();
      await env.DB.prepare(
        'INSERT INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?)'
      ).bind(
        uid(), 'ClientNote',
        JSON.stringify({ client_id: clientId, trainer_id: 'AI_SYSTEM', note: `Recovery Protocol — ${date}\n\n${note}`, date }),
        user.email, now, now
      ).run();
      return { success: true };
    }

    /* ---- Google Sheets import: reads a link-shared sheet via its CSV
            export (no OAuth needed) and creates/updates records ---- */
    case 'importFromGoogleSheets': {
      if (!user) return { success: false, error: 'Not logged in' };
      const sheetId = String(payload?.spreadsheetId || '').trim();
      const sheetName = String(payload?.sheetName || '').trim();
      const dataType = payload?.dataType === 'exercises' ? 'exercises' : 'clients';
      if (!sheetId) return { success: false, error: 'Missing spreadsheet ID' };

      const csvUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv${sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : ''}`;
      let csv;
      try {
        const resp = await fetch(csvUrl, { redirect: 'follow' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        csv = await resp.text();
      } catch (e) {
        return { success: false, error: 'Could not read the sheet. Make sure link sharing is set to "Anyone with the link can view".' };
      }
      if (!csv || csv.trim().startsWith('<')) {
        return { success: false, error: 'Sheet is not publicly readable. Set link sharing to "Anyone with the link can view" and try again.' };
      }

      // Minimal CSV parser (handles quoted fields with commas/newlines).
      const rows = [];
      {
        let row = [], field = '', inQ = false;
        for (let i = 0; i < csv.length; i++) {
          const c = csv[i];
          if (inQ) {
            if (c === '"') { if (csv[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
            else field += c;
          } else if (c === '"') inQ = true;
          else if (c === ',') { row.push(field); field = ''; }
          else if (c === '\n' || c === '\r') {
            if (c === '\r' && csv[i + 1] === '\n') i++;
            row.push(field); field = '';
            if (row.some(v => v.trim() !== '')) rows.push(row);
            row = [];
          } else field += c;
        }
        row.push(field);
        if (row.some(v => v.trim() !== '')) rows.push(row);
      }
      if (rows.length < 2) return { success: false, error: 'The sheet needs a header row plus at least one data row.' };

      const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      const dataRows = rows.slice(1, 501); // sanity cap
      const now = nowISO();
      let imported = 0;
      const errors = [];

      for (let r = 0; r < dataRows.length; r++) {
        const rec = {};
        headers.forEach((h, i) => { if (h) rec[h] = (dataRows[r][i] || '').trim(); });
        try {
          if (dataType === 'clients') {
            const email = (rec.email || '').toLowerCase();
            const fullName = rec.name || rec.full_name || '';
            if (!fullName && !email) throw new Error('missing name and email');
            const data = {
              full_name: fullName, email, phone: rec.phone || '',
              age: rec.age ? Number(rec.age) || null : null,
              gender: rec.gender || '', goals: rec.goals || '',
              medical_notes: rec.medical_notes || rec.notes || '',
              weight_kg: rec.weight ? Number(rec.weight) || null : null,
              height_cm: rec.height ? Number(rec.height) || null : null,
              status: 'active', trainer_id: user.id,
            };
            const existing = email ? await env.DB.prepare(
              `SELECT id, data FROM entities WHERE entity_type='Client' AND created_by=? AND json_extract(data,'$.email')=? LIMIT 1`
            ).bind(user.email, email).first() : null;
            if (existing) {
              let prev = {}; try { prev = JSON.parse(existing.data); } catch {}
              await env.DB.prepare('UPDATE entities SET data=?, updated_date=? WHERE id=?')
                .bind(JSON.stringify({ ...prev, ...data }), now, existing.id).run();
            } else {
              await env.DB.prepare('INSERT INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?)')
                .bind(uid(), 'Client', JSON.stringify(data), user.email, now, now).run();
            }
          } else {
            if (!rec.name) throw new Error('missing name');
            const data = {
              name: rec.name, description: rec.description || '',
              category: rec.category || 'general', difficulty: rec.difficulty || '',
              sets: rec.sets ? Number(rec.sets) || null : null,
              reps: rec.reps || '', rest: rec.rest || '', trainer_id: user.id,
            };
            await env.DB.prepare('INSERT INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?)')
              .bind(uid(), 'Exercise', JSON.stringify(data), user.email, now, now).run();
          }
          imported++;
        } catch (e) {
          errors.push({ row: r + 2, error: e.message || 'invalid row' });
        }
      }
      await audit(env, { actor: user.email, action: 'import', target: 'GoogleSheets', targetId: sheetId, detail: `${dataType}: ${imported}/${dataRows.length}` });
      return { success: true, imported, total: dataRows.length, errors };
    }

    /* ---- Generate a set of standard PT form resources ---- */
    case 'generatePTForms': {
      if (!user) return { success: false, error: 'Not logged in' };
      const now = nowISO();
      const forms = [
        { title: 'PAR-Q Health Questionnaire', category: 'general', description: 'Physical Activity Readiness Questionnaire to screen new clients before starting a program.' },
        { title: 'Liability Waiver & Release', category: 'general', description: 'Standard liability waiver and assumption-of-risk release for personal training.' },
        { title: 'Client Intake Form', category: 'general', description: 'Collect health history, goals, injuries, and contraindications for new clients.' },
        { title: 'Medical Release Form', category: 'general', description: 'Physician clearance form for higher-risk clients before beginning exercise.' },
      ];
      for (const f of forms) {
        const existing = await env.DB.prepare(
          `SELECT id FROM entities WHERE entity_type='Resource' AND created_by=? AND json_extract(data,'$.title')=? LIMIT 1`
        ).bind(user.email, f.title).first();
        if (existing) continue;
        await env.DB.prepare(
          'INSERT INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?)'
        ).bind(uid(), 'Resource', JSON.stringify({ ...f, type: 'form', trainer_id: user.id, is_standard_form: true }), user.email, now, now).run();
      }
      return { success: true };
    }

    /* ---- Coach's Briefing (Claude's addition) ----
       A daily AI triage of the trainer's roster: wins, who needs attention,
       and one focus tip — computed from real activity, cached per day. */
    case 'coachBriefing': {
      if (!user) return { success: false, error: 'Not logged in' };
      const today = nowISO().split('T')[0];

      if (!payload?.force) {
        const cached = await env.DB.prepare(
          `SELECT * FROM entities WHERE entity_type='CoachBriefing' AND created_by=? AND json_extract(data,'$.date')=? LIMIT 1`
        ).bind(user.email, today).first();
        if (cached) return { success: true, cached: true, briefing: JSON.parse(cached.data).briefing };
      }

      // Gather the roster and the last 7 days of activity
      const clients = await listEntities(env, 'Client', { filter: { trainer_id: user.id }, user });
      if (clients.length === 0) {
        return { success: true, briefing: null, empty: true };
      }
      const since = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0];
      const [logs, progress, messages] = await Promise.all([
        listEntities(env, 'WorkoutLog', { filter: { trainer_id: user.id }, user }),
        listEntities(env, 'ProgressLog', { filter: { trainer_id: user.id }, user }),
        listEntities(env, 'Message', { filter: { receiver_id: user.id, read: false }, user }),
      ]);
      const roster = clients.slice(0, 25).map((c) => {
        const cLogs = logs.filter((l) => l.client_id === c.id && (l.date || '') >= since);
        const cProg = progress.filter((l) => l.client_id === c.id && (l.date || '') >= since);
        const lastLog = logs.filter((l) => l.client_id === c.id).map((l) => l.date).sort().pop() || null;
        return {
          name: c.full_name,
          status: c.status,
          workouts_last_7d: cLogs.length,
          progress_entries_last_7d: cProg.length,
          last_workout_date: lastLog,
        };
      });

      const briefing = await invokeLLM(
        {
          prompt: `Today is ${today}. You are an assistant for personal trainer ${user.full_name}. Here is their client roster with the last 7 days of activity: ${JSON.stringify(roster)}. Unread messages: ${messages.length}. Write a short morning briefing.`,
          response_json_schema: {
            type: 'object',
            properties: {
              headline: { type: 'string', description: 'One-sentence summary of the roster today' },
              wins: {
                type: 'array',
                items: { type: 'object', properties: { client: { type: 'string' }, note: { type: 'string' } } },
                description: 'Up to 3 clients doing great and why (one short sentence each)',
              },
              needs_attention: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    client: { type: 'string' },
                    reason: { type: 'string' },
                    suggestion: { type: 'string', description: 'One concrete action for the trainer' },
                  },
                },
                description: 'Up to 3 clients slipping (inactive, no logs) with a concrete next step',
              },
              focus_tip: { type: 'string', description: 'One coaching focus for the trainer today' },
            },
          },
        },
        env
      );

      if (briefing && !briefing.__stub && typeof briefing === 'object') {
        await env.DB.prepare(
          'INSERT INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?)'
        ).bind(uid(), 'CoachBriefing', JSON.stringify({ date: today, trainer_id: user.id, briefing }), user.email, nowISO(), nowISO()).run();
        return { success: true, briefing };
      }
      return { success: false };
    }

    case 'syncWorkoutToCalendar':
      return { success: true, stubbed: true };

    /* ---- Import a recipe from any URL: fetch → strip HTML → AI extracts ---- */
    case 'parseRecipeFromText': {
      const url = payload?.recipe_url || payload?.url || '';
      let content = payload?.text || '';
      if (!content && /^https?:\/\//i.test(url)) {
        try {
          const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (ApexCoach recipe importer)' } });
          const html = await r.text();
          content = html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&[a-z]+;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 8000);
        } catch {
          return { success: false, error: 'Could not fetch that URL.' };
        }
      }
      if (!content) return { success: false, error: 'No recipe content to parse.' };
      const recipe = await invokeLLM(
        {
          prompt: `Extract the recipe from this web page text. Provide a clear name, a short description, an ingredients array (each a string), an instructions array (each step a string), servings, prep time, and estimated per-serving nutrition. Web page text:\n\n${content}`,
          response_json_schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              category: { type: 'string' },
              ingredients: { type: 'array', items: { type: 'string' } },
              instructions: { type: 'array', items: { type: 'string' } },
              servings: { type: 'number' },
              prep_time_minutes: { type: 'number' },
              calories: { type: 'number' },
              protein_g: { type: 'number' },
              carbs_g: { type: 'number' },
              fat_g: { type: 'number' },
            },
            required: ['name'],
          },
        },
        env
      );
      // Guard against pages that blocked the fetch (consent walls, bot pages):
      // a real recipe has a plausible name AND at least a couple of ingredients.
      const badName = !recipe?.name || /no recipe|not available|unavailable|n\/?a/i.test(recipe.name);
      const ingredientCount = Array.isArray(recipe?.ingredients) ? recipe.ingredients.length : 0;
      if (badName || ingredientCount < 2) {
        return { success: false, error: 'Couldn\'t read a recipe from that link. Some sites block automated imports — try a different source or add the recipe manually.' };
      }
      return { success: true, recipe };
    }

    // Content browse helpers — empty until curated content sources are added.
    case 'getCuratedRecipes':
    case 'searchResourceSources':
      return { results: [], items: [], recipes: [] };

    default:
      return { __unimplemented: true };
  }
}

/* -------------------------------- LLM ----------------------------------- */

// Provider order: Anthropic (if LLM_API_KEY set, best quality) → Cloudflare
// Workers AI (env.AI binding, no key needed, free tier) → stub message.
// Load an image URL (or data: URL) into bytes + base64 for vision models.
async function loadImage(url) {
  try {
    let bytes;
    let mediaType = 'image/jpeg';
    if (url.startsWith('data:')) {
      const m = url.match(/^data:([^;]+);base64,(.*)$/);
      if (!m) return null;
      mediaType = m[1];
      const bin = atob(m[2]);
      bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    } else {
      const r = await fetch(url);
      if (!r.ok) return null;
      mediaType = r.headers.get('content-type') || 'image/jpeg';
      bytes = new Uint8Array(await r.arrayBuffer());
    }
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return { bytes, base64: btoa(bin), mediaType };
  } catch {
    return null;
  }
}

async function invokeLLM(payload, env) {
  const prompt = payload?.prompt || '';
  const schema = payload?.response_json_schema;
  const imageUrl = Array.isArray(payload?.file_urls) ? payload.file_urls[0] : payload?.file_url || null;
  // If the caller asked for image analysis, never silently fall through to the
  // text model — it would happily invent a plausible meal for a photo it never
  // saw. Fail loudly instead so the UI can say "we couldn't read that image".
  const wantedVision = 'file_urls' in (payload || {}) || 'file_url' in (payload || {});
  if (wantedVision && !imageUrl) {
    return schema
      ? { __stub: true, error: 'no_image', message: 'No image was received. Please try again.' }
      : { __stub: true, message: 'No image was received. Please try again.' };
  }
  const sys = schema
    ? `Respond with ONLY valid JSON matching this schema, no prose or markdown fences: ${JSON.stringify(schema)}`
    : 'You are a helpful fitness coaching assistant.';

  const parseOut = (text) => {
    if (text && typeof text === 'object') return text; // model returned structured output
    text = String(text ?? '');
    if (!schema) return text;
    try {
      return JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      try { return m ? JSON.parse(m[0]) : { text }; } catch { return { text }; }
    }
  };

  /* ---- Vision path: an image was supplied (meal scanner, form check) ---- */
  if (imageUrl) {
    const img = await loadImage(imageUrl);
    if (!img) return schema ? {} : { __stub: true, message: 'Could not read the image.' };

    // Best quality: Claude vision in one step when an Anthropic key is set.
    if (env.LLM_API_KEY) {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': env.LLM_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: env.LLM_MODEL || 'claude-sonnet-5',
          max_tokens: 1024,
          system: sys,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } },
            { type: 'text', text: prompt },
          ] }],
        }),
      });
      const out = await resp.json();
      return parseOut(out?.content?.[0]?.text ?? '');
    }

    // Free path: a vision model describes the image, then the text model turns
    // that description into the structured answer the caller asked for.
    if (env.AI) {
      let description = '';
      try {
        const desc = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
          image: Array.from(img.bytes),
          prompt: 'Describe what is in this image in detail. If it is food, list the likely foods, ingredients, and approximate portion size.',
          max_tokens: 384,
        });
        description = desc?.description || desc?.response || '';
      } catch { /* vision model unavailable or image too large */ }
      if (!description) return schema ? {} : { __stub: true, message: 'Image analysis is temporarily unavailable.' };
      // Recurse through the text path (no image) with the description added.
      return invokeLLM(
        { prompt: `${prompt}\n\nWhat the image shows: ${description}`, response_json_schema: schema },
        env
      );
    }
    return schema ? {} : { __stub: true, message: 'AI vision is not configured.' };
  }

  if (env.LLM_API_KEY) {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.LLM_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.LLM_MODEL || 'claude-sonnet-5',
        max_tokens: 2048,
        system: sys,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const out = await resp.json();
    return parseOut(out?.content?.[0]?.text ?? '');
  }

  if (env.AI) {
    const out = await env.AI.run(env.WORKERS_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2048,
    });
    return parseOut(out?.response ?? '');
  }

  return {
    __stub: true,
    message: 'AI is not configured. Add the Workers AI binding (ai.binding = "AI") or set LLM_API_KEY.',
  };
}

/* ------------------------------- router --------------------------------- */

let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      full_name TEXT, role TEXT DEFAULT 'user', user_type TEXT, data TEXT DEFAULT '{}',
      created_date TEXT NOT NULL, updated_date TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}',
      created_by TEXT, created_date TEXT NOT NULL, updated_date TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type)`,
    `CREATE INDEX IF NOT EXISTS idx_entities_type_created ON entities(entity_type, created_date)`,
    `CREATE INDEX IF NOT EXISTS idx_entities_created_by ON entities(created_by)`,
    `CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY, actor TEXT, action TEXT NOT NULL, target TEXT,
      target_id TEXT, detail TEXT, ip TEXT, created_date TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor, created_date)`,
  ];
  for (const s of stmts) await env.DB.prepare(s).run();
  await seedBetaKeys(env);
  await seedCoachingContent(env);
  schemaReady = true;
}

// Beta keys gate trainer signup, so they are credentials — they live in the
// BETA_KEYS secret, never in source (this repository is public).
// Format: a JSON array, or a comma-separated list of KEY or KEY:Name:email
//   npx wrangler pages secret put BETA_KEYS --project-name=apextraining
// Already-seeded keys stay in the database, so leaving this unset in an
// existing deployment changes nothing.
function betaKeysFromEnv(env) {
  const raw = (env.BETA_KEYS || '').trim();
  if (!raw) return [];
  let list = [];
  if (raw.startsWith('[')) {
    try { list = JSON.parse(raw); } catch { return []; }
  } else {
    list = raw.split(',').map((entry) => {
      const [key, assigned_name, assigned_email] = entry.split(':').map((s) => (s || '').trim());
      return { key, ...(assigned_name ? { assigned_name } : {}), ...(assigned_email ? { assigned_email } : {}) };
    });
  }
  return list
    .filter((k) => k && k.key)
    .map((k, i) => ({ ...k, id: k.id || `betakey${String(i + 1).padStart(17, '0')}` }));
}

async function seedBetaKeys(env) {
  const now = nowISO();
  for (const k of betaKeysFromEnv(env)) {
    const data = {
      key: k.key,
      status: k.assigned_name || k.assigned_email ? 'reserved' : 'available',
      ...(k.assigned_name ? { assigned_name: k.assigned_name } : {}),
      ...(k.assigned_email ? { assigned_email: k.assigned_email } : {}),
    };
    await env.DB.prepare(
      `INSERT OR IGNORE INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?)`
    ).bind(k.id, 'BetaKey', JSON.stringify(data), 'system', now, now).run();
  }
}

/* -------------------- coaching content (self-seeding) -------------------- */
// A movement-pattern exercise catalog and a set of ready-to-ship program
// templates, distilled from the owner's coaching references (COACHING-REFERENCE
// §1-§5). Seeded as global, read-only content so every user shares one catalog.
// Exercise names are the common vocabulary of the gym; nothing is copied from a
// book. Each exercise carries the eight selection/substitution fields, and its
// cues follow the eight cueing buckets — at least one is a stop-rule or ROM
// limit (COACHING-REFERENCE §2). Every one of the seven movement patterns has a
// bodyweight fallback so a user with no equipment never hits a dead end.
const COACHING_EXERCISES = [
  /* ---- Horizontal push (chest, front shoulder, triceps) ---- */
  { name: 'Barbell Bench Press', pattern: 'horizontal_push', equipment: 'barbell',
    primary_muscles: ['chest', 'front deltoid', 'triceps'], joint_tags: ['shoulder', 'elbow'], unilateral: false,
    regression: 'Push-up', progression: 'Load step — add a small increment once you hit the top of the rep range at your prescribed rest',
    leverage_knob: 'Slow the lowering to a 3-count and pause on the chest',
    cues: ['Tuck the elbows about 45 degrees with the wrists stacked over them', 'Keep the natural lower-back arch and pin the shoulder blades down and back', 'Stop the set when bar speed stalls or form breaks — leave 1-2 reps in the tank'] },
  { name: 'Dumbbell Bench Press', pattern: 'horizontal_push', equipment: 'dumbbells',
    primary_muscles: ['chest', 'front deltoid', 'triceps'], joint_tags: ['shoulder', 'elbow'], unilateral: false,
    regression: 'Floor press', progression: 'Add reps into the 8-12 range, then step the dumbbells up',
    leverage_knob: 'Add a one-second pause at the bottom of each rep',
    cues: ['Elbows tucked, forearms vertical at the bottom', 'Squeeze the chest for one second at the top', 'Lower only as deep as you can without the shoulders rolling forward'] },
  { name: 'Incline Dumbbell Press', pattern: 'horizontal_push', equipment: 'dumbbells, bench',
    primary_muscles: ['upper chest', 'front deltoid', 'triceps'], joint_tags: ['shoulder'], unilateral: false,
    regression: 'Incline push-up', progression: 'Total-rep target at a fixed load, then raise the load',
    leverage_knob: 'Turn the palms to face each other to spare the shoulder',
    cues: ['Set a slight incline and keep the ribs down', 'Press up and slightly back over the collarbones', 'Stop lowering the moment the front of the shoulder complains'] },
  { name: 'Push-Up', pattern: 'horizontal_push', equipment: 'bodyweight',
    primary_muscles: ['chest', 'front deltoid', 'triceps', 'core'], joint_tags: ['shoulder', 'elbow', 'wrist'], unilateral: false,
    regression: 'Incline push-up with the hands elevated', progression: 'Elevate the feet or slow the tempo before adding a weighted vest',
    leverage_knob: 'Elevate the feet to shift more load onto the chest and shoulders',
    cues: ['Brace the abs and squeeze the glutes so the body is one straight line', 'Elbows tucked to about 45 degrees, not flared wide', 'Stop the set when the hips sag or you lose full depth'] },
  { name: 'Machine Chest Press', pattern: 'horizontal_push', equipment: 'machine',
    primary_muscles: ['chest', 'front deltoid', 'triceps'], joint_tags: [], unilateral: false,
    regression: 'Lighten the stack and slow the tempo', progression: 'Load step on the stack',
    leverage_knob: 'Pause at full stretch before pressing',
    cues: ['Set the seat so the handles line up with mid-chest', 'Press smoothly without locking out hard', 'Let the handles come back only as far as the shoulders stay comfortable'] },
  { name: 'Dip', pattern: 'horizontal_push', equipment: 'dip bars, bodyweight',
    primary_muscles: ['lower chest', 'triceps', 'front deltoid'], joint_tags: ['shoulder', 'elbow'], unilateral: false,
    regression: 'Bench dip or band-assisted dip', progression: 'Add reps, then hang a little weight from a belt',
    leverage_knob: 'Lean the torso forward to bias the chest',
    cues: ['Keep the shoulders down away from the ears', 'Brace the abs and stay tall through the trunk', 'Descend only until the upper arms reach parallel — no deeper'] },

  /* ---- Vertical push (shoulders, triceps, upper chest) ---- */
  { name: 'Barbell Overhead Press', pattern: 'vertical_push', equipment: 'barbell',
    primary_muscles: ['shoulders', 'triceps', 'upper chest'], joint_tags: ['shoulder', 'lower back'], unilateral: false,
    regression: 'Seated dumbbell shoulder press', progression: 'Load step; add a work-up single slightly above the top set',
    leverage_knob: 'Press strictly with no leg drive and pause at the forehead',
    cues: ['Brace the abs and squeeze the glutes so the ribs stay down', 'Press in a straight line and finish with the bar stacked over the mid-foot', 'Stop the set if the lower back arches to move the weight'] },
  { name: 'Seated Dumbbell Shoulder Press', pattern: 'vertical_push', equipment: 'dumbbells',
    primary_muscles: ['shoulders', 'triceps'], joint_tags: ['shoulder'], unilateral: false,
    regression: 'Landmine press', progression: 'Total-rep target, then raise the load',
    leverage_knob: 'Use a neutral (palms-in) grip to spare the shoulder',
    cues: ['Sit tall with the lower back supported and ribs down', 'Press up and slightly in without banging the dumbbells', 'Lower only to ear height, then stop if the shoulder pinches'] },
  { name: 'Landmine Press', pattern: 'vertical_push', equipment: 'barbell, landmine',
    primary_muscles: ['shoulders', 'upper chest', 'triceps'], joint_tags: [], unilateral: true,
    regression: 'Half-kneeling landmine press', progression: 'Load step, then progress toward a standing strict press',
    leverage_knob: 'Press from a half-kneeling stance to remove the leg drive',
    cues: ['Brace the abs so the low back does not arch', 'Press the bar up along its arc and reach tall', 'Keep the shoulders square — stop if either side starts to twist'] },
  { name: 'Pike Push-Up', pattern: 'vertical_push', equipment: 'bodyweight',
    primary_muscles: ['shoulders', 'triceps', 'upper chest'], joint_tags: ['shoulder', 'wrist'], unilateral: false,
    regression: 'Wall press or feet-lower pike push-up', progression: 'Elevate the feet toward a wall handstand as strength grows',
    leverage_knob: 'Elevate the feet to raise the load on the shoulders',
    cues: ['Hips high, body in an inverted V', 'Lower the crown of the head toward the floor under control', 'Stop before the neck or shoulders take the load — end the set there'] },
  { name: 'Half-Kneeling Dumbbell Press', pattern: 'vertical_push', equipment: 'dumbbell',
    primary_muscles: ['shoulders', 'triceps'], joint_tags: ['shoulder'], unilateral: true,
    regression: 'Seated dumbbell shoulder press', progression: 'Load step per arm',
    leverage_knob: 'Slow the lowering to a 3-count',
    cues: ['Tuck the pelvis slightly and brace so the ribs stay down', 'Press straight up over the shoulder', 'Keep the hips level and square — stop if you have to lean to finish a rep'] },

  /* ---- Horizontal pull (mid-back, rear shoulder, biceps) ---- */
  { name: 'Barbell Bent-Over Row', pattern: 'horizontal_pull', equipment: 'barbell',
    primary_muscles: ['mid-back', 'lats', 'rear deltoid', 'biceps'], joint_tags: ['lower back'], unilateral: false,
    regression: 'Chest-supported dumbbell row', progression: 'Load step while keeping the torso angle fixed',
    leverage_knob: 'Pause the bar at the ribs for a one-count each rep',
    cues: ['Keep the natural lower-back arch — never round the spine to lift', 'Pull the bar to the lower ribs and squeeze the shoulder blades together', 'Stop the set the moment the back rounds or the torso starts swinging'] },
  { name: 'One-Arm Dumbbell Row', pattern: 'horizontal_pull', equipment: 'dumbbell, bench',
    primary_muscles: ['lats', 'mid-back', 'rear deltoid', 'biceps'], joint_tags: [], unilateral: true,
    regression: 'Chest-supported dumbbell row', progression: 'Total-rep target per side, then raise the load',
    leverage_knob: 'Pause at the top and lower on a 3-count',
    cues: ['Brace the free hand and keep the spine long and neutral', 'Drive the elbow back toward the hip, squeezing the shoulder blade', 'Keep the hips and shoulders square — stop if the torso rotates to finish a rep'] },
  { name: 'Chest-Supported Dumbbell Row', pattern: 'horizontal_pull', equipment: 'dumbbells, incline bench',
    primary_muscles: ['mid-back', 'rear deltoid', 'biceps'], joint_tags: [], unilateral: false,
    regression: 'Seated cable row', progression: 'Volume ramp — add a set every 1-2 weeks',
    leverage_knob: 'Pause and squeeze at the top of every rep',
    cues: ['Let the bench take the spine so the lower back is out of it', 'Row both dumbbells to the ribs and pinch the shoulder blades', 'Lower fully but stop the set when you can no longer pause at the top'] },
  { name: 'Inverted Row', pattern: 'horizontal_pull', equipment: 'bodyweight, bar or suspension trainer',
    primary_muscles: ['mid-back', 'rear deltoid', 'biceps'], joint_tags: [], unilateral: false,
    regression: 'Raise the bar higher or bend the knees', progression: 'Lower the bar or elevate the feet to steepen the angle',
    leverage_knob: 'Elevate the feet and lengthen the body angle',
    cues: ['Brace the abs and squeeze the glutes so the body stays a straight line', 'Pull the chest to the bar and squeeze the shoulder blades', 'Stop when the hips drop or you can no longer reach the bar with control'] },
  { name: 'Seated Cable Row', pattern: 'horizontal_pull', equipment: 'cable machine',
    primary_muscles: ['mid-back', 'lats', 'biceps'], joint_tags: [], unilateral: false,
    regression: 'Band row', progression: 'Load step on the stack',
    leverage_knob: 'Pause for a one-count with the handle at the stomach',
    cues: ['Sit tall and keep the chest up without leaning back hard', 'Pull to the stomach and drive the elbows past the ribs', 'Let the weight stretch you forward only as far as the back stays flat'] },
  { name: 'Face Pull', pattern: 'horizontal_pull', equipment: 'cable, band',
    primary_muscles: ['rear deltoid', 'mid-back', 'rotator cuff'], joint_tags: [], unilateral: false,
    regression: 'Band pull-apart', progression: 'Add reps into the 15-20 range, then a small load step',
    leverage_knob: 'Pause with the hands beside the ears',
    cues: ['Pull the rope toward the eyes, splitting the hands apart', 'Lead with the elbows high and squeeze the rear shoulders', 'Keep it light and stop short of any shoulder pinch — this is protective volume'] },

  /* ---- Vertical pull (lats, biceps, forearms) ---- */
  { name: 'Pull-Up', pattern: 'vertical_pull', equipment: 'pull-up bar, bodyweight',
    primary_muscles: ['lats', 'biceps', 'forearms'], joint_tags: ['shoulder', 'elbow'], unilateral: false,
    regression: 'Band-assisted pull-up or lat pulldown', progression: 'Add reps, then hang a little weight from a belt',
    leverage_knob: 'Pause at the top and lower on a 3-count',
    cues: ['Start from a full hang and pull the chest toward the bar', 'Drive the elbows down and squeeze the lats — do not just bend the arms', 'Stop the set when you can no longer clear the bar with control'] },
  { name: 'Chin-Up', pattern: 'vertical_pull', equipment: 'pull-up bar, bodyweight',
    primary_muscles: ['lats', 'biceps', 'forearms'], joint_tags: ['elbow', 'shoulder'], unilateral: false,
    regression: 'Band-assisted chin-up', progression: 'Add reps, then add weight from a belt',
    leverage_knob: 'Pause at the top for a one-count',
    cues: ['Palms facing you, start from a full hang', 'Lead with the chest and drive the elbows to the ribs', 'Stop when the reps break down — do not kip to finish'] },
  { name: 'Lat Pulldown', pattern: 'vertical_pull', equipment: 'machine',
    primary_muscles: ['lats', 'biceps'], joint_tags: ['shoulder'], unilateral: false,
    regression: 'Band lat pulldown', progression: 'Load step on the stack',
    leverage_knob: 'Pause with the bar at the collarbone each rep',
    cues: ['Sit tall and set the shoulders down before pulling', 'Pull the bar to the collarbone and squeeze the lats', 'Pull only to the collarbone — never behind the neck'] },
  { name: 'Neutral-Grip Lat Pulldown', pattern: 'vertical_pull', equipment: 'machine',
    primary_muscles: ['lats', 'biceps'], joint_tags: [], unilateral: false,
    regression: 'Band lat pulldown', progression: 'Load step on the stack',
    leverage_knob: 'Slow the return to a 3-count',
    cues: ['Use the palms-facing handle to spare the shoulders and elbows', 'Drive the elbows down toward the hips', 'Control the bar up and stop the set when the lats stop doing the work'] },
  { name: 'Band Lat Pulldown', pattern: 'vertical_pull', equipment: 'band',
    primary_muscles: ['lats', 'biceps'], joint_tags: [], unilateral: false,
    regression: 'Shorten the band or step closer to the anchor', progression: 'Use a thicker band or add a pause; then progress to pull-ups',
    leverage_knob: 'Add a one-second squeeze at the bottom',
    cues: ['Anchor the band overhead and set the shoulders down', 'Pull the elbows to the ribs and squeeze the lats', 'Return under control and stop when you can no longer pause at the bottom'] },

  /* ---- Squat (quads, glutes, trunk) ---- */
  { name: 'Back Squat', pattern: 'squat', equipment: 'barbell',
    primary_muscles: ['quads', 'glutes', 'adductors', 'trunk'], joint_tags: ['knee', 'lower back'], unilateral: false,
    regression: 'Goblet squat', progression: 'Load step; add a paused rep at the bottom',
    leverage_knob: 'Pause two seconds at the bottom of each rep',
    cues: ['Brace the abs and hold the natural lower-back arch throughout', 'Track the knees out over the toes, not caving in', 'Descend as deep as you can without the pelvis tucking under — stop there'] },
  { name: 'Front Squat', pattern: 'squat', equipment: 'barbell',
    primary_muscles: ['quads', 'glutes', 'trunk'], joint_tags: ['knee'], unilateral: false,
    regression: 'Goblet squat', progression: 'Load step while keeping the torso upright',
    leverage_knob: 'Pause at the bottom before driving up',
    cues: ['Keep the elbows high so the bar stays on the shoulders', 'Stay tall through the chest and brace hard', 'Sink only as low as the torso stays upright, then drive the floor away'] },
  { name: 'Goblet Squat', pattern: 'squat', equipment: 'kettlebell or dumbbell',
    primary_muscles: ['quads', 'glutes'], joint_tags: ['knee'], unilateral: false,
    regression: 'Box squat to a target', progression: 'Load step, then graduate to a barbell squat',
    leverage_knob: 'Pause at the bottom and pry the knees out',
    cues: ['Hold the weight at the chest and keep the elbows inside the knees', 'Sit down between the hips with the chest up', 'Go as deep as you can hold the arch, then stand — stop if the low back rounds'] },
  { name: 'Bulgarian Split Squat', pattern: 'squat', equipment: 'dumbbells, bench',
    primary_muscles: ['quads', 'glutes'], joint_tags: ['knee'], unilateral: true,
    regression: 'Bodyweight split squat', progression: 'Load step per leg, then a slow-tempo variation',
    leverage_knob: 'Slow the descent to a 3-count and pause at the bottom',
    cues: ['Set the rear foot on the bench and stay tall through the torso', 'Drop the back knee straight down, front knee tracking over the foot', 'Descend only as far as balance and the front knee stay comfortable'] },
  { name: 'Bodyweight Squat', pattern: 'squat', equipment: 'bodyweight',
    primary_muscles: ['quads', 'glutes'], joint_tags: ['knee'], unilateral: false,
    regression: 'Box or chair squat to a target', progression: 'Slow the tempo, then move toward a single-leg progression',
    leverage_knob: 'Slow the descent and pause at the bottom, or shift to one leg',
    cues: ['Track the knees over the toes and drive the floor away through the heels', 'Keep the chest up and the lower-back arch — do not round at the bottom', 'Squat only as deep as you can hold the arch, then stand'] },
  { name: 'Leg Press', pattern: 'squat', equipment: 'machine',
    primary_muscles: ['quads', 'glutes'], joint_tags: ['knee'], unilateral: false,
    regression: 'Lighten the load and shorten the range', progression: 'Load step on the sled',
    leverage_knob: 'Pause at the bottom of each rep',
    cues: ['Set the feet mid-platform and keep the whole back on the pad', 'Push through the mid-foot and avoid locking the knees hard', 'Lower only until the lower back starts to round off the pad — stop there'] },
  { name: 'Reverse Lunge', pattern: 'squat', equipment: 'bodyweight or dumbbells',
    primary_muscles: ['quads', 'glutes', 'hamstrings'], joint_tags: ['knee'], unilateral: true,
    regression: 'Bodyweight reverse lunge to a short range', progression: 'Add load, then progress to a deficit or slow tempo',
    leverage_knob: 'Slow the lowering and pause at the bottom',
    cues: ['Step straight back and lower the back knee toward the floor', 'Keep the front knee tracking over the foot and the torso tall', 'Stop the set when balance or knee tracking breaks down'] },

  /* ---- Hinge (hamstrings, glutes, back) ---- */
  { name: 'Conventional Deadlift', pattern: 'hinge', equipment: 'barbell',
    primary_muscles: ['hamstrings', 'glutes', 'back', 'trunk'], joint_tags: ['lower back'], unilateral: false,
    regression: 'Romanian deadlift or kettlebell deadlift', progression: 'Load step; back off one set before a heavy top set',
    leverage_knob: 'Pause the bar just below the knee on the way up',
    cues: ['Set the natural lower-back arch and brace before the bar leaves the floor', 'Drive the feet into the floor and push the hips through — do not yank with the back', 'Stop the set the instant the lower back rounds'] },
  { name: 'Romanian Deadlift', pattern: 'hinge', equipment: 'barbell or dumbbells',
    primary_muscles: ['hamstrings', 'glutes', 'back'], joint_tags: ['lower back'], unilateral: false,
    regression: 'Kettlebell deadlift', progression: 'Load step while keeping the bar path against the legs',
    leverage_knob: 'Slow the lowering to a 3-count',
    cues: ['Soft knees, push the hips back and keep the bar against the legs', 'Hold the natural arch and brace the abs', 'Lower only until you feel the hamstring stretch without rounding — then stand'] },
  { name: 'Kettlebell Swing', pattern: 'hinge', equipment: 'kettlebell',
    primary_muscles: ['glutes', 'hamstrings', 'back'], joint_tags: ['lower back'], unilateral: false,
    regression: 'Kettlebell deadlift to groove the hinge', progression: 'Load step, then density (more quality swings in a fixed window)',
    leverage_knob: 'Add a crisp float-and-hike each rep',
    cues: ['Hinge at the hips, not a squat — the bell floats from hip snap', 'Snap the hips forward and squeeze the glutes at the top', 'Keep the spine neutral and stop the set when the hinge gets sloppy'] },
  { name: 'Barbell Hip Thrust', pattern: 'hinge', equipment: 'barbell, bench',
    primary_muscles: ['glutes', 'hamstrings'], joint_tags: [], unilateral: false,
    regression: 'Bodyweight glute bridge', progression: 'Load step; add a paused rep at the top',
    leverage_knob: 'Pause and squeeze for two seconds at the top',
    cues: ['Ribs down and chin tucked, drive through the heels', 'Squeeze the glutes to lift the hips level with the knees', 'Do not overextend at the top — stop the rep once the hips are level'] },
  { name: 'Single-Leg Romanian Deadlift', pattern: 'hinge', equipment: 'dumbbell',
    primary_muscles: ['hamstrings', 'glutes'], joint_tags: ['lower back'], unilateral: true,
    regression: 'Hold a support for balance', progression: 'Load step per leg, then remove the support',
    leverage_knob: 'Slow the lowering and pause at the bottom',
    cues: ['Hinge at the hip with a soft knee, back leg reaching straight behind', 'Keep the hips square to the floor and the spine long', 'Lower only as far as the back stays flat and hips stay level'] },
  { name: 'Glute Bridge', pattern: 'hinge', equipment: 'bodyweight',
    primary_muscles: ['glutes', 'hamstrings'], joint_tags: [], unilateral: false,
    regression: 'Two-count hold at the top of each rep', progression: 'Move to one leg, then a weighted hip thrust',
    leverage_knob: 'Shift to a single leg to double the load',
    cues: ['Squeeze the glutes to lift and keep the ribs down — do not arch the low back', 'Drive through the heels', 'Stop short of any lower-back pinch; finish with the hips level with the knees'] },

  /* ---- Carry / core-brace (trunk, grip, whole body) ---- */
  { name: 'Farmer Carry', pattern: 'carry_core', equipment: 'dumbbells or kettlebells',
    primary_muscles: ['trunk', 'grip', 'traps', 'whole body'], joint_tags: [], unilateral: false,
    regression: 'Shorter distance with a lighter load', progression: 'Add load or distance each week',
    leverage_knob: 'Slow the pace and lengthen the distance',
    cues: ['Stand tall with the ribs down and the abs braced', 'Keep the shoulders square and level — do not lean', 'Stop the set when posture breaks or the grip starts to fail'] },
  { name: 'Suitcase Carry', pattern: 'carry_core', equipment: 'dumbbell or kettlebell',
    primary_muscles: ['obliques', 'trunk', 'grip'], joint_tags: [], unilateral: true,
    regression: 'Shorter distance with a lighter load', progression: 'Add load or distance per side',
    leverage_knob: 'Slow the pace to resist the lean longer',
    cues: ['Load one hand and brace hard against the pull', 'Keep the hips level and the shoulders square — do not lean toward the weight', 'Stop the set the moment the torso tips sideways'] },
  { name: 'Plank', pattern: 'carry_core', equipment: 'bodyweight',
    primary_muscles: ['trunk', 'shoulders'], joint_tags: [], unilateral: false,
    regression: 'Plank from the knees', progression: 'Extend the hold, then add a limb reach',
    leverage_knob: 'Elevate the feet or add a slow limb reach',
    cues: ['Brace the abs and squeeze the glutes — one straight line from head to heels', 'Keep the hips level, no sagging or piking', 'End the hold the moment the hips drop — quality over time'] },
  { name: 'Dead Bug', pattern: 'carry_core', equipment: 'bodyweight',
    primary_muscles: ['trunk'], joint_tags: [], unilateral: false,
    regression: 'Move only the arms or only the legs', progression: 'Add a light weight or a longer reach',
    leverage_knob: 'Slow every rep to a 3-count',
    cues: ['Press the lower back flat to the floor before you move', 'Extend the opposite arm and leg slowly while keeping the ribs down', 'Stop the rep if the lower back lifts off the floor'] },
  { name: 'Side Plank', pattern: 'carry_core', equipment: 'bodyweight',
    primary_muscles: ['obliques', 'trunk'], joint_tags: [], unilateral: true,
    regression: 'Side plank from the knee', progression: 'Extend the hold, then add a top-leg raise',
    leverage_knob: 'Stack the feet or add a top-leg raise',
    cues: ['Stack the shoulder over the elbow and brace the side of the trunk', 'Lift the hips so the body is one straight line', 'End the hold when the hips start to sag toward the floor'] },
  { name: 'Pallof Press', pattern: 'carry_core', equipment: 'cable or band',
    primary_muscles: ['obliques', 'trunk'], joint_tags: [], unilateral: false,
    regression: 'Step closer to the anchor to reduce the pull', progression: 'Add tension, then a longer hold at full reach',
    leverage_knob: 'Hold at full extension for a longer count',
    cues: ['Stand side-on to the anchor and brace the abs', 'Press the handle straight out and resist the twist', 'Stop the set when you can no longer keep the hips and shoulders square'] },
];

// Four standard program structures (COACHING-REFERENCE §4), with reps and rests
// drawn from the goal → parameter table (§5). Shape mirrors FitnessTemplate /
// WorkoutPlan so the Templates tab and WorkoutForm render them unchanged.
const COACHING_TEMPLATES = [
  {
    name: 'Beginner Full-Body (3-Day)',
    category: 'full_body',
    difficulty: 'beginner',
    duration_weeks: 6,
    days_per_week: 3,
    mesocycle_phase: 'general',
    description: 'The default for anyone new or short on time: three full-body sessions on non-consecutive days. Variety comes from rotating the rep scheme across the week (heavy, moderate, higher-rep), not from new exercises. Progression is a load step on the main lift — if you miss the target reps two sessions running, drop the load 5-10% and climb again.',
    exercises: [
      { day: 1, name: 'Goblet Squat', sets: 3, reps: '5', target_rir: 2, rest_seconds: 150, notes: 'Heavy day. Work up to a tough set of 5.' },
      { day: 1, name: 'Dumbbell Bench Press', sets: 3, reps: '5', target_rir: 2, rest_seconds: 150, notes: 'Elbows tucked; leave 1-2 reps in the tank.' },
      { day: 1, name: 'One-Arm Dumbbell Row', sets: 3, reps: '6', target_rir: 2, rest_seconds: 120, notes: 'Per side. Keep the torso square.' },
      { day: 1, name: 'Plank', sets: 3, reps: '30-45s', target_rir: 2, rest_seconds: 60, notes: 'Brace hard; end the hold when the hips drop.' },
      { day: 2, name: 'Romanian Deadlift', sets: 3, reps: '8-10', target_rir: 2, rest_seconds: 120, notes: 'Moderate day. Lower to the hamstring stretch, no rounding.' },
      { day: 2, name: 'Seated Dumbbell Shoulder Press', sets: 3, reps: '8-10', target_rir: 2, rest_seconds: 90, notes: 'Ribs down; press to ear height.' },
      { day: 2, name: 'Lat Pulldown', sets: 3, reps: '8-10', target_rir: 2, rest_seconds: 90, notes: 'To the collarbone, never behind the neck.' },
      { day: 2, name: 'Farmer Carry', sets: 3, reps: '40m', target_rir: 2, rest_seconds: 60, notes: 'Tall and braced; stop when the grip fails.' },
      { day: 3, name: 'Bodyweight Squat', sets: 3, reps: '12-15', target_rir: 2, rest_seconds: 75, notes: 'Higher-rep day. Control the depth.' },
      { day: 3, name: 'Push-Up', sets: 3, reps: '12-15', target_rir: 2, rest_seconds: 75, notes: 'One straight line; stop when the hips sag.' },
      { day: 3, name: 'Inverted Row', sets: 3, reps: '12-15', target_rir: 2, rest_seconds: 75, notes: 'Chest to the bar; raise the bar to regress.' },
      { day: 3, name: 'Dead Bug', sets: 3, reps: '10', target_rir: 2, rest_seconds: 45, notes: 'Per side. Keep the low back flat.' },
    ],
  },
  {
    name: 'Upper / Lower Split (4-Day)',
    category: 'upper_lower',
    difficulty: 'intermediate',
    duration_weeks: 6,
    days_per_week: 4,
    mesocycle_phase: 'hypertrophy',
    description: 'The first split, once a beginner has about 12 logged weeks. Each day still covers a push and a pull (upper) or a squat and a hinge (lower), and the pull-to-push balance check runs weekly. Hypertrophy defaults: moderate reps, 60-90s rest, sets stopped shy of failure.',
    exercises: [
      { day: 1, name: 'Barbell Bench Press', sets: 4, reps: '6-8', target_rir: 2, rest_seconds: 120, notes: 'Upper A.' },
      { day: 1, name: 'Barbell Bent-Over Row', sets: 4, reps: '6-8', target_rir: 2, rest_seconds: 120, notes: 'Match rows to presses for balance.' },
      { day: 1, name: 'Seated Dumbbell Shoulder Press', sets: 3, reps: '10-12', target_rir: 2, rest_seconds: 90, notes: '' },
      { day: 1, name: 'Neutral-Grip Lat Pulldown', sets: 3, reps: '10-12', target_rir: 2, rest_seconds: 90, notes: '' },
      { day: 1, name: 'Face Pull', sets: 3, reps: '15-20', target_rir: 3, rest_seconds: 60, notes: 'Protective rear-shoulder volume.' },
      { day: 2, name: 'Back Squat', sets: 4, reps: '6-8', target_rir: 2, rest_seconds: 150, notes: 'Lower A.' },
      { day: 2, name: 'Romanian Deadlift', sets: 3, reps: '8-10', target_rir: 2, rest_seconds: 120, notes: '' },
      { day: 2, name: 'Bulgarian Split Squat', sets: 3, reps: '10', target_rir: 2, rest_seconds: 90, notes: 'Per leg.' },
      { day: 2, name: 'Plank', sets: 3, reps: '45s', target_rir: 2, rest_seconds: 60, notes: '' },
      { day: 3, name: 'Incline Dumbbell Press', sets: 4, reps: '8-10', target_rir: 2, rest_seconds: 90, notes: 'Upper B.' },
      { day: 3, name: 'One-Arm Dumbbell Row', sets: 4, reps: '10', target_rir: 2, rest_seconds: 90, notes: 'Per side.' },
      { day: 3, name: 'Pull-Up', sets: 3, reps: '6-10', target_rir: 2, rest_seconds: 90, notes: 'Band-assist if needed.' },
      { day: 3, name: 'Pallof Press', sets: 3, reps: '12', target_rir: 3, rest_seconds: 45, notes: 'Per side.' },
      { day: 4, name: 'Conventional Deadlift', sets: 4, reps: '5', target_rir: 2, rest_seconds: 180, notes: 'Lower B. Back off one set before a heavy top set.' },
      { day: 4, name: 'Front Squat', sets: 3, reps: '8-10', target_rir: 2, rest_seconds: 120, notes: '' },
      { day: 4, name: 'Barbell Hip Thrust', sets: 3, reps: '12', target_rir: 2, rest_seconds: 75, notes: 'Do not overextend at the top.' },
      { day: 4, name: 'Farmer Carry', sets: 3, reps: '40m', target_rir: 2, rest_seconds: 60, notes: '' },
    ],
  },
  {
    name: 'Push / Pull / Legs (3-Day)',
    category: 'push_pull_legs',
    difficulty: 'intermediate',
    duration_weeks: 6,
    days_per_week: 3,
    mesocycle_phase: 'hypertrophy',
    description: 'For the intermediate who wants body-part emphasis while still obeying the balance rule. Run it 3 days for a lighter week or 6 days (repeating the rotation) for more volume — never place two heavy sessions that share a muscle on consecutive days. Hypertrophy defaults: moderate reps, 60-90s rest.',
    exercises: [
      { day: 1, name: 'Barbell Bench Press', sets: 4, reps: '6-8', target_rir: 2, rest_seconds: 120, notes: 'Push day.' },
      { day: 1, name: 'Seated Dumbbell Shoulder Press', sets: 3, reps: '10-12', target_rir: 2, rest_seconds: 90, notes: '' },
      { day: 1, name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', target_rir: 2, rest_seconds: 90, notes: '' },
      { day: 1, name: 'Dip', sets: 3, reps: '10-12', target_rir: 2, rest_seconds: 75, notes: 'Bench or band-assist to regress.' },
      { day: 2, name: 'Pull-Up', sets: 4, reps: '6-10', target_rir: 2, rest_seconds: 120, notes: 'Pull day. Band-assist if needed.' },
      { day: 2, name: 'Barbell Bent-Over Row', sets: 4, reps: '8-10', target_rir: 2, rest_seconds: 120, notes: '' },
      { day: 2, name: 'Lat Pulldown', sets: 3, reps: '10-12', target_rir: 2, rest_seconds: 90, notes: '' },
      { day: 2, name: 'Face Pull', sets: 3, reps: '15-20', target_rir: 3, rest_seconds: 60, notes: 'Rear-shoulder health.' },
      { day: 3, name: 'Back Squat', sets: 4, reps: '6-8', target_rir: 2, rest_seconds: 150, notes: 'Legs day.' },
      { day: 3, name: 'Romanian Deadlift', sets: 3, reps: '8-10', target_rir: 2, rest_seconds: 120, notes: '' },
      { day: 3, name: 'Bulgarian Split Squat', sets: 3, reps: '10', target_rir: 2, rest_seconds: 90, notes: 'Per leg.' },
      { day: 3, name: 'Kettlebell Swing', sets: 3, reps: '15', target_rir: 3, rest_seconds: 60, notes: 'Explosive hip snap.' },
      { day: 3, name: 'Plank', sets: 3, reps: '45s', target_rir: 2, rest_seconds: 45, notes: '' },
    ],
  },
  {
    name: 'Recomposition Circuit (3-Day)',
    category: 'recomposition',
    difficulty: 'intermediate',
    duration_weeks: 6,
    days_per_week: 3,
    mesocycle_phase: 'general',
    description: 'Moderate reps paired upper-with-lower or push-with-pull, rests kept under a minute so rising lactate drives the hormonal response. Progression is rest compression — trim a few seconds off the rest every couple of weeks. Note: long slow cardio is not the efficient fat-loss tool here; circuits and intervals are. Adjacent pairs never share a primary muscle.',
    exercises: [
      { day: 1, name: 'Goblet Squat', sets: 3, reps: '12', target_rir: 3, rest_seconds: 30, notes: 'Circuit A — pair with the push-up.' },
      { day: 1, name: 'Push-Up', sets: 3, reps: '12-15', target_rir: 3, rest_seconds: 30, notes: 'Non-competing pair (lower + push).' },
      { day: 1, name: 'Romanian Deadlift', sets: 3, reps: '12', target_rir: 3, rest_seconds: 30, notes: 'Pair with the row.' },
      { day: 1, name: 'One-Arm Dumbbell Row', sets: 3, reps: '12', target_rir: 3, rest_seconds: 30, notes: 'Per side. Hinge + pull pairing.' },
      { day: 1, name: 'Farmer Carry', sets: 3, reps: '40m', target_rir: 3, rest_seconds: 45, notes: 'Finisher.' },
      { day: 2, name: 'Reverse Lunge', sets: 3, reps: '12', target_rir: 3, rest_seconds: 30, notes: 'Circuit B. Per leg.' },
      { day: 2, name: 'Seated Dumbbell Shoulder Press', sets: 3, reps: '12', target_rir: 3, rest_seconds: 30, notes: 'Lower + push pairing.' },
      { day: 2, name: 'Barbell Hip Thrust', sets: 3, reps: '12-15', target_rir: 3, rest_seconds: 30, notes: 'Pair with the pulldown.' },
      { day: 2, name: 'Lat Pulldown', sets: 3, reps: '12', target_rir: 3, rest_seconds: 30, notes: 'Hinge + pull pairing.' },
      { day: 2, name: 'Pallof Press', sets: 3, reps: '12', target_rir: 3, rest_seconds: 45, notes: 'Per side. Core finisher.' },
      { day: 3, name: 'Bulgarian Split Squat', sets: 3, reps: '12', target_rir: 3, rest_seconds: 30, notes: 'Circuit C. Per leg.' },
      { day: 3, name: 'Incline Dumbbell Press', sets: 3, reps: '12', target_rir: 3, rest_seconds: 30, notes: 'Lower + push pairing.' },
      { day: 3, name: 'Kettlebell Swing', sets: 3, reps: '15', target_rir: 3, rest_seconds: 30, notes: 'Pair with the inverted row.' },
      { day: 3, name: 'Inverted Row', sets: 3, reps: '12-15', target_rir: 3, rest_seconds: 30, notes: 'Hinge + pull pairing.' },
      { day: 3, name: 'Side Plank', sets: 3, reps: '30s', target_rir: 3, rest_seconds: 45, notes: 'Per side. Core finisher.' },
    ],
  },
];

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// Idempotent, migration-free seed run on boot (INSERT OR IGNORE with
// deterministic ids), mirroring seedBetaKeys. Global content, so created_by is
// the same 'system' value the other boot seeds use.
async function seedCoachingContent(env) {
  const now = nowISO();
  for (const ex of COACHING_EXERCISES) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?)`
    ).bind(`cex_${slugify(ex.name)}`, 'CoachingExercise', JSON.stringify(ex), 'system', now, now).run();
  }
  for (const tpl of COACHING_TEMPLATES) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?)`
    ).bind(`ftpl_${slugify(tpl.name)}`, 'FitnessTemplate', JSON.stringify(tpl), 'system', now, now).run();
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  if (env.DB) await ensureSchema(env);

  // path after /api/
  const segs = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);

  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'access-control-allow-origin': url.origin,
        'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type',
      },
    });
  }

  try {
    /* ---- auth ---- */
    if (segs[0] === 'auth') {
      const action = segs[1];

      if (action === 'register' && method === 'POST') {
        const body = await request.json();
        const email = (body.email || '').trim().toLowerCase();
        if (!email || !body.password) return err('Email and password are required.', 400);
        if (String(body.password).length < 8) return err('Password must be at least 8 characters.', 400);
        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (existing) return err('An account with this email already exists.', 409);

        // Signup rules:
        //  - trainers must present a valid beta key
        //  - clients must have been invited (a Client record with their email exists)
        //  - independents (solo) sign up freely
        //  - ADMIN_EMAILS bypass all gates (they may register as any type)
        const user_type = body.user_type || 'independent';
        const isAllowlistedAdmin = resolveRole(env, email, 'user') === 'admin';
        let claimedKeyRow = null;
        if (isAllowlistedAdmin) {
          // no gate
        } else if (user_type === 'trainer') {
          const key = String(body.beta_key || '').trim().toUpperCase();
          if (!key) return err('A beta key is required to sign up as a trainer.', 403);
          claimedKeyRow = await env.DB.prepare(
            `SELECT * FROM entities WHERE entity_type='BetaKey' AND upper(json_extract(data,'$.key')) = ? LIMIT 1`
          ).bind(key).first();
          if (!claimedKeyRow) return err('Invalid beta key.', 403);
          const kd = JSON.parse(claimedKeyRow.data);
          if (kd.status === 'assigned' && kd.trainer_id) return err('This beta key has already been used.', 403);
          if (kd.assigned_email && kd.assigned_email.toLowerCase() !== email) {
            return err('This beta key is reserved for a different email address.', 403);
          }
        } else if (user_type === 'client') {
          const invited = await env.DB.prepare(
            `SELECT id FROM entities WHERE entity_type='Client' AND lower(json_extract(data,'$.email')) = ? LIMIT 1`
          ).bind(email).first();
          if (!invited) {
            return err('Client accounts are invite-only. Ask your trainer to add you, then sign up with the same email they used.', 403);
          }
        }

        const id = uid();
        const now = nowISO();
        const role = 'user'; // admins come exclusively from the ADMIN_EMAILS allowlist
        const userData = claimedKeyRow ? { beta_key_used: true, beta_key_verified: true, beta_key: JSON.parse(claimedKeyRow.data).key } : {};
        // Trainers get a free trial from the moment they sign up; beta-key
        // trainers are comped indefinitely and never hit the paywall.
        if (user_type === 'trainer') {
          userData.billing = {
            status: 'none',
            trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString(),
          };
        }
        await env.DB.prepare(
          'INSERT INTO users (id,email,password_hash,full_name,role,user_type,data,created_date,updated_date) VALUES (?,?,?,?,?,?,?,?,?)'
        ).bind(id, email, await hashPassword(body.password), body.full_name || '', role, user_type, JSON.stringify(userData), now, now).run();
        if (claimedKeyRow) {
          const kd = JSON.parse(claimedKeyRow.data);
          await env.DB.prepare('UPDATE entities SET data=?, updated_date=? WHERE id=?')
            .bind(JSON.stringify({ ...kd, status: 'assigned', trainer_id: id, claimed_date: now }), now, claimedKeyRow.id).run();
        }
        const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
        const token = await signToken({ sub: id, email }, env.AUTH_SECRET || 'dev-insecure-secret');
        const u = userRow(row);
        u.role = resolveRole(env, u.email, u.role);
        return json({ token, user: u });
      }

      if (action === 'login' && method === 'POST') {
        const body = await request.json();
        const email = (body.email || '').trim().toLowerCase();

        // Brute-force throttle (HIPAA §164.308(a)(5)(ii)(C)): lock an account
        // out for 15 minutes after 10 failed attempts in that window. Counted
        // from the audit log, so no extra storage is needed.
        const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const fails = await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM audit_log WHERE actor = ? AND action = 'login_failed' AND created_date > ?`
        ).bind(email, since).first();
        if ((fails?.n || 0) >= 10) {
          await audit(env, { actor: email, action: 'login_blocked', detail: 'rate limited', request });
          return err('Too many failed sign-in attempts. Please try again in 15 minutes.', 429);
        }

        const row = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
        if (!row || !(await verifyPassword(body.password || '', row.password_hash))) {
          await audit(env, { actor: email, action: 'login_failed', request });
          return err('Invalid email or password.', 401);
        }
        await audit(env, { actor: email, action: 'login', request });
        const token = await signToken({ sub: row.id, email }, env.AUTH_SECRET || 'dev-insecure-secret');
        const u = userRow(row);
        u.role = resolveRole(env, u.email, u.role);
        return json({ token, user: u });
      }

      if (action === 'me') {
        const user = await currentUser(request, env);
        if (!user) return err('You must be logged in.', 401);
        if (method === 'GET') {
          // Auto-provision a Client record for client/independent users so the
          // portals always have a profile to load (Base44 did this via backend jobs).
          if (user.user_type === 'client' || user.user_type === 'independent') {
            const existing = await env.DB.prepare(
              `SELECT id FROM entities WHERE entity_type='Client' AND json_extract(data,'$.email') = ? LIMIT 1`
            ).bind(user.email).first();
            if (!existing) {
              const now = nowISO();
              const profile = {
                full_name: user.full_name || '',
                email: user.email,
                user_id: user.id,
                status: 'active',
                trainer_id: user.user_type === 'independent' ? null : undefined,
              };
              await env.DB.prepare(
                'INSERT INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?)'
              ).bind(uid(), 'Client', JSON.stringify(profile), user.email, now, now).run();
            }
          }
          return json(user);
        }
        if (method === 'PUT') {
          const body = await request.json();
          const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
          const data = JSON.parse(row.data || '{}');
          const cols = { full_name: row.full_name, role: row.role, user_type: row.user_type };
          // `role` and `user_type` are privilege fields — never writable by the
          // account itself. Admin status comes solely from the ADMIN_EMAILS
          // allowlist; account type is fixed at registration (gated by beta key
          // / invite), so self-service changes would bypass those gates.
          const PROTECTED = ['id', 'email', 'role', 'user_type', 'password_hash', 'beta_key_used', 'beta_key_verified', 'created_date', 'updated_date'];
          for (const [k, v] of Object.entries(body)) {
            if (PROTECTED.includes(k)) continue;
            if (k in cols) cols[k] = v;
            else data[k] = v;
          }
          await env.DB.prepare(
            'UPDATE users SET full_name=?, role=?, user_type=?, data=?, updated_date=? WHERE id=?'
          ).bind(cols.full_name, cols.role, cols.user_type, JSON.stringify(data), nowISO(), user.id).run();
          const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
          return json(userRow(updated));
        }
      }

      // Right of access (HIPAA §164.524 / GDPR art. 15): hand the account
      // holder a machine-readable copy of everything stored about them.
      if (action === 'export' && method === 'GET') {
        const user = await currentUser(request, env);
        if (!user) return err('You must be logged in.', 401);
        const scope = await ownershipClause(env, user);
        const sql = scope
          ? `SELECT * FROM entities WHERE ${scope.sql} ORDER BY entity_type, created_date`
          : `SELECT * FROM entities WHERE created_by = ? ORDER BY entity_type, created_date`;
        const binds = scope ? scope.binds : [user.email];
        const { results } = await env.DB.prepare(sql).bind(...binds).all();
        const records = {};
        for (const row of results) {
          (records[row.entity_type] ||= []).push(rowToEntity(row));
        }
        const { password_hash: _ph, ...profile } = user;
        await audit(env, { actor: user.email, action: 'export_data', target: 'Account', targetId: user.id, request });
        return json({
          exported_at: nowISO(),
          account: profile,
          records,
          record_counts: Object.fromEntries(Object.entries(records).map(([k, v]) => [k, v.length])),
        });
      }

      // Right to erasure (GDPR art. 17): delete the account and everything it
      // owns. Irreversible — the UI requires typing DELETE to confirm.
      if (action === 'me' && method === 'DELETE') {
        const user = await currentUser(request, env);
        if (!user) return err('You must be logged in.', 401);
        const scope = await ownershipClause(env, user);
        let removed = 0;
        if (scope) {
          const { results } = await env.DB.prepare(
            `SELECT id FROM entities WHERE ${scope.sql}`
          ).bind(...scope.binds).all();
          for (const r of results) {
            await env.DB.prepare('DELETE FROM entities WHERE id = ?').bind(r.id).run();
            removed++;
          }
        } else {
          // Admins own nothing implicitly — remove only what they created.
          const { results } = await env.DB.prepare(
            'SELECT id FROM entities WHERE created_by = ?'
          ).bind(user.email).all();
          for (const r of results) {
            await env.DB.prepare('DELETE FROM entities WHERE id = ?').bind(r.id).run();
            removed++;
          }
        }
        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();
        // The audit trail deliberately outlives the account (HIPAA requires
        // retaining access logs for 6 years); it stores no PHI, only actions.
        await audit(env, { actor: user.email, action: 'account_deleted', target: 'Account', targetId: user.id, detail: `${removed} records`, request });
        return json({ success: true, deleted_records: removed });
      }

      if (action === 'isAuthenticated') {
        const user = await currentUser(request, env);
        return json({ authenticated: !!user });
      }

      if (action === 'logout') return json({ success: true });

      return err('Unknown auth route.', 404);
    }

    /* ---- entities ---- */
    if (segs[0] === 'entities') {
      const type = segs[1];
      const id = segs[2];
      if (!type) return err('Entity type required.', 400);
      const user = await currentUser(request, env);
      if (!user) return err('Authentication required.', 401);

      // "User" maps to the real users table (Base44 exposed platform users as an entity).
      if (type === 'User') {
        if (method === 'GET' && !id) {
          if (user.role === 'admin') {
            const { results } = await env.DB.prepare('SELECT * FROM users ORDER BY created_date DESC').all();
            return json(results.map(userRow));
          }
          return json([user]);
        }
        if (method === 'GET' && id) {
          const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
          if (!row) return err('Not found.', 404);
          const u = userRow(row);
          return user.role === 'admin' || u.id === user.id ? json(u) : err('Forbidden.', 403);
        }
        return err('Users are managed via /api/auth.', 405);
      }

      if (!id) {
        if (method === 'GET') {
          const filter = url.searchParams.get('filter') ? JSON.parse(url.searchParams.get('filter')) : {};
          const sort = url.searchParams.get('sort') || undefined;
          const limit = url.searchParams.get('limit') || undefined;
          return json(await listEntities(env, type, { filter, sort, limit, user }));
        }
        if (method === 'POST') {
          const body = await request.json();
          const list = Array.isArray(body) ? body : [body];

          // Enforce the plan's client cap. Admins and comped (beta-key)
          // trainers are exempt; a limit of 0 on an ACTIVE plan means unlimited.
          if (type === 'Client' && user.role !== 'admin') {
            const state = subscriptionState(user);

            // No active plan and no running trial: existing clients stay
            // reachable, but no new ones until they subscribe.
            if (!state.active) {
              return err(
                'Your free trial has ended. Choose a plan in Settings → Billing to add more clients — your existing clients are unaffected.',
                402,
                { code: 'subscription_required' }
              );
            }

            if (state.clientLimit > 0) {
              const row = await env.DB.prepare(
                `SELECT COUNT(*) AS n FROM entities WHERE entity_type='Client' AND created_by = ? AND COALESCE(json_extract(data,'$.status'),'active') != 'archived'`
              ).bind(user.email).first();
              const current = row?.n || 0;
              if (current + list.length > state.clientLimit) {
                return err(
                  `Your ${state.planName} plan covers ${state.clientLimit} active clients and you have ${current}. Upgrade in Settings → Billing to add more.`,
                  402,
                  { code: 'client_limit_reached', limit: state.clientLimit, current }
                );
              }
            }
          }

          const created = [];
          for (const item of list) {
            const eid = uid();
            const now = nowISO();
            const { id: _i, created_date: _c, updated_date: _u, created_by: _b, ...fields } = item || {};
            await env.DB.prepare(
              'INSERT INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?)'
            ).bind(eid, type, JSON.stringify(fields), user.email || user.id, now, now).run();
            created.push({ ...fields, id: eid, created_by: user.email || user.id, created_date: now, updated_date: now });
            await audit(env, { actor: user.email, action: 'create', target: type, targetId: eid, request });
          }
          return json(Array.isArray(body) ? created : created[0]);
        }
      } else {
        if (method === 'GET') {
          const row = await getScopedEntity(env, type, id, user);
          if (!row) return err('Not found.', 404);
          // HIPAA §164.312(b): record who viewed a health record, not just who
          // changed one. Limited to PHI-bearing types so the log stays useful.
          if (PHI_TYPES.has(type)) {
            await audit(env, { actor: user.email, action: 'read', target: type, targetId: id, request });
          }
          return json(rowToEntity(row));
        }
        if (method === 'PUT') {
          const row = await getScopedEntity(env, type, id, user);
          if (!row) return err('Not found.', 404);
          const body = await request.json();
          const data = JSON.parse(row.data || '{}');
          const { id: _i, created_date: _c, updated_date: _u, created_by: _b, ...fields } = body || {};
          const merged = { ...data, ...fields };
          const now = nowISO();
          await env.DB.prepare('UPDATE entities SET data=?, updated_date=? WHERE id=?')
            .bind(JSON.stringify(merged), now, id).run();
          await audit(env, { actor: user.email, action: 'update', target: type, targetId: id, request });
          return json({ ...merged, id, created_by: row.created_by, created_date: row.created_date, updated_date: now });
        }
        if (method === 'DELETE') {
          const row = await getScopedEntity(env, type, id, user);
          if (!row) return err('Not found.', 404);
          await env.DB.prepare('DELETE FROM entities WHERE id=? AND entity_type=?').bind(id, type).run();
          await audit(env, { actor: user.email, action: 'delete', target: type, targetId: id, request });
          return json({ success: true });
        }
      }
      return err('Method not allowed.', 405);
    }

    /* ---- integrations ---- */
    if (segs[0] === 'integrations') {
      const user = await currentUser(request, env);
      if (!user) return err('Authentication required.', 401);

      if (segs[1] === 'upload' && method === 'POST') {
        const form = await request.formData();
        const file = form.get('file');
        if (!file) return err('No file provided.', 400);
        const key = `uploads/${user.id}/${uid()}-${(file.name || 'file').replace(/[^\w.-]/g, '_')}`;
        if (env.FILES) {
          await env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
          const base = env.PUBLIC_R2_URL ? env.PUBLIC_R2_URL.replace(/\/$/, '') : `${url.origin}/api/files`;
          const fileUrl = `${base}/${key}`;
          return json({ file_url: fileUrl, url: fileUrl, data: { file_url: fileUrl } });
        }
        // No R2 bound: return an inline data URL so previews still work in dev.
        const buf = await file.arrayBuffer();
        const dataUrl = `data:${file.type};base64,${b64(new Uint8Array(buf))}`;
        return json({ file_url: dataUrl, url: dataUrl, data: { file_url: dataUrl } });
      }

      if (segs[1] === 'llm' && method === 'POST') {
        const body = await request.json();
        return json(await invokeLLM(body, env));
      }

      return err('Unknown integration.', 404);
    }

    /* ---- functions ---- */
    /* ---- audit log (admin only) ---- */
    /* ---- billing (Stripe) ---- */
    if (segs[0] === 'stripe') {
      // Webhook first: it is unauthenticated by design and verified by signature.
      if (segs[1] === 'webhook' && method === 'POST') {
        const raw = await request.text();
        const ok = await verifyStripeSignature(raw, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
        if (!ok) return err('Invalid signature.', 400);

        let event;
        try { event = JSON.parse(raw); } catch { return err('Bad payload.', 400); }
        const obj = event?.data?.object || {};

        // Find the user this event belongs to: metadata first, then customer id.
        const findUser = async () => {
          const uid = obj.metadata?.apex_user_id || obj.subscription_details?.metadata?.apex_user_id;
          if (uid) return env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first();
          const customer = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
          if (!customer) return null;
          return env.DB.prepare(
            `SELECT * FROM users WHERE json_extract(data,'$.billing.customer_id') = ? LIMIT 1`
          ).bind(customer).first();
        };

        const row = await findUser();
        if (row) {
          const iso = (unix) => (unix ? new Date(unix * 1000).toISOString() : null);
          if (event.type === 'checkout.session.completed') {
            await saveBilling(env, row.id, {
              customer_id: typeof obj.customer === 'string' ? obj.customer : obj.customer?.id,
              subscription_id: typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id,
              plan: obj.metadata?.apex_plan || null,
              status: 'active',
            });
          } else if (event.type.startsWith('customer.subscription.')) {
            const deleted = event.type.endsWith('deleted');
            await saveBilling(env, row.id, {
              customer_id: typeof obj.customer === 'string' ? obj.customer : obj.customer?.id,
              subscription_id: obj.id,
              plan: deleted ? null : (obj.metadata?.apex_plan || obj.items?.data?.[0]?.price?.metadata?.plan || null),
              status: deleted ? 'canceled' : obj.status,
              current_period_end: iso(obj.current_period_end),
              cancel_at_period_end: !!obj.cancel_at_period_end,
            });
          } else if (event.type === 'invoice.payment_failed') {
            await saveBilling(env, row.id, { status: 'past_due' });
          }
          await audit(env, { actor: row.email, action: 'billing_' + event.type.replace(/\./g, '_'), target: 'Subscription', targetId: obj.id || '', request });
        }
        return json({ received: true });
      }

      const user = await currentUser(request, env);
      if (!user) return err('Authentication required.', 401);

      // Current plan + limits, used by the billing screen and feature gates.
      if (segs[1] === 'status' && method === 'GET') {
        const state = subscriptionState(user);
        const { results } = await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM entities WHERE entity_type='Client' AND created_by = ? AND COALESCE(json_extract(data,'$.status'),'active') != 'archived'`
        ).bind(user.email).all();
        return json({
          ...state,
          clientCount: results?.[0]?.n || 0,
          configured: !!env.STRIPE_SECRET_KEY,
          plans: Object.entries(PLANS).map(([id, p]) => ({ id, ...p })),
          trialDays: TRIAL_DAYS,
        });
      }

      // Hosted Checkout — card details never touch our servers.
      if (segs[1] === 'checkout' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const plan = String(body.plan || '');
        const interval = body.interval === 'annual' ? 'annual' : 'monthly';
        if (!PLANS[plan]) return err('Unknown plan.', 400);

        const lookup = `apex_${plan}_${interval}`;
        const prices = await stripe(env, `prices?lookup_keys[]=${encodeURIComponent(lookup)}&active=true&limit=1`, { method: 'GET' });
        const price = prices?.data?.[0];
        if (!price) return err('That plan is not available right now.', 400);

        const state = subscriptionState(user);
        const origin = new URL(request.url).origin;
        const session = await stripe(env, 'checkout/sessions', {
          data: {
            mode: 'subscription',
            line_items: [{ price: price.id, quantity: 1 }],
            success_url: `${origin}/Settings?billing=success`,
            cancel_url: `${origin}/Settings?billing=cancelled`,
            client_reference_id: user.id,
            ...(state.customerId ? { customer: state.customerId } : { customer_email: user.email }),
            allow_promotion_codes: true,
            metadata: { apex_user_id: user.id, apex_plan: plan },
            subscription_data: { metadata: { apex_user_id: user.id, apex_plan: plan } },
          },
        });
        await audit(env, { actor: user.email, action: 'billing_checkout_started', target: 'Subscription', detail: `${plan}/${interval}`, request });
        return json({ url: session.url });
      }

      // Stripe-hosted portal for changing plan, updating card, or cancelling.
      if (segs[1] === 'portal' && method === 'POST') {
        const customerId = user?.billing?.customer_id;
        if (!customerId) return err('No subscription to manage yet.', 400);
        const origin = new URL(request.url).origin;
        const session = await stripe(env, 'billing_portal/sessions', {
          data: { customer: customerId, return_url: `${origin}/Settings` },
        });
        return json({ url: session.url });
      }

      return err('Unknown billing route.', 404);
    }

    if (segs[0] === 'audit') {
      const user = await currentUser(request, env);
      if (!user) return err('Authentication required.', 401);
      if (user.role !== 'admin') return err('Forbidden.', 403);
      const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 1000);
      const { results } = await env.DB.prepare(
        'SELECT * FROM audit_log ORDER BY created_date DESC LIMIT ?'
      ).bind(limit).all();
      return json(results);
    }

    if (segs[0] === 'functions') {
      const name = segs[1];
      const user = await currentUser(request, env);
      const payload = method === 'POST' ? await request.json().catch(() => ({})) : {};
      const result = await runFunction(name, payload, { env, user, url });
      if (result && result.__unimplemented) {
        return json({ error: `Function "${name}" is not available in the Cloudflare build.`, stubbed: true }, 200);
      }
      return json(result);
    }

    /* ---- R2 file serving (fallback when no public bucket URL) ---- */
    if (segs[0] === 'files' || url.pathname.startsWith('/files/')) {
      if (!env.FILES) return err('File storage not configured.', 404);
      const key = url.pathname.replace(/^\/(api\/)?files\//, '');
      const obj = await env.FILES.get(key);
      if (!obj) return err('Not found.', 404);
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set('etag', obj.httpEtag);
      return new Response(obj.body, { headers });
    }

    return err('Not found.', 404);
  } catch (e) {
    return err(e.message || 'Server error', 500);
  }
}

function b64(bytes) {
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}
