import csv
import time
import requests
from requests.exceptions import ConnectionError

def send_data():
    with open('/data/ip_addresses.csv', 'r') as f:
        reader = csv.DictReader(f)
        prev_timestamp = None
        for row in reader:
            current_timestamp = int(row['Timestamp'])
            if prev_timestamp is not None:
                delay = current_timestamp - prev_timestamp
                if delay < 0:
                    delay = 0
                time.sleep(delay)
            params = {
                'ip_address': row['ip address'],
                'Latitude': row['Latitude'],
                'Longitude': row['Longitude'],
                'Timestamp': row['Timestamp'],
                'suspicious': row['suspicious']
            }
            try:
                response = requests.get('http://server:5050/data', params=params, timeout=5)
                print(f"Sent data: {params}, response: {response.status_code}")
            except ConnectionError:
                print("Server not available, retrying in 2 seconds...")
                time.sleep(2)
                try:
                    response = requests.get('http://server:5050/data', params=params, timeout=5)
                    print(f"Sent data on retry: {params}, response: {response.status_code}")
                except ConnectionError as e:
                    print(f"Failed to send data: {e}")
            prev_timestamp = current_timestamp

if __name__ == '__main__':
    send_data()