// POST /api/admin/logout → clears the admin session cookie.

import { json } from '../_lib/http.js';
import { clearSessionCookieHeader } from '../_lib/adminAuth.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return json(res, 405, { error: 'method_not_allowed' });
    }
    res.setHeader('Set-Cookie', clearSessionCookieHeader());
    return json(res, 200, { ok: true });
}
