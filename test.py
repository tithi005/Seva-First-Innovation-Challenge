import json
import urllib.request

req = urllib.request.Request(
    'http://localhost:8000/generate-insights',
    data=b'{"opt_wait": 10, "fifo_wait": 20, "opt_makespan": 30, "fifo_makespan": 40, "schedule": []}',
    headers={'Content-Type': 'application/json'}
)
res = urllib.request.urlopen(req)
print(res.read().decode())
