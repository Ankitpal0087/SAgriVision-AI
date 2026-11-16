"""Start the app:  python run.py   (dev)   |   gunicorn 'run:app'  (production)"""
import sys

from app import create_app
from config import Config

app = create_app()

if __name__ == "__main__":
    from ml.predictor import ModelNotReady, get_predictor
    try:
        get_predictor()
    except ModelNotReady as e:
        print("\n[PROBLEM]", e)
        print("\nFIX: run this once, wait 3-5 minutes, then start again:\n    python -m ml.train\n")
        sys.exit(1)
    print(f"\nApp is running. Open this in your browser:  http://{Config.HOST}:{Config.PORT}\n(Stop with Ctrl + C)\n")
    # debug is OFF on purpose: the Werkzeug debugger allows remote code execution.
    app.run(host=Config.HOST, port=Config.PORT, debug=False)
