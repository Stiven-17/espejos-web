from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from enum import Enum
from base64 import b64encode
import re

class Token(BaseModel):
    access_token: str
    token_type: str

    class Config:
        from_attributes = True

class Categoria(str, Enum):
    banos = "banos"
    sala = "sala"
    alcoba = "alcoba"
    con_luces = "con-luces"
    adornos = "adornos"

class ProductoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre del producto")
    descripcion: str = Field(default="", max_length=1000, description="Descripción del producto")
    precio_montura: float = Field(..., gt=0, description="Precio con montura")
    precio_sin_montura: float = Field(..., gt=0, description="Precio sin montura")
    categoria: Categoria = Field(..., description="Categoría del producto")
    badge: Optional[str] = Field(None, max_length=20, description="Badge o etiqueta especial")
    ancho: Optional[float] = Field(None, gt=0, description="Ancho del espejo en cm")
    largo: Optional[float] = Field(None, gt=0, description="Largo del espejo en cm")

    @validator('nombre')
    def nombre_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('El nombre no puede estar vacío')
        return v.strip()

    @validator('descripcion')
    def clean_descripcion(cls, v):
        return v.strip() if v else ""

    @validator('badge')
    def clean_badge(cls, v):
        return v.strip() if v else None

class ProductoCreate(ProductoBase):
    imagen_base64: Optional[str] = Field(
        None,
        description="Imagen en formato base64 con formato data:image/tipo;base64,datos",
        example="data:image/png;base64,iVBORw0KGg..."
    )

    @validator('imagen_base64')
    def validate_base64_image(cls, v):
        if v is None:
            return v
        
        # Verificar formato data:image/tipo;base64,datos
        pattern = r'^data:image/(jpeg|jpg|png|gif|webp);base64,[A-Za-z0-9+/]+=*$'
        if not re.match(pattern, v):
            raise ValueError('Formato de imagen base64 inválido. Debe ser data:image/tipo;base64,datos')
        
        return v

class ProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=1000)
    precio_montura: Optional[float] = Field(None, gt=0)
    precio_sin_montura: Optional[float] = Field(None, gt=0)
    categoria: Optional[Categoria] = None
    badge: Optional[str] = Field(None, max_length=20)
    ancho: Optional[float] = Field(None, gt=0)
    largo: Optional[float] = Field(None, gt=0)
    imagen_base64: Optional[str] = Field(None, description="Imagen en formato base64")

    @validator('nombre')
    def nombre_must_not_be_empty(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('El nombre no puede estar vacío')
        return v.strip() if v else None

    @validator('descripcion')
    def clean_descripcion(cls, v):
        return v.strip() if v else None

    @validator('badge')
    def clean_badge(cls, v):
        return v.strip() if v else None

    @validator('imagen_base64')
    def validate_base64_image(cls, v):
        if v is None:
            return v
        
        pattern = r'^data:image/(jpeg|jpg|png|gif|webp);base64,[A-Za-z0-9+/]+=*$'
        if not re.match(pattern, v):
            raise ValueError('Formato de imagen base64 inválido')
        
        return v

class ProductoInDB(ProductoBase):
    id: int
    imagen_base64: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @staticmethod
    def from_orm_with_image(producto):
        """Convierte un objeto Producto de SQLAlchemy a ProductoInDB con imagen en base64"""
        try:
            imagen_base64 = None
            if producto.imagen_data and producto.imagen_mimetype:
                try:
                    base64_str = b64encode(producto.imagen_data).decode('utf-8')
                    imagen_base64 = f"data:{producto.imagen_mimetype};base64,{base64_str}"
                except Exception as e:
                    print(f"Error procesando imagen para producto {producto.id}: {str(e)}")
                    imagen_base64 = None
            
            return ProductoInDB(
                id=producto.id,
                nombre=producto.nombre,
                descripcion=producto.descripcion or "",
                precio_montura=float(producto.precio_montura),
                precio_sin_montura=float(producto.precio_sin_montura),
                categoria=producto.categoria,
                badge=producto.badge,
                ancho=float(producto.ancho) if producto.ancho else None,
                largo=float(producto.largo) if producto.largo else None,
                imagen_base64=imagen_base64,
                created_at=producto.created_at,
                updated_at=producto.updated_at
            )
        except Exception as e:
            print(f"Error general en from_orm_with_image para producto {producto.id}: {str(e)}")
            raise e

class ProductoResumen(BaseModel):
    """Modelo simplificado para listados rápidos"""
    id: int
    nombre: str
    precio_montura: float
    precio_sin_montura: float
    categoria: str
    badge: Optional[str] = None
    imagen_base64: Optional[str] = None

    class Config:
        from_attributes = True

# Modelos para Ofertas
class OfertaBase(BaseModel):
    texto: str = Field(..., min_length=1, max_length=255, description="Texto de la oferta")
    icono: str = Field(default="fas fa-tag", max_length=100, description="Clase CSS del icono")

    @validator('texto')
    def texto_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('El texto de la oferta no puede estar vacío')
        return v.strip()

    @validator('icono')
    def clean_icono(cls, v):
        return v.strip() if v else "fas fa-tag"

class OfertaCreate(OfertaBase):
    pass

class OfertaUpdate(BaseModel):
    texto: Optional[str] = Field(None, min_length=1, max_length=255)
    icono: Optional[str] = Field(None, max_length=100)

    @validator('texto')
    def texto_must_not_be_empty(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('El texto de la oferta no puede estar vacío')
        return v.strip() if v else None

    @validator('icono')
    def clean_icono(cls, v):
        return v.strip() if v else None

class OfertaInDB(OfertaBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Modelos de respuesta para errores
class ErrorResponse(BaseModel):
    message: str
    detail: Optional[str] = None

class SuccessResponse(BaseModel):
    message: str
    data: Optional[dict] = None