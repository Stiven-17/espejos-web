from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    connect_args={"sslmode": "require"},
    pool_pre_ping=True,
    pool_size=10,           # Tamaño del pool de conexiones
    max_overflow=20,        # Conexiones extra permitidas
    pool_timeout=30,        # Tiempo de espera para obtener conexión
    pool_recycle=1800       # Reciclar conexiones cada 30 minutos
)

print("DEBUG - DATABASE_URL:", DATABASE_URL)  # Este debe imprimir tu URL

if DATABASE_URL is None:
    raise ValueError("DATABASE_URL no se ha cargado. Revisa tu archivo .env")



SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
