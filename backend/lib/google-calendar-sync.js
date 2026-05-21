/**
 * google-calendar-sync.js
 * Sync logic: push LichTrinh events to Google Calendar (1-way: App → Google).
 * Handles create / update / delete actions and weekly bulk sync.
 */

const { google } = require('googleapis');
const { supabase } = require('../config/database');
const { getClientForUser } = require('./google-calendar-client');

/**
 * Converts a LichTrinh row into a Google Calendar event resource.
 * @param {object} row  LichTrinh row (optionally with joined CongViec)
 * @returns {object} Google Calendar event body
 */
function buildEventResource(row) {
  const startIso = row.GioBatDau
    ? new Date(row.GioBatDau).toISOString()
    : new Date().toISOString();

  const endIso = row.GioKetThuc
    ? new Date(row.GioKetThuc).toISOString()
    : new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();

  const title = row.TieuDe || row.CongViec?.TieuDe || '(Công việc)';
  const description = row.GhiChu || row.CongViec?.MoTa || '';

  return {
    summary: title,
    description,
    start: { dateTime: startIso, timeZone: 'Asia/Ho_Chi_Minh' },
    end:   { dateTime: endIso,   timeZone: 'Asia/Ho_Chi_Minh' },
  };
}

/**
 * Creates, updates, or deletes a single event in Google Calendar.
 * Stores/clears MaSuKienGoogle in LichTrinh after the operation.
 * Failures are logged but do NOT throw — fire-and-forget safe.
 *
 * @param {number} userId
 * @param {object} eventData  LichTrinh row (must have MaLichTrinh)
 * @param {'create'|'update'|'delete'} action
 * @param {{calApi, calendarId}?} sharedApi  Pre-built API client (used by syncWeek batch)
 * @returns {Promise<{ok: boolean, googleEventId?: string, error?: string}>}
 */
async function syncEventToGoogle(userId, eventData, action, sharedApi) {
  try {
    let calApi, calendarId;
    if (sharedApi) {
      calApi = sharedApi.calApi;
      calendarId = sharedApi.calendarId;
    } else {
      const userClient = await getClientForUser(userId);
      calApi = google.calendar({ version: 'v3', auth: userClient.client });
      calendarId = userClient.calendarId;
    }

    const lichId = eventData.MaLichTrinh;

    if (action === 'delete') {
      const googleEventId = eventData.MaSuKienGoogle;
      if (!googleEventId) return { ok: true };

      await calApi.events.delete({ calendarId, eventId: googleEventId }).catch(() => {});
      await supabase
        .from('LichTrinh')
        .update({ MaSuKienGoogle: null })
        .eq('MaLichTrinh', lichId);

      return { ok: true };
    }

    const resource = buildEventResource(eventData);

    // Try update if Google event ID exists
    if (action === 'update' && eventData.MaSuKienGoogle) {
      try {
        const { data } = await calApi.events.update({
          calendarId,
          eventId: eventData.MaSuKienGoogle,
          requestBody: resource,
        });
        return { ok: true, googleEventId: data.id };
      } catch (updateErr) {
        const code = updateErr.code || updateErr.response?.status;
        if (code === 404 || code === 410) {
          // Google event was deleted externally — clear stale ID and fall through to create
          await supabase
            .from('LichTrinh')
            .update({ MaSuKienGoogle: null })
            .eq('MaLichTrinh', lichId);
        } else {
          throw updateErr;
        }
      }
    }

    // Create new event (or re-create after stale ID cleared)
    const { data } = await calApi.events.insert({ calendarId, requestBody: resource });

    await supabase
      .from('LichTrinh')
      .update({ MaSuKienGoogle: data.id })
      .eq('MaLichTrinh', lichId);

    return { ok: true, googleEventId: data.id };
  } catch (err) {
    console.error(`syncEventToGoogle error (userId=${userId}, action=${action}, eventId=${eventData.MaLichTrinh}):`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Syncs all events in the current ISO week for a user.
 * Events that already have a GoogleEventId are updated; others are created.
 * @param {number} userId
 * @returns {Promise<{synced: number, errors: number}>}
 */
async function syncWeek(userId) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Authenticate once for the whole batch
  const { client, calendarId } = await getClientForUser(userId);
  const calApi = google.calendar({ version: 'v3', auth: client });

  const { data: events, error } = await supabase
    .from('LichTrinh')
    .select('*, CongViec(TieuDe, MoTa)')
    .eq('MaNguoiDung', userId)
    .gte('GioBatDau', monday.toISOString())
    .lte('GioBatDau', sunday.toISOString());

  if (error) throw new Error(`DB query failed: ${error.message}`);
  if (!events || events.length === 0) return { synced: 0, errors: 0 };

  let synced = 0;
  let errors = 0;

  for (const ev of events) {
    const action = ev.MaSuKienGoogle ? 'update' : 'create';
    const result = await syncEventToGoogle(userId, ev, action, { calApi, calendarId });
    result.ok ? synced++ : errors++;
  }

  return { synced, errors };
}

module.exports = { syncEventToGoogle, syncWeek };
