// GET /api/admin/verify → { ok: true } if a valid admin session cookie exists.

import { json } from '../_lib/http.js';
import { adminConfigured, isAdminRequest } from '../_lib/adminAuth.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return json(res, 405, { error: 'method_not_allowed' });
    }
    if (!adminConfigured()) {
        return json(res, 200, { ok: false, reason: 'server_config' });
    }
    if (!isAdminRequest(req)) {
        return json(res, 401, { ok: false, reason: 'no_session' });
    }
    return json(res, 200, { ok: true });
}
