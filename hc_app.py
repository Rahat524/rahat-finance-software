"""Standalone HC service: a separate database, without loading other finance modules."""
import os,secrets,sqlite3,hashlib,time
from pathlib import Path
from functools import wraps
from flask import Flask,jsonify,request,session,redirect,send_from_directory
from werkzeug.security import generate_password_hash,check_password_hash
from hc_ledger import register_hc_ledger

ROOT=Path(__file__).resolve().parent
DATA=Path(os.environ.get('HC_DATA_DIR',str(ROOT/'.hc-data')))
DATA.mkdir(parents=True,exist_ok=True)
DB=DATA/'hc_workbook.db'
PASSWORD=os.environ.get('HC_PASSWORD','')
if not PASSWORD:raise RuntimeError('Set HC_PASSWORD for the standalone HC service')
USERNAME=os.environ.get('HC_USERNAME','Rahat')
PASSWORD_HASH=generate_password_hash(PASSWORD)
LOGIN_VERSION=hashlib.sha256(PASSWORD.encode()).hexdigest()
app=Flask(__name__)
app.secret_key=os.environ.get('APP_SECRET_KEY') or secrets.token_hex(32)
app.config.update(SESSION_COOKIE_HTTPONLY=True,SESSION_COOKIE_SAMESITE='Lax',SESSION_COOKIE_SECURE=bool(os.environ.get('RENDER')),MAX_CONTENT_LENGTH=16*1024*1024)

IDLE_SECONDS=300

@app.before_request
def expire_idle_session():
 if session.get('hc_owner'):
  now=time.time()
  if now-session.get('hc_last_activity',0)>=IDLE_SECONDS:session.clear()
  elif not request.path.startswith('/hc-ledger-assets/') and request.path!='/healthz':session['hc_last_activity']=now

def db():
 url=os.environ.get('HC_DATABASE_URL','').strip()
 if url:
  from hc_storage import PostgresHC
  return PostgresHC(url)
 c=sqlite3.connect(DB,timeout=30);c.row_factory=sqlite3.Row
 c.execute('PRAGMA journal_mode=WAL');return c

def require_permission(permission):
 def decorator(fn):
  @wraps(fn)
  def wrapped(*a,**kw):
   if not session.get('hc_owner') or session.get('hc_login_version')!=LOGIN_VERSION:
    if request.path in ('/hc-ledger','/hc-sheets'):return redirect('/')
    return jsonify(error='Login required'),401
   return fn(*a,**kw)
  return wrapped
 return decorator

def audit(action,module,details=''):
 c=db()
 try:
  c.execute('CREATE TABLE IF NOT EXISTS hc_audit(id INTEGER PRIMARY KEY,action TEXT,module TEXT,details TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)')
  c.execute('INSERT INTO hc_audit(action,module,details) VALUES(?,?,?)',(action,module,details));c.commit()
 finally:c.close()

@app.get('/')
def home():
 if session.get('hc_owner') and session.get('hc_login_version')==LOGIN_VERSION:return redirect('/hc-ledger')
 return send_from_directory(ROOT,'hc_login.html')

@app.post('/api/login')
def login():
 payload=request.get_json(silent=True) or {}
 ok=secrets.compare_digest(str(payload.get('username','')),USERNAME) and check_password_hash(PASSWORD_HASH,str(payload.get('password','')))
 if ok:
  session.clear();session['hc_owner']=True;session['hc_login_version']=LOGIN_VERSION;session['hc_last_activity']=time.time()
 return jsonify(ok=ok)

@app.get('/api/me')
@require_permission('cash_view')
def me():return jsonify(full_name=USERNAME,username=USERNAME,role_name='Super Admin',permissions=['cash_view','cash_import','export_data'])

@app.post('/api/hc-session/activity')
@require_permission('cash_view')
def activity():return jsonify(ok=True)

@app.post('/api/logout')
def logout():session.clear();return jsonify(ok=True)

@app.get('/healthz')
def health():return jsonify(status='ok',service='hc-workbook',build='hc-standalone-2026-10-21')

register_hc_ledger(app,db,require_permission,audit)
if __name__=='__main__':app.run(host='127.0.0.1',port=5056,debug=False)
