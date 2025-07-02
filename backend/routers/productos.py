from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import base64
import logging
from models import Producto as ModelProducto
from schemas import ProductoInDB, ProductoCreate, ProductoUpdate, SuccessResponse, ErrorResponse
from auth import get_current_admin
from database import get_db

# Configurar logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Extensiones de imagen permitidas
ALLOWED_EXTENSIONS = {'jpeg', 'jpg', 'png', 'gif', 'webp'}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

def process_image_data(imagen_data: bytes, imagen_mimetype: str) -> str:
    """Convierte datos de imagen a base64 para respuesta"""
    try:
        base64_str = base64.b64encode(imagen_data).decode('utf-8')
        return f"data:{imagen_mimetype};base64,{base64_str}"
    except Exception as e:
        logger.error(f"Error procesando imagen: {str(e)}")
        return None

def validate_image(imagen: UploadFile) -> None:
    """Valida el archivo de imagen"""
    if not imagen.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="El archivo debe ser una imagen"
        )
    
    # Verificar extensión
    extension = imagen.content_type.split('/')[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato de imagen no permitido. Formatos permitidos: {', '.join(ALLOWED_EXTENSIONS)}"
        )

def serialize_producto_response(producto_response):
    """Convierte un ProductoInDB a un diccionario serializable para JSON"""
    try:
        logger.info(f"Serializando producto {producto_response.id}")
        serialized = {
            "id": producto_response.id,
            "nombre": producto_response.nombre,
            "descripcion": producto_response.descripcion,
            "precio_montura": producto_response.precio_montura,
            "precio_sin_montura": producto_response.precio_sin_montura,
            "categoria": producto_response.categoria,
            "badge": producto_response.badge,
            "ancho": producto_response.ancho,
            "largo": producto_response.largo,
            "imagen_base64": producto_response.imagen_base64,
            "created_at": producto_response.created_at.isoformat() if producto_response.created_at else None,
            "updated_at": producto_response.updated_at.isoformat() if producto_response.updated_at else None
        }
        logger.info(f"Producto {producto_response.id} serializado exitosamente")
        return serialized
    except Exception as e:
        logger.error(f"Error serializando producto {producto_response.id}: {str(e)}")
        raise e

@router.get("/", response_model=List[ProductoInDB])
async def listar_productos(
    categoria: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Lista todos los productos con paginación opcional"""
    try:
        query = db.query(ModelProducto)
        
        # Filtrar por categoría si se especifica
        if categoria:
            query = query.filter(ModelProducto.categoria == categoria)
        
        # Aplicar paginación
        productos = query.offset(offset).limit(limit).all()
        
        # Convertir a formato de respuesta con imágenes
        productos_response = []
        for producto in productos:
            producto_dict = ProductoInDB.from_orm_with_image(producto)
            productos_response.append(producto_dict)
        
        return productos_response
    
    except Exception as e:
        logger.error(f"Error al listar productos: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error interno al obtener productos"
        )

@router.get("/{producto_id}", response_model=ProductoInDB)
async def obtener_producto(producto_id: int, db: Session = Depends(get_db)):
    """Obtiene un producto específico por ID"""
    try:
        producto = db.query(ModelProducto).filter(ModelProducto.id == producto_id).first()
        
        if not producto:
            raise HTTPException(
                status_code=404,
                detail="Producto no encontrado"
            )
        
        return ProductoInDB.from_orm_with_image(producto)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener producto {producto_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error interno al obtener el producto"
        )

@router.post("/", response_model=ProductoInDB, status_code=status.HTTP_201_CREATED)
async def crear_producto(
    nombre: str = Form(..., max_length=100),
    descripcion: str = Form("", max_length=1000),
    precio_montura: float = Form(..., gt=0),
    precio_sin_montura: float = Form(..., gt=0),
    categoria: str = Form(...),
    badge: Optional[str] = Form(None, max_length=20),
    ancho: Optional[float] = Form(None, gt=0),
    largo: Optional[float] = Form(None, gt=0),
    imagen: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Crea un nuevo producto"""
    try:
        # Validar categoría
        categorias_validas = ['banos', 'sala', 'alcoba', 'con-luces', 'adornos']
        if categoria not in categorias_validas:
            raise HTTPException(
                status_code=400,
                detail=f"Categoría inválida. Categorías válidas: {', '.join(categorias_validas)}"
            )
        
        # Procesar imagen si existe
        imagen_data = None
        imagen_mimetype = None
        
        if imagen and imagen.filename:
            # Validar imagen
            validate_image(imagen)
            
            # Leer datos de la imagen
            imagen_content = await imagen.read()
            
            # Verificar tamaño
            if len(imagen_content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"La imagen es demasiado grande. Tamaño máximo: {MAX_FILE_SIZE // (1024*1024)}MB"
                )
            
            imagen_data = imagen_content
            imagen_mimetype = imagen.content_type

        # Crear producto en la base de datos
        db_producto = ModelProducto(
            nombre=nombre.strip(),
            descripcion=descripcion.strip(),
            precio_montura=precio_montura,
            precio_sin_montura=precio_sin_montura,
            categoria=categoria,
            badge=badge.strip() if badge else None,
            ancho=ancho,
            largo=largo,
            imagen_data=imagen_data,
            imagen_mimetype=imagen_mimetype
        )
        
        db.add(db_producto)
        db.commit()
        db.refresh(db_producto)
        
        logger.info(f"Producto creado exitosamente: {db_producto.id}")
        
        # Devolver respuesta con mensaje de éxito
        logger.info(f"Convirtiendo producto {db_producto.id} a ProductoInDB")
        producto_response = ProductoInDB.from_orm_with_image(db_producto)
        logger.info(f"Producto {db_producto.id} convertido exitosamente")
        
        logger.info(f"Serializando respuesta para producto {db_producto.id}")
        serialized_data = serialize_producto_response(producto_response)
        logger.info(f"Respuesta serializada exitosamente para producto {db_producto.id}")
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "message": "Producto creado exitosamente",
                "data": serialized_data,
                "success": True
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear producto: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error interno al crear el producto"
        )

@router.put("/{producto_id}", response_model=ProductoInDB)
async def actualizar_producto(
    producto_id: int,
    nombre: Optional[str] = Form(None, max_length=100),
    descripcion: Optional[str] = Form(None, max_length=1000),
    precio_montura: Optional[float] = Form(None, gt=0),
    precio_sin_montura: Optional[float] = Form(None, gt=0),
    categoria: Optional[str] = Form(None),
    badge: Optional[str] = Form(None, max_length=20),
    ancho: Optional[float] = Form(None, gt=0),
    largo: Optional[float] = Form(None, gt=0),
    imagen: Optional[UploadFile] = File(None),
    mantener_imagen: bool = Form(True),  # Nueva opción para mantener imagen existente
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Actualiza un producto existente"""
    try:
        # Buscar producto
        producto = db.query(ModelProducto).filter(ModelProducto.id == producto_id).first()
        if not producto:
            raise HTTPException(
                status_code=404,
                detail="Producto no encontrado"
            )

        # Validar categoría si se proporciona
        if categoria:
            categorias_validas = ['banos', 'sala', 'alcoba', 'con-luces', 'adornos']
            if categoria not in categorias_validas:
                raise HTTPException(
                    status_code=400,
                    detail=f"Categoría inválida. Categorías válidas: {', '.join(categorias_validas)}"
                )

        # Actualizar campos básicos
        if nombre is not None:
            producto.nombre = nombre.strip()
        if descripcion is not None:
            producto.descripcion = descripcion.strip()
        if precio_montura is not None:
            producto.precio_montura = precio_montura
        if precio_sin_montura is not None:
            producto.precio_sin_montura = precio_sin_montura
        if categoria is not None:
            producto.categoria = categoria
        if badge is not None:
            producto.badge = badge.strip() if badge else None
        if ancho is not None:
            producto.ancho = ancho
        if largo is not None:
            producto.largo = largo
        
        # Manejar imagen
        if imagen and imagen.filename:
            # Validar nueva imagen
            validate_image(imagen)
            
            imagen_content = await imagen.read()
            
            # Verificar tamaño
            if len(imagen_content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"La imagen es demasiado grande. Tamaño máximo: {MAX_FILE_SIZE // (1024*1024)}MB"
                )
            
            producto.imagen_data = imagen_content
            producto.imagen_mimetype = imagen.content_type
        elif not mantener_imagen:
            # Eliminar imagen existente si se especifica
            producto.imagen_data = None
            producto.imagen_mimetype = None

        db.commit()
        db.refresh(producto)
        
        logger.info(f"Producto actualizado exitosamente: {producto_id}")
        
        # Devolver respuesta con mensaje de éxito
        producto_response = ProductoInDB.from_orm_with_image(producto)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Producto actualizado exitosamente",
                "data": serialize_producto_response(producto_response),
                "success": True
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar producto {producto_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error interno al actualizar el producto"
        )

@router.delete("/{producto_id}")
async def eliminar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Elimina un producto"""
    try:
        producto = db.query(ModelProducto).filter(ModelProducto.id == producto_id).first()
        if not producto:
            raise HTTPException(
                status_code=404,
                detail="Producto no encontrado"
            )
        
        nombre_producto = producto.nombre
        db.delete(producto)
        db.commit()
        
        logger.info(f"Producto eliminado exitosamente: {producto_id}")
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Producto '{nombre_producto}' eliminado correctamente",
                "id": producto_id,
                "success": True
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar producto {producto_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error interno al eliminar el producto"
        )

@router.get("/categoria/{categoria}", response_model=List[ProductoInDB])
async def listar_productos_por_categoria(
    categoria: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Lista productos por categoría específica"""
    try:
        categorias_validas = ['banos', 'sala', 'alcoba', 'con-luces', 'adornos']
        if categoria not in categorias_validas:
            raise HTTPException(
                status_code=400,
                detail=f"Categoría inválida. Categorías válidas: {', '.join(categorias_validas)}"
            )
        
        productos = db.query(ModelProducto)\
                     .filter(ModelProducto.categoria == categoria)\
                     .offset(offset)\
                     .limit(limit)\
                     .all()
        
        productos_response = []
        for producto in productos:
            producto_dict = ProductoInDB.from_orm_with_image(producto)
            productos_response.append(producto_dict)
        
        return productos_response
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al listar productos por categoría {categoria}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error interno al obtener productos por categoría"
        )