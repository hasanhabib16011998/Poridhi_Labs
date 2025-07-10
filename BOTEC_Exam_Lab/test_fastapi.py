import requests
import time

BASE_URL = "http://127.0.0.1:8000"  # Update if needed
counter = 1  # To increment data each round

def test_read_root():
    response = requests.get(f"{BASE_URL}/")
    print("GET / ->", response.status_code, response.json())

def test_read_item(i):
    params = {'q': f'query-{i}'}
    response = requests.get(f"{BASE_URL}/items/{i}", params=params)
    print(f"GET /items/{i} ->", response.status_code, response.json())

def test_create_item(i):
    payload = {
        "name": f"Item {i}",
        "description": f"This is item {i}",
        "price": 10.0 + i,
        "tax": 1.0 * i
    }
    response = requests.post(f"{BASE_URL}/items/", json=payload)
    print(f"POST /items/ ->", response.status_code, response.json())

# 🚀 Endless loop
while True:
    print(f"\n--- Iteration {counter} ---")
    try:
        test_read_root()
        test_read_item(counter)
        test_create_item(counter)
    except requests.exceptions.RequestException as e:
        print("❌ Request failed:", e)

    counter += 1
    time.sleep(2)  # Sleep 2 seconds between rounds
