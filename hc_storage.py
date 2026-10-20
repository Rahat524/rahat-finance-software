"""Isolated PostgreSQL storage for HC; never falls back after a remote failure."""
import re

class PostgresHC:
 def __init__(self,url):
  import psycopg
  from psycopg.rows import dict_row
  self.connection=psycopg.connect(url,sslmode='require',connect_timeout=15,row_factory=dict_row,prepare_threshold=None)
 def execute(self,sql,params=()):
  if sql.startswith('CREATE TABLE IF NOT EXISTS '):
   # Tables are provisioned by the reviewed HC migration, not at runtime.
   return self.connection.execute('SELECT 1')
  if sql=='BEGIN IMMEDIATE':
   # One workbook; serialize competing saves, including the initial insert.
   return self.connection.execute('SELECT pg_advisory_xact_lock(187331,1)')
  if sql.startswith('INSERT OR REPLACE INTO hc_workbook '):
   sql='INSERT INTO hc_workbook(id,revision,document,original) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=EXCLUDED.revision,document=EXCLUDED.document,original=EXCLUDED.original'
  sql=re.sub(r'\b(hc_workbook_history|hc_workbook|hc_audit)\b',r'hc_ledger.\1',sql)
  return self.connection.execute(sql.replace('?','%s'),params)
 def commit(self):self.connection.commit()
 def rollback(self):self.connection.rollback()
 def close(self):self.connection.close()
