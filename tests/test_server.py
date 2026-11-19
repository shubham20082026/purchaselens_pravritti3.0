import os
import tempfile
import unittest
from pathlib import Path

tmp = tempfile.TemporaryDirectory()
os.environ['DB_PATH'] = str(Path(tmp.name) / 'test.sqlite3')
from fastapi.testclient import TestClient
from server import app, db

class AccountFlowTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.client.headers.update({'X-Requested-With':'PurchaseLens'})
        self.email = f'{id(self)}@example.org'
        self.password = 'a safe test password'
    def register(self):
        result = self.client.post('/api/register', json={'name':'Example','email':self.email,'password':self.password})
        self.assertEqual(result.status_code,201, result.text)
        return result
    def test_signup_password_and_session(self):
        response = self.register()
        self.assertIn('HttpOnly', response.headers['set-cookie'])
        with db() as con:
            record = con.execute('SELECT password_hash FROM users WHERE email=?',(self.email,)).fetchone()
        self.assertNotIn(self.password,record['password_hash'])
        self.assertTrue(record['password_hash'].startswith('scrypt$'))
        self.assertEqual(self.client.get('/api/me').status_code,200)
        self.client.post('/api/logout',json={})
        self.assertEqual(self.client.get('/api/me').status_code,401)
        self.assertEqual(self.client.post('/api/login',json={'email':self.email,'password':self.password}).status_code,200)
    def test_save_resume_and_conflict(self):
        self.register()
        state={'mode':'pro','step':5,'plan':{'itemName':'Phone','price':38000}}
        self.assertEqual(self.client.put('/api/state',json={'state':state,'revision':0}).status_code,200)
        self.assertEqual(self.client.get('/api/state').json()['state'],state)
        self.assertEqual(self.client.get('/api/me').json()['user']['mode'],'pro')
        self.assertEqual(self.client.put('/api/state',json={'state':{},'revision':0}).status_code,409)
    def test_mock_checkout_does_not_activate_premium(self):
        self.register()
        result=self.client.post('/api/mock-checkout',json={'plan':'yearly'})
        self.assertEqual(result.status_code,200)
        self.assertFalse(result.json()['paid'])
        self.assertEqual(self.client.get('/api/me').json()['user']['tier'],'free')
    def test_premium_endpoints_require_server_entitlement(self):
        self.register()
        plan={'price':38000,'cashDiscount':2000,'down':5000,'fee':900,'emiCashback':0,'emi':5800,'months':6,'balance':45000,'income':30000,'expenses':22000,'buffer':10000,'purchaseDate':'2026-01-01','emiDate':'2026-02-01','incomeDate':'2026-02-01','expensesDate':'2026-02-01','extraExpenses':[]}
        payload={'plan':plan,'shockAmount':5000,'shockDate':'2026-03-01'}
        self.assertEqual(self.client.post('/api/premium/stress',json=payload).status_code,403)
        self.client.post('/api/mock-checkout',json={'plan':'monthly'})
        self.assertEqual(self.client.post('/api/premium/export',json={'plan':plan}).status_code,403)
        with db() as con:
            con.execute("UPDATE users SET tier='premium' WHERE email=?",(self.email,))
        result=self.client.post('/api/premium/stress',json=payload)
        self.assertEqual(result.status_code,200,result.text)
        self.assertEqual(result.json()['stress']['amount'],5000)
        result=self.client.post('/api/premium/export',json={'plan':plan})
        self.assertEqual(result.status_code,200,result.text)
        self.assertIn('Cash balance',result.json()['csv'])
    def test_demo_is_private_expires_and_unlocks_only_demo(self):
        first=TestClient(app, headers={'X-Requested-With':'PurchaseLens'})
        second=TestClient(app, headers={'X-Requested-With':'PurchaseLens'})
        a=first.post('/api/demo',json={});b=second.post('/api/demo',json={})
        self.assertEqual(a.status_code,201,a.text);self.assertEqual(b.status_code,201,b.text)
        self.assertTrue(a.json()['user']['is_demo'])
        self.assertEqual(first.post('/api/register',json={'name':'Different','email':'different@example.org','password':'another safe password'}).status_code,409)
        self.assertEqual(first.post('/api/login',json={'email':'none@example.org','password':'anything'}).status_code,409)
        self.assertNotEqual(a.json()['user']['id'],b.json()['user']['id'])
        self.assertIn('Max-Age=86400',a.headers['set-cookie'])
        first_plan=first.get('/api/state').json()
        modified=dict(first_plan['state']); modified['plan']={**modified['plan'],'itemName':'Separate demo'}
        self.assertEqual(first.put('/api/state',json={'state':modified,'revision':first_plan['revision']}).status_code,200)
        self.assertNotEqual(second.get('/api/state').json()['state']['plan']['itemName'],'Separate demo')
        self.assertEqual(first.post('/api/demo',json={}).status_code,409)
        self.assertEqual(first.post('/api/premium/export',json={'plan':modified['plan']}).status_code,200)
        self.assertFalse(first.post('/api/mock-checkout',json={'plan':'yearly'}).json()['paid'])
        uid=a.json()['user']['id'];first.post('/api/logout',json={})
        with db() as con:
            self.assertIsNone(con.execute('SELECT id FROM users WHERE id=?',(uid,)).fetchone())
    def test_demo_expired_denied_and_cleaned(self):
        from server import cleanup_expired_demos
        client=TestClient(app, headers={'X-Requested-With':'PurchaseLens'})
        user=client.post('/api/demo',json={}).json()['user']
        with db() as con: con.execute('UPDATE users SET demo_expires_at=0 WHERE id=?',(user['id'],))
        self.assertEqual(client.get('/api/me').status_code,401)
        cleanup_expired_demos()
        with db() as con:self.assertIsNone(con.execute('SELECT id FROM users WHERE id=?',(user['id'],)).fetchone())
    def test_csrf_and_delete(self):
        self.register()
        rejected=self.client.post('/api/logout',json={},headers={'Origin':'https://malicious.example'})
        self.assertEqual(rejected.status_code,403)
        self.assertEqual(self.client.request('DELETE','/api/me',json={'password':'wrong'}).status_code,401)
        self.assertEqual(self.client.request('DELETE','/api/me',json={'password':self.password}).status_code,200)
        self.assertEqual(self.client.get('/api/me').status_code,401)

if __name__=='__main__': unittest.main()
