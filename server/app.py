from flask import Flask, request, jsonify, send_from_directory
import time
from threading import Thread, Lock

app = Flask(__name__)
data_points = []
data_lock = Lock()

def cleanup_old_data():
    while True:
        with data_lock:
            current_time = time.time()
            global data_points
            data_points = [point for point in data_points if current_time - point['received_time'] <= 10]
        time.sleep(1)

cleanup_thread = Thread(target=cleanup_old_data, daemon=True)
cleanup_thread.start()

@app.route('/data', methods=['GET'])
def receive_data():
    params = request.args
    try:
        ip = params['ip_address']
        lat = float(params['Latitude'])
        lon = float(params['Longitude'])
        timestamp = int(params['Timestamp'])
        suspicious = float(params['suspicious'])
    except (KeyError, ValueError) as e:
        return f'Invalid request: {e}', 400

    with data_lock:
        data_points.append({
            'ip': ip,
            'lat': lat,
            'lon': lon,
            'timestamp': timestamp,
            'suspicious': suspicious,
            'received_time': time.time()
        })
    return 'OK', 200

@app.route('/api/data', methods=['GET'])
def get_data():
    with data_lock:
        current_time = time.time()
        valid_data = [{
            'ip': p['ip'],
            'lat': p['lat'],
            'lon': p['lon'],
            'suspicious': p['suspicious'],
            'received_time': p['received_time']
        } for p in data_points if current_time - p['received_time'] <= 10]
    return jsonify(valid_data)

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)