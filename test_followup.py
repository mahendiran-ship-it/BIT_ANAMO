import urllib.request
import json
import time
import os
import pytest

def test_followup_event():
    if os.getenv("RUN_INTEGRATION") != "1":
        pytest.skip("Set RUN_INTEGRATION=1 to run live follow-up integration checks")
    base = 'http://127.0.0.1:8000/api'
    addr = 'bc1phj3nvfystppn2px9zrgdfv42j0f9zasu8gv7ak4zknkurwnkmjms7whlx4'

    # Re-analyze block 966844 so the analyzer triggers follow-up detection for the now-followed address
    print('Triggering re-analysis of block 966844 to test follow-up detection...')
    req = urllib.request.Request(f'{base}/blocks/966844/reanalyze', data=b'{}', headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=60) as r:
        res = json.loads(r.read().decode())
        print('[PASS] Re-analyze block result:', res['message'])

    # Check followed activity events
    with urllib.request.urlopen(f'{base}/followed/activity', timeout=5) as r:
        events = json.loads(r.read().decode())
        print(f"[PASS] Follow-Up Event Count: {events['count']}")
        if events['events']:
            e0 = events['events'][0]
            print(f"[PASS] Follow-Up Event: Address {e0['address'][:10]}... | Block #{e0['block_height']} | TX count: {e0['tx_count']} | Activity Change: {e0['activity_change_pct']}%")

    # Check comparative analysis
    with urllib.request.urlopen(f'{base}/followed/{addr}/compare', timeout=5) as r:
        comp = json.loads(r.read().decode())
        print(f"[PASS] Comparison result: {comp['comparison_status']} | Current: {comp['current_period']} | Changes: {comp['changes']}")

if __name__ == '__main__':
    test_followup_event()
