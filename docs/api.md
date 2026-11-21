# API

All endpoints are under `/api/v1`. Every endpoint with its request shape, to try out in the browser, is in the OpenAPI
documentation at `/api/docs` (JSON at `/api/docs-json`).

| | |
| --- | --- |
| `GET /apartments`, `GET /apartments/{slug}` | apartments with photos |
| `GET /availability?from&to` | occupied ranges for the calendar |
| `GET /availability/check?check_in&check_out` | apartments taken in those dates |
| `GET /health` | answers once the database is reachable |
| `GET /config` | what the website needs to know up front: the hCaptcha site key |
| `POST /bookings` | booking request (`captcha_token` when hCaptcha is on) |
| `POST /contact` | contact form (`captcha_token` when hCaptcha is on) |
| `GET /photos?category&apartment&offset&limit`, `GET /photos/covers` | gallery, paged |
| `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `GET /auth/me` | session |
| `GET /admin/dashboard` | counts, arrivals, departures, pending requests |
| `/admin/bookings`, `/admin/messages`, `/admin/apartments`, `/admin/photos` | management (Bearer token) |

Request validation and the error format are described in [Architecture](architecture.md#api-apisrc).
