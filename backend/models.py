# backend/models.py
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, LargeBinary
from datetime import datetime
from backend.database import Base  

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))

class Producto(Base):
    __tablename__ = "productos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), index=True)
    descripcion = Column(Text)
    precio_montura = Column(Numeric(10, 2))
    precio_sin_montura = Column(Numeric(10, 2))
    categoria = Column(String(50))
    badge = Column(String(20), nullable=True)
    ancho = Column(Numeric(10, 2), nullable=True)
    largo = Column(Numeric(10, 2), nullable=True)
    imagen_data = Column(LargeBinary, nullable=True)
    imagen_mimetype = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Configuracion(Base):
    __tablename__ = "configuracion"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(50), unique=True, index=True)
    valor = Column(String(255))

class Oferta(Base):
    __tablename__ = "ofertas"
    id = Column(Integer, primary_key=True, index=True)
    texto = Column(String(255), nullable=False)
    icono = Column(String(100), default="fas fa-tag")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
