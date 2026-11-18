# CampusConnect backend

Flask API backed by the Supabase project configured in `.env`.

## Run

```powershell
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `.env` (or the process environment). Do not commit `.env`.

## Endpoints

- `GET /api/events` — list events; optional `?status=open` filter.
- `GET /api/events/{id}` — event details.
- `POST /api/registrations` — JSON `{ "user_id": "<uuid>", "event_id": "<uuid>" }`; returns `201`, or `409` for a duplicate, closed event, or full event.
- `GET /api/me/registrations?user_id=<uuid>` — registrations for the supplied user ID.
- `GET /api/events/{id}/registrations` — attendee list for an event.

There is no authentication or authorization. User and organizer IDs supplied by clients are not verified as the caller's identity, and attendee lists are public. The database should have foreign keys from `events.organizer_id` to `users.id`, from `registrations.user_id` to `users.id`, and from `registrations.event_id` to `events.id`; a unique constraint on `(user_id, event_id)` prevents duplicate registrations.

## Deploy to Render

This repository includes a Render Blueprint (`render.yaml`) that creates a Python web service using Gunicorn. Push the project to a Git repository, then in Render choose **New → Blueprint** and connect that repository. When prompted, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from your local `.env` in the Render dashboard; `.env` is excluded from Git. Render uses `requirements.txt` for the build and `gunicorn app:app --bind 0.0.0.0:$PORT` to start the service.

The service runs Python 3.13.5 as specified in `.python-version`. The root route (`/`) is also the configured health check.
