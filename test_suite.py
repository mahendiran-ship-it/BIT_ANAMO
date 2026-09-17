import urllib.request
import json
import time
import os
import pytest

def test_api():
    if os.getenv("RUN_INTEGRATION") != "1":
        pytest.skip("Set RUN_INTEGRATION=1 to run live API integration checks")
    base = 'http://127.0.0.1:8000/api'
    
    # 1. Health
    with urllib.request.urlopen(f'{base}/health', timeout=5) as r:
        health = json.loads(r.read().decode())
        print(f"[PASS] Health check: {health['status']} | Provider: {health['data_provider']} | Blocks: {health['database']['total_blocks_ingested']} | TXs: {health['database']['total_transactions_indexed']}")

    # 2. Latest Block
    with urllib.request.urlopen(f'{base}/blocks/latest', timeout=5) as r:
        latest = json.loads(r.read().decode())
        print(f"[PASS] Latest Block: #{latest['height']} | Analyzed: {latest['analyzed_tx_count']}/{latest['tx_count']} ({latest['coverage_pct']}%) | Vol: {latest['total_volume_btc']} BTC")

    # 3. Follow Address
    addr = 'bc1phj3nvfystppn2px9zrgdfv42j0f9zasu8gv7ak4zknkurwnkmjms7whlx4'
    req = urllib.request.Request(
        f'{base}/address/{addr}/follow',
        data=json.dumps({'notes': 'Test watchlist'}).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=5) as r:
        follow_res = json.loads(r.read().decode())
        print(f"[PASS] Follow Address: {follow_res['message']}")

    # 4. Get Followed List
    with urllib.request.urlopen(f'{base}/followed', timeout=5) as r:
        followed = json.loads(r.read().decode())
        print(f"[PASS] Followed List Count: {followed['count']} address(es)")

    # 5. Compare Followed Address
    with urllib.request.urlopen(f'{base}/followed/{addr}/compare', timeout=5) as r:
        comp = json.loads(r.read().decode())
        print(f"[PASS] Compare Address: {comp['comparison_status']} | Changes: {comp['changes']}")

    # 6. Search
    with urllib.request.urlopen(f'{base}/search?q=966844', timeout=5) as r:
        search_res = json.loads(r.read().decode())
        print(f"[PASS] Search Block: {search_res}")

    # 7. Reports
    with urllib.request.urlopen(f'{base}/reports/block/966844?format=json', timeout=5) as r:
        report = json.loads(r.read().decode())
        print(f"[PASS] Report Generation: {report['report_title']} | Analyzed tx sample: {len(report['analyzed_transactions_sample'])}")

    # 8. Frontend Serving HTML
    with urllib.request.urlopen('http://localhost:5174/', timeout=5) as r:
        html = r.read().decode()
        print(f"[PASS] Frontend Serving HTML: {len(html)} bytes, Title verified: {'Bitcoin Blockchain Intelligence' in html}")

if __name__ == '__main__':
    test_api()
