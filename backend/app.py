from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- MongoDB Connection with Error Handling and Debug Logging ---
db = None
try:
    MONGO_URI = os.getenv("MONGO_URI")
    print("Connecting to MongoDB with URI:", MONGO_URI)
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    db = client['github_events']
    print("MongoDB connection successful.")
except Exception as e:
    print("MongoDB connection error:", e)
    db = None

@app.route('/webhook', methods=['POST'])
def webhook():
    try:
        event = request.headers.get('X-GitHub-Event')
        payload = request.get_json(force=True, silent=True) or {}
        data = {}

        print(f"Received webhook event: {event}")
        print(f"Payload: {payload}")

        # Handle the ping event FIRST (respond immediately)
        if event == 'ping':
            return jsonify({"status": "ok", "message": "Ping received"}), 200

        if event == 'push':
            data = {
                "action": "push",
                "author": payload.get('pusher', {}).get('name', 'Unknown'),
                "to_branch": payload.get('ref', '').split('/')[-1],
                "timestamp": payload.get('head_commit', {}).get('timestamp', '')
            }
        elif event == 'pull_request':
            pr = payload.get('pull_request', {})
            if payload.get('action') == 'closed' and pr.get('merged'):
                data = {
                    "action": "merge",
                    "author": pr.get('user', {}).get('login', 'Unknown'),
                    "from_branch": pr.get('head', {}).get('ref', ''),
                    "to_branch": pr.get('base', {}).get('ref', ''),
                    "timestamp": pr.get('merged_at', '')
                }
            else:
                data = {
                    "action": "pull_request",
                    "author": pr.get('user', {}).get('login', 'Unknown'),
                    "from_branch": pr.get('head', {}).get('ref', ''),
                    "to_branch": pr.get('base', {}).get('ref', ''),
                    "timestamp": pr.get('created_at', '')
                }
        else:
            print(f"Unsupported event type: {event}")
            return jsonify({"status": "unsupported event", "received_event": event}), 400

        # Insert the processed event data into MongoDB (if DB is connected)
        if db is not None:
            try:
                result = db.events.insert_one(data)
                print(f"Inserted event with id: {result.inserted_id}")
            except Exception as e:
                print("Error inserting to MongoDB:", e)
        else:
            print("DB connection not available. Event not stored.")

        return jsonify({"status": "received", "event_type": event}), 200

    except Exception as e:
        print("Error in /webhook route:", e)
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/latest-events', methods=['GET'])
def get_latest_events():
    print("Fetching latest events...")
    if db is not None:
        try:
            events = list(db.events.find().sort('_id', -1).limit(10))
            for event in events:
                event['_id'] = str(event['_id'])  # Convert ObjectId to string for JSON serialization
            print(f"Fetched {len(events)} events.")
            return jsonify(events)
        except Exception as e:
            print("Error fetching from MongoDB:", e)
            return jsonify([]), 500
    else:
        print("MongoDB is not connected.")
        return jsonify([]), 500

# Do NOT include app.run() for Render or Gunicorn deployment
