import unittest
from unittest.mock import Mock
from hc_storage import PostgresHC
class StorageTests(unittest.TestCase):
 def test_private_schema_lock_and_upsert(self):
  conn=PostgresHC.__new__(PostgresHC);conn.connection=Mock()
  conn.execute('BEGIN IMMEDIATE')
  self.assertIn('pg_advisory_xact_lock',conn.connection.execute.call_args.args[0])
  conn.execute('INSERT OR REPLACE INTO hc_workbook VALUES(1,?,?,?)',(2,'{}',b'xlsx'))
  sql,args=conn.connection.execute.call_args.args
  self.assertIn('hc_ledger.hc_workbook',sql);self.assertIn('ON CONFLICT(id) DO UPDATE',sql)
  self.assertEqual(args,(2,'{}',b'xlsx'));self.assertNotIn('?',sql)
  conn.execute('SELECT * FROM hc_workbook_history WHERE revision=?',(1,))
  self.assertEqual(conn.connection.execute.call_args.args[0],'SELECT * FROM hc_ledger.hc_workbook_history WHERE revision=%s')
