import os
import uuid

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from postgrest import APIError
from supabase import Client, create_client

load_dotenv()

app = Flask(__name__)

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_KEY")
if not supabase_url or not supabase_key:
    raise RuntimeError("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the environment.")

supabase: Client = create_client(supabase_url, supabase_key)


def api_error(message, status):
    return jsonify({"error": message}), status


def is_uuid(value):
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def run_query(query):
    """Execute a Supabase query and convert PostgREST errors to JSON responses."""
    try:
        return query.execute().data, None
    except APIError as error:
        code = getattr(error, "code", None)
        if code == "23505":
            return None, api_error("A registration for this user and event already exists.", 409)
        if code == "23503":
            return None, api_error("The referenced user or event does not exist.", 404)
        app.logger.exception("Supabase request failed: %s", error.message)
        return None, api_error("Database request failed.", 500)


@app.get("/")
def index():
    return jsonify({"name": "CampusConnect API", "endpoints": [
        "GET /api/events", "GET /api/events/<id>", "POST /api/registrations",
        "GET /api/me/registrations?user_id=<uuid>",
        "GET /api/events/<id>/registrations",
    ]})


@app.get("/api/events")
def list_events():
    query = supabase.table("events").select("*")
    status = request.args.get("status")
    if status:
        query = query.eq("status", status)
    data, error = run_query(query)
    if error:
        return error
    return jsonify(data)


@app.get("/api/events/<event_id>")
def get_event(event_id):
    if not is_uuid(event_id):
        return api_error("event id must be a UUID.", 400)
    data, error = run_query(
        supabase.table("events").select("*").eq("id", event_id).maybe_single()
    )
    if error:
        return error
    if data is None:
        return api_error("Event not found.", 404)
    return jsonify(data)


@app.post("/api/registrations")
def create_registration():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return api_error("Request body must be a JSON object.", 400)
    user_id = body.get("user_id")
    event_id = body.get("event_id")
    if not is_uuid(user_id) or not is_uuid(event_id):
        return api_error("user_id and event_id must be valid UUIDs.", 400)

    event_data, error = run_query(
        supabase.table("events").select("id,capacity,status").eq("id", event_id).maybe_single()
    )
    if error:
        return error
    if event_data is None:
        return api_error("Event not found.", 404)
    if event_data.get("status", "").lower() not in ("open", "published", "active"):
        return api_error("This event is not open for registration.", 409)

    try:
        count_response = (
            supabase.table("registrations")
            .select("id", count="exact", head=True)
            .eq("event_id", event_id)
            .execute()
        )
    except APIError as error:
        app.logger.exception("Supabase request failed: %s", error.message)
        return api_error("Database request failed.", 500)
    capacity = event_data.get("capacity")
    if capacity is not None and (count_response.count or 0) >= capacity:
        return api_error("This event has reached capacity.", 409)

    data, error = run_query(
        supabase.table("registrations").insert({"user_id": user_id, "event_id": event_id}).select().single()
    )
    if error:
        return error
    return jsonify(data), 201


@app.get("/api/me/registrations")
def list_user_registrations():
    user_id = request.args.get("user_id")
    if not is_uuid(user_id):
        return api_error("Provide a valid user_id UUID query parameter.", 400)
    data, error = run_query(
        supabase.table("registrations").select("*, events(*)").eq("user_id", user_id)
    )
    if error:
        return error
    return jsonify(data)


@app.get("/api/events/<event_id>/registrations")
def list_event_registrations(event_id):
    if not is_uuid(event_id):
        return api_error("event id must be a UUID.", 400)
    # No organizer ownership check is performed because this API intentionally has no authorization.
    data, error = run_query(
        supabase.table("registrations").select("*, users(id,email)").eq("event_id", event_id)
    )
    if error:
        return error
    return jsonify(data)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG") == "1")
