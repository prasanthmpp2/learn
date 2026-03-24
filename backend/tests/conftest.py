import os
from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
  sys.path.insert(0, str(BACKEND_ROOT))

os.environ['AI_STUDY_ENVIRONMENT'] = 'test'
os.environ['AI_STUDY_CORS_ORIGINS'] = '["http://localhost:5173","http://127.0.0.1:5173"]'
os.environ['AI_STUDY_DATA_BACKEND'] = 'memory'
os.environ['AI_STUDY_AUTH_MODE'] = 'demo'
