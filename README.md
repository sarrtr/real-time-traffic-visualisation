# Real-time Traffic Visualization 🌐
## Project overview
This project visualises web traffic in the globe that comes to the server from various locations around the world in pseudo real-time.

### 📑 Data

The data is taken from given csv-file. Each row in this file represents a "package" that consist of:
- ip address of the sender;
- latitude and longitude of the approximate location;
- timestamp of the package receiving;
- suspicious mark that is get from some anomaly traffic detector (0 is normal package, 1 is suspicious).

### 📌 Key features

- an interactive globe that can be rotated.
- the traffic is represented by dots of different colors that pop up and dissapear after 10 seconds.
- normal traffic is marked with green, and suspicious traffic is marked with red.

![image_1]()

![image_2]()

## 💻 Tech stack

- Python 3.11
- Flask
- HTML5 + CSS3
- JavaScript
- Three.js
- Docker

## 🔧 How to run

```bash
git clone https://github.com/sarrtr/real-time-traffic-visualisation.git
cd real-time-traffic-visualisation
docker-compose up --build
```