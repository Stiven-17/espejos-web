# test_db.py
from database import engine

try:
    conn = engine.connect()
    print("✅ Conexión exitosa a PostgreSQL")
    conn.close()
except Exception as e:
    print("❌ Error al conectar:", str(e))