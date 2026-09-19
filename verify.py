import base64, json, urllib.request, numpy as np
BASE = "http://127.0.0.1:8001"
def get(p):
    with urllib.request.urlopen(BASE+p, timeout=30) as r: return json.loads(r.read().decode())
def post(p, b):
    req = urllib.request.Request(BASE+p, data=json.dumps(b).encode(), headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req, timeout=120) as r: return json.loads(r.read().decode())
h = get("/api/health"); print("HEALTH", h)
m = get("/api/model/info"); print("MODEL", m["architecture"])
x = (0.4*np.sin(2*np.pi*440*np.arange(16000)/16000)).astype(np.float32)
r = post("/api/analyze-pcm", {"audio_base64": base64.b64encode(x.tobytes()).decode(), "dtype":"float32", "sample_rate":16000, "label":"e2e"})
print("ANALYZE threat=", r["threat_score"], "top=", r["top_class"], "ms=", r["inference_ms"])
html = urllib.request.urlopen(BASE+"/", timeout=30).read(); print("INDEX", len(html), "has_app.js=", b"app.js" in html)
print("HISTORY", get("/api/history?limit=5")["count"])
print("E2E OK")