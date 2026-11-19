"""PurchaseLens API: local SQLite storage and cookie sessions.

Set COOKIE_SECURE=1 and PUBLIC_ORIGIN=https://your-host before internet deployment.
Mock checkout intentionally never creates or activates a paid entitlement.
"""
from __future__ import annotations

import calendar
import datetime
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import subprocess
import threading
import time
from collections import defaultdict, deque
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlsplit

from fastapi import Cookie, Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get('DB_PATH', str(ROOT / 'data' / 'purchaselens.sqlite3')))
PUBLIC_ORIGIN = os.environ.get('PUBLIC_ORIGIN', '').rstrip('/')
COOKIE_SECURE = os.environ.get('COOKIE_SECURE', '').lower() in ('1', 'true', 'yes')
SESSION_SECONDS = 60 * 60 * 24 * 7
DEMO_SECONDS = 60 * 60 * 24
MAX_BODY = 128 * 1024
MAX_STATE = 100 * 1024
COOKIE_NAME = 'pl_session'

app = FastAPI(title='PurchaseLens', docs_url=None, redoc_url=None, openapi_url=None)

@contextmanager
def db():
    con = sqlite3.connect(str(DB_PATH), timeout=10, isolation_level=None)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    try:
        yield con
    finally:
        con.close()

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with db() as con:
        con.execute('PRAGMA journal_mode=WAL')
        con.executescript('''
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            mode TEXT NOT NULL DEFAULT 'guided' CHECK(mode IN ('guided', 'pro')),
            tier TEXT NOT NULL DEFAULT 'free' CHECK(tier IN ('free', 'premium')),
            created_at INTEGER NOT NULL
          );
          CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at INTEGER NOT NULL
          );
          CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions(user_id);
          CREATE TABLE IF NOT EXISTS user_state (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            state_json TEXT NOT NULL DEFAULT '{}',
            revision INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL
          );
        ''')
        # Add demo-only columns safely to existing databases.
        columns = {row['name'] for row in con.execute('PRAGMA table_info(users)')}
        if 'is_demo' not in columns:
            con.execute('ALTER TABLE users ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0')
        if 'demo_expires_at' not in columns:
            con.execute('ALTER TABLE users ADD COLUMN demo_expires_at INTEGER')
        con.execute('DELETE FROM users WHERE is_demo = 1 AND demo_expires_at <= ?', (int(time.time()),))
    # Protect stored financial scenarios from other local OS users where supported.
    try:
        os.chmod(DB_PATH, 0o600)
    except OSError:
        pass

init_db()

@app.middleware('http')
async def boundary(request: Request, call_next):
    path = request.url.path
    if path.startswith('/api/') and request.method in ('POST', 'PATCH', 'PUT', 'DELETE'):
        # Cross-origin HTML forms cannot set this header; no permissive CORS is enabled.
        if request.headers.get('x-requested-with') != 'PurchaseLens':
            return JSONResponse({'detail': 'Request verification failed.'}, status_code=403)
        origin = request.headers.get('origin')
        if origin:
            expected = PUBLIC_ORIGIN or f'{request.url.scheme}://{request.url.netloc}'
            if origin.rstrip('/') != expected:
                return JSONResponse({'detail': 'Request origin is not allowed.'}, status_code=403)
        if request.headers.get('sec-fetch-site') == 'cross-site':
            return JSONResponse({'detail': 'Cross-site requests are not allowed.'}, status_code=403)
        try:
            size = int(request.headers.get('content-length', '0'))
        except ValueError:
            return JSONResponse({'detail':'Invalid content length.'}, status_code=400)
        if size < 0 or size > MAX_BODY:
            return JSONResponse({'detail':'Request is too large.'}, status_code=413)
        # Do not rely on Content-Length being present or truthful.
        if len(await request.body()) > MAX_BODY:
            return JSONResponse({'detail':'Request is too large.'}, status_code=413)
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    if path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store'
    return response

class Input(BaseModel):
    model_config = ConfigDict(extra='forbid')

class Register(Input):
    name: str = Field(min_length=1, max_length=80)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=10, max_length=128)
    @field_validator('name')
    @classmethod
    def clean_name(cls, value):
        value = value.strip()
        if not value or any(ord(c) < 32 for c in value):
            raise ValueError('Enter your name.')
        return value
    @field_validator('email')
    @classmethod
    def clean_email(cls, value):
        value = value.strip().lower()
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('Enter a valid email address.')
        return value
    @field_validator('password')
    @classmethod
    def clean_password(cls, value):
        if len(value.encode('utf-8')) > 512:
            raise ValueError('Password is too long.')
        return value

class Login(Input):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)

class ProfilePatch(Input):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    mode: Literal['guided','pro'] | None = None
    @field_validator('name')
    @classmethod
    def clean_name(cls, value):
        if value is None: return value
        value = value.strip()
        if not value or any(ord(c) < 32 for c in value):
            raise ValueError('Enter your name.')
        return value

class PasswordChange(Input):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)

class DeleteAccount(Input):
    password: str = Field(min_length=1, max_length=128)

class StateUpdate(Input):
    state: dict[str, Any]
    revision: int = Field(ge=0)

class Checkout(Input):
    plan: Literal['monthly', 'yearly']

class PremiumExport(Input):
    plan: dict[str, Any]

class PremiumStress(Input):
    plan: dict[str, Any]
    shockAmount: float = Field(gt=0, le=1000000000, allow_inf_nan=False)
    shockDate: str = Field(min_length=10, max_length=10, pattern=r'^\d{4}-\d{2}-\d{2}$')

# Rate limiter is process-local; use a shared store and edge limits for production.
_attempts: dict[str, deque[float]] = defaultdict(deque)
_attempts_lock = threading.Lock()
def rate_limit(request: Request, category: str, limit: int = 10, interval: int = 900):
    addr = request.client.host if request.client else 'unknown'
    key = f'{category}:{addr}'
    now = time.monotonic()
    with _attempts_lock:
        if len(_attempts) > 10000:
            for k in list(_attempts):
                if not _attempts[k] or now - _attempts[k][-1] > interval:
                    del _attempts[k]
        q = _attempts[key]
        while q and now-q[0] > interval: q.popleft()
        if len(q) >= limit:
            raise HTTPException(status_code=429, detail='Too many attempts. Please try again later.')
        q.append(now)

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(password.encode('utf-8'), salt=salt, n=16384, r=8, p=1, dklen=32, maxmem=64*1024*1024)
    return f'scrypt$16384$8$1${salt.hex()}${derived.hex()}'

def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, n, r, p, salt, expected = stored.split('$')
        # Stored parameters are fixed and cannot be used for unbounded resource use.
        if (algorithm, n, r, p) != ('scrypt','16384','8','1'): return False
        actual = hashlib.scrypt(password.encode('utf-8'), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p), dklen=32, maxmem=64*1024*1024)
        return hmac.compare_digest(actual, bytes.fromhex(expected))
    except (TypeError, ValueError):
        return False

# Similar cost for an unknown account, reducing obvious user enumeration timing.
DUMMY_PASSWORD = hash_password(secrets.token_urlsafe(24))
def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode('ascii')).hexdigest()

def issue_session(con: sqlite3.Connection, user_id: int, response: Response, seconds: int = SESSION_SECONDS):
    token = secrets.token_urlsafe(32)
    expiry = int(time.time()) + seconds
    con.execute('DELETE FROM sessions WHERE expires_at <= ?', (int(time.time()),))
    con.execute('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)', (token_hash(token),user_id,expiry))
    response.set_cookie(COOKIE_NAME, token, max_age=seconds, httponly=True, secure=COOKIE_SECURE, samesite='strict', path='/')

def current_user(request: Request) -> sqlite3.Row:
    token = request.cookies.get(COOKIE_NAME, '')
    if not re.fullmatch(r'[A-Za-z0-9_-]{43}', token):
        raise HTTPException(status_code=401, detail='Please sign in.')
    with db() as con:
        row = con.execute('SELECT users.* FROM users JOIN sessions ON sessions.user_id = users.id WHERE sessions.token_hash=? AND sessions.expires_at>? AND (users.is_demo=0 OR users.demo_expires_at>?)', (token_hash(token),int(time.time()),int(time.time()))).fetchone()
    if not row: raise HTTPException(status_code=401, detail='Please sign in.')
    return row

def require_no_active_session(request: Request):
    try:
        current_user(request)
    except HTTPException as exc:
        if exc.status_code == 401:
            return
        raise
    raise HTTPException(status_code=409, detail='Sign out of the current session before switching accounts.')

def public_user(row: sqlite3.Row) -> dict[str, Any]:
    return {**{k:row[k] for k in ('id','name','email','mode','tier')}, 'is_demo': bool(row['is_demo'])}

@app.get('/api/health')
def health():
    return {'ok': True}


# Clean up expired demo records at startup and while the service is running.
# On shutdown the daemon stops; startup cleanup handles any server downtime.
_demo_stop = threading.Event()

def cleanup_expired_demos():
    with db() as con:
        con.execute('DELETE FROM users WHERE is_demo = 1 AND demo_expires_at <= ?', (int(time.time()),))

def _demo_cleanup_loop():
    while not _demo_stop.wait(60):
        try:
            cleanup_expired_demos()
        except sqlite3.Error:
            pass  # A later sweep will retry transient database errors.

@app.on_event('startup')
def start_demo_cleanup():
    cleanup_expired_demos()
    _demo_stop.clear()
    threading.Thread(target=_demo_cleanup_loop, name='demo-cleanup', daemon=True).start()

@app.on_event('shutdown')
def stop_demo_cleanup():
    _demo_stop.set()


def demo_data():
    today=datetime.date.today()
    def add_months(date, offset):
        month_index=date.year*12 + date.month-1 + offset
        year, zero_month=divmod(month_index,12)
        month=zero_month+1
        return datetime.date(year,month,min(date.day,calendar.monthrange(year,month)[1])).isoformat()
    purchase=today.isoformat()
    next_month=add_months(today,1)
    return {'mode':'pro','step':0,'theme':'dark','plan':{
        'itemName':'Laptop for freelance work','price':65000,'cashDiscount':2500,
        'down':10000,'fee':750,'emiCashback':0,'emi':9700,'months':6,
        'balance':68000,'income':42000,'expenses':30000,'buffer':18000,
        'purchaseDate':purchase,'incomeDate':next_month,'expensesDate':next_month,
        'emiDate':next_month,'extraExpenses':[{'name':'Laptop bag','amount':1500,'date':add_months(today,2)}],
        'guidedComplete':False}}

@app.post('/api/demo', status_code=201)
def demo(request: Request, response: Response):
    rate_limit(request, 'demo', 20)
    try:
        current_user(request)
    except HTTPException as error:
        if error.status_code != 401: raise
    else:
        raise HTTPException(status_code=409, detail='Sign out before starting a new demo session.')
    now=int(time.time())
    cleanup_expired_demos()
    # No usable or shared credentials. Each visitor gets an independent session.
    identity=secrets.token_hex(16)
    with db() as con:
        con.execute('BEGIN IMMEDIATE')
        cur=con.execute("INSERT INTO users(email,name,password_hash,mode,tier,created_at,is_demo,demo_expires_at) VALUES (?,?,?,'pro','premium',?,1,?)", (f'demo+{identity}@example.invalid','Demo visitor',hash_password(secrets.token_urlsafe(48)),now,now+DEMO_SECONDS))
        user_id=cur.lastrowid
        con.execute('INSERT INTO user_state(user_id,state_json,revision,updated_at) VALUES (?, ?, 0, ?)', (user_id,json.dumps(demo_data(),separators=(',',':')),now))
        issue_session(con,user_id,response,DEMO_SECONDS)
        row=con.execute('SELECT * FROM users WHERE id=?',(user_id,)).fetchone()
        con.execute('COMMIT')
    return {'user':public_user(row), 'expires_in':DEMO_SECONDS}

@app.post('/api/register', status_code=201)
def register(data: Register, request: Request, response: Response):
    require_no_active_session(request)
    rate_limit(request,'register', 8)
    password_hash = hash_password(data.password)
    try:
        with db() as con:
            con.execute('BEGIN IMMEDIATE')
            now = int(time.time())
            cursor = con.execute('INSERT INTO users(email,name,password_hash,created_at) VALUES (?,?,?,?)', (data.email,data.name,password_hash,now))
            uid = cursor.lastrowid
            con.execute('INSERT INTO user_state(user_id,state_json,revision,updated_at) VALUES (?, ?, 0, ?)', (uid, '{}', now))
            issue_session(con,uid,response)
            row = con.execute('SELECT * FROM users WHERE id=?',(uid,)).fetchone()
            con.execute('COMMIT')
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail='An account with this email already exists.')
    return {'user':public_user(row)}

@app.post('/api/login')
def login(data: Login, request: Request, response: Response):
    require_no_active_session(request)
    rate_limit(request,'login', 12)
    with db() as con:
        row = con.execute('SELECT * FROM users WHERE email=?',(data.email.strip().lower(),)).fetchone()
        valid = verify_password(data.password, row['password_hash'] if row else DUMMY_PASSWORD)
        if not row or row['is_demo'] or not valid:
            raise HTTPException(status_code=401, detail='Email or password is incorrect.')
        issue_session(con,row['id'],response)
        return {'user':public_user(row)}

@app.post('/api/logout')
def logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE_NAME, '')
    if re.fullmatch(r'[A-Za-z0-9_-]{43}', token):
        with db() as con:
            row=con.execute('SELECT user_id FROM sessions WHERE token_hash=?', (token_hash(token),)).fetchone()
            if row:
                con.execute('DELETE FROM users WHERE id=? AND is_demo=1', (row['user_id'],))
            con.execute('DELETE FROM sessions WHERE token_hash=?',(token_hash(token),))
    response.delete_cookie(COOKIE_NAME, path='/', httponly=True, secure=COOKIE_SECURE, samesite='strict')
    return {'ok':True}

@app.get('/api/me')
def me(user: sqlite3.Row = Depends(current_user)):
    return {'user': public_user(user)}

@app.patch('/api/me')
def profile(data: ProfilePatch, user: sqlite3.Row = Depends(current_user)):
    with db() as con:
        con.execute('UPDATE users SET name=?, mode=? WHERE id=?', (data.name if data.name is not None else user['name'], data.mode if data.mode is not None else user['mode'], user['id']))
        row=con.execute('SELECT * FROM users WHERE id=?',(user['id'],)).fetchone()
    return {'user':public_user(row)}

@app.post('/api/password')
def change_password(data: PasswordChange, request: Request, response: Response, user: sqlite3.Row = Depends(current_user)):
    rate_limit(request, 'password', 10)
    if not verify_password(data.current_password,user['password_hash']):
        raise HTTPException(status_code=401, detail='Current password is incorrect.')
    new_hash = hash_password(data.new_password)
    with db() as con:
        con.execute('BEGIN IMMEDIATE')
        con.execute('UPDATE users SET password_hash=? WHERE id=?',(new_hash,user['id']))
        con.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))
        issue_session(con,user['id'],response)
        con.execute('COMMIT')
    return {'ok':True}

@app.delete('/api/me')
def delete_account(data: DeleteAccount, request: Request, response: Response, user: sqlite3.Row = Depends(current_user)):
    rate_limit(request,'delete', 10)
    if not verify_password(data.password,user['password_hash']):
        raise HTTPException(status_code=401, detail='Password is incorrect.')
    with db() as con: con.execute('DELETE FROM users WHERE id=?',(user['id'],))
    response.delete_cookie(COOKIE_NAME, path='/', httponly=True, secure=COOKIE_SECURE, samesite='strict')
    return {'ok':True}

@app.get('/api/state')
def get_state(user: sqlite3.Row = Depends(current_user)):
    with db() as con:
        row=con.execute('SELECT state_json,revision FROM user_state WHERE user_id=?',(user['id'],)).fetchone()
    if not row: raise HTTPException(status_code=404,detail='Saved plan unavailable.')
    return {'state':json.loads(row['state_json']), 'revision':row['revision']}

@app.put('/api/state')
def put_state(data: StateUpdate, user: sqlite3.Row = Depends(current_user)):
    try:
        encoded=json.dumps(data.state,ensure_ascii=False,separators=(',',':'),allow_nan=False)
    except (ValueError, TypeError, RecursionError):
        raise HTTPException(status_code=422,detail='Invalid plan data.')
    if len(encoded.encode('utf-8')) > MAX_STATE:
        raise HTTPException(status_code=413,detail='Plan is too large.')
    with db() as con:
        con.execute('BEGIN IMMEDIATE')
        cursor=con.execute('UPDATE user_state SET state_json=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?', (encoded,int(time.time()),user['id'],data.revision))
        if cursor.rowcount != 1:
            con.execute('ROLLBACK')
            raise HTTPException(status_code=409,detail='This plan changed in another session. Reload to see the latest version.')
        mode = data.state.get('mode')
        if mode in ('guided', 'pro'):
            con.execute('UPDATE users SET mode=? WHERE id=?', (mode,user['id']))
        con.execute('COMMIT')
    return {'revision':data.revision+1}

@app.post('/api/mock-checkout')
def mock_checkout(data: Checkout, user: sqlite3.Row = Depends(current_user)):
    return {'mock':True,'plan':data.plan,'paid':False,'tier':user['tier'],'message':'Demo only. No payment was taken and your plan was not changed.'}

# The calculation runner is deliberately outside the static directory. Each call
# has a timeout and bounded parallelism. Use a task queue for production scale.
_runner_slots = threading.BoundedSemaphore(4)
NODE_BIN = os.environ.get('NODE_BIN', 'node')

def premium_user(user: sqlite3.Row = Depends(current_user)) -> sqlite3.Row:
    if user['tier'] != 'premium':
        raise HTTPException(status_code=403, detail='This feature requires Premium. Demo checkout does not activate a subscription.')
    return user

def run_premium(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        encoded = json.dumps(payload, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    except (ValueError, TypeError, RecursionError):
        raise HTTPException(status_code=422, detail='Invalid plan data.')
    if len(encoded.encode('utf-8')) > 40000:
        raise HTTPException(status_code=413, detail='Plan is too large.')
    if not _runner_slots.acquire(blocking=False):
        raise HTTPException(status_code=503, detail='Please try again in a moment.')
    try:
        try:
            proc = subprocess.run([NODE_BIN, str(ROOT / 'internal' / 'premium.mjs')], input=encoded, capture_output=True, text=True, timeout=5, check=False)
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=503, detail='Calculation timed out. Please try again.')
        except OSError:
            raise HTTPException(status_code=503, detail='Calculation service unavailable.')
        try:
            out = json.loads(proc.stdout)
        except (ValueError, TypeError):
            raise HTTPException(status_code=503, detail='Calculation service unavailable.')
        if proc.returncode != 0 or not isinstance(out,dict):
            # Error messages originate from validated engine fields; do not echo raw input.
            message = out.get('error','Invalid plan.') if isinstance(out,dict) else 'Invalid plan.'
            raise HTTPException(status_code=422, detail=message[:300])
        return out
    finally:
        _runner_slots.release()

@app.post('/api/premium/stress')
def premium_stress(data: PremiumStress, request: Request, user: sqlite3.Row = Depends(premium_user)):
    rate_limit(request, 'premium-stress', 60, 60)
    return run_premium({'action':'stress','plan':data.plan,'shockAmount':data.shockAmount,'shockDate':data.shockDate})

@app.post('/api/premium/export')
def premium_export(data: PremiumExport, request: Request, user: sqlite3.Row = Depends(premium_user)):
    rate_limit(request, 'premium-export', 30, 60)
    return run_premium({'action':'export','plan':data.plan})

# No Google route until real OAuth credentials, verified callbacks, and secure account linking are implemented.
app.mount('/', StaticFiles(directory=str(ROOT/'public'),html=True), name='public')
