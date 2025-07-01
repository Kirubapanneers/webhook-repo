from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import os
from dotenv import load_dotenv # Import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client['github_events'] 
@app.route('/webhook', methods=['POST'])
def webhook():
    event = request.headers.get('X-GitHub-Event')
    payload = request.json
    data = {}

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
        else: # Pull request opened or other PR actions
            data = {
                "action": "pull_request",
                "author": pr.get('user', {}).get('login', 'Unknown'),
                "from_branch": pr.get('head', {}).get('ref', ''),
                "to_branch": pr.get('base', {}).get('ref', ''),
                "timestamp": pr.get('created_at', '') # Use created_at for initial PR
            }
    else:
        # For any other event types, return a 400. GitHub sends many events.
        return jsonify({"status": "unsupported event", "received_event": event}), 400

    # Insert the processed event data into MongoDB
    db.events.insert_one(data)
    return jsonify({"status": "received", "event_type": event}), 200

@app.route('/latest-events', methods=['GET'])
def get_latest_events():
    # Fetch the latest 10 events, sorted by MongoDB's default _id (which is time-based)
    # Ensure _id is converted to string for JSON serialization
    events = list(db.events.find().sort('_id', -1).limit(10))
    for event in events:
        event['_id'] = str(event['_id'])
    return jsonify(events)

if __name__ == '__main__':
    # When running locally, Flask will be in debug mode and serve on port 5000
    app.run(debug=True, port=5000)

