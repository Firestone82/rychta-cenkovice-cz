# Portal calendars

Days sold on a booking portal are blocked on the website through the portal's iCal feed.
Today the administration offers e-chalupy.cz; the API already accepts `booking`, `airbnb`
and `other` as providers.

## How it works

- An administrator stores the feed address of an apartment in its editor under **Apartments**
  (`PUT /api/v1/admin/channels`). The address carries a private token of the portal, so only
  administrators see it and it is never logged.
- The feed is read at once, then every 15 minutes, and on request
  (`POST /api/v1/admin/channels/:id/sync`).
- A feed carries dates only. Every upcoming stay in it becomes a block of that apartment
  (`bookings.kind = 'block'`, `source` = the provider, `channel_connection_id` set). Nothing
  else from the feed is stored.
- Each run makes the upcoming blocks equal the feed: moved stays move, removed stays free
  their days. Blocks that already ended stay as history.
- Days held by a booking made here are left out, so a stay copied to the portal by hand does
  not come back as a second entry.
- Imported blocks cannot be edited or deleted here (`409 imported`). The owner can still enter
  a booking over one; the block gives way at the next run and grows back when that booking is
  cancelled or deleted.
- Disconnecting a calendar removes its blocks.

## Failures

A feed that cannot be read keeps its blocks, and the reason shows in the apartment's editor,
with a warning badge on its row:
`address` (not a public address), `unreachable`, `http`, `too_large` (over 1 MB) or
`not_calendar`. Feeds are fetched with a 10 second limit and at most three redirects, and only
from public addresses.

Code: `api/src/channels`, `web/src/app/components/admin/apartment-editor/apartment-calendar`.
