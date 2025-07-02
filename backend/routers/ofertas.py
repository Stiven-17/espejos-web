from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import models
from backend.schemas import OfertaCreate, OfertaUpdate, OfertaInDB
from backend.auth import get_current_admin
from backend.database import get_db
import logging

router = APIRouter()

# Configurar logging
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[OfertaInDB])
async def listar_ofertas(db: Session = Depends(get_db)):
    """Obtiene todas las ofertas disponibles"""
    try:
        logger.info("Obteniendo lista de ofertas")
        ofertas = db.query(models.Oferta).all()
        logger.info(f"Se encontraron {len(ofertas)} ofertas")
        return ofertas
    except Exception as e:
        logger.error(f"Error al listar ofertas: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener ofertas")

@router.get("/{oferta_id}", response_model=OfertaInDB)
async def obtener_oferta(oferta_id: int, db: Session = Depends(get_db)):
    """Obtiene una oferta específica por ID"""
    try:
        logger.info(f"Obteniendo oferta ID: {oferta_id}")
        oferta = db.query(models.Oferta).filter(models.Oferta.id == oferta_id).first()
        if not oferta:
            logger.warning(f"Oferta no encontrada ID: {oferta_id}")
            raise HTTPException(status_code=404, detail="Oferta no encontrada")
        return oferta
    except Exception as e:
        logger.error(f"Error al obtener oferta ID {oferta_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener la oferta")

@router.post("/", response_model=OfertaInDB, status_code=status.HTTP_201_CREATED)
async def crear_oferta(
    texto: str = Form(...),
    icono: str = Form("fas fa-tag"),
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Crea una nueva oferta"""
    try:
        logger.info(f"Creando nueva oferta: {texto}")
        
        if not texto or len(texto.strip()) < 3:
            raise HTTPException(
                status_code=400,
                detail="El texto de la oferta debe tener al menos 3 caracteres"
            )
        
        oferta = models.Oferta(
            texto=texto,
            icono=icono
        )
        
        db.add(oferta)
        db.commit()
        db.refresh(oferta)
        
        logger.info(f"Oferta creada con ID: {oferta.id}")
        
        # Devolver respuesta con mensaje de éxito
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "message": "Oferta creada exitosamente",
                "data": {
                    "id": oferta.id,
                    "texto": oferta.texto,
                    "icono": oferta.icono,
                    "created_at": oferta.created_at.isoformat(),
                    "updated_at": oferta.updated_at.isoformat()
                },
                "success": True
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear oferta: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al crear la oferta: {str(e)}"
        )

@router.put("/{oferta_id}", response_model=OfertaInDB)
async def actualizar_oferta(
    oferta_id: int,
    texto: Optional[str] = Form(None),
    icono: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Actualiza una oferta existente"""
    try:
        logger.info(f"Actualizando oferta ID: {oferta_id}")
        
        oferta = db.query(models.Oferta).filter(models.Oferta.id == oferta_id).first()
        if not oferta:
            logger.warning(f"Oferta no encontrada ID: {oferta_id}")
            raise HTTPException(status_code=404, detail="Oferta no encontrada")
        
        if texto is not None:
            if len(texto.strip()) < 3:
                raise HTTPException(
                    status_code=400,
                    detail="El texto de la oferta debe tener al menos 3 caracteres"
                )
            oferta.texto = texto
        
        if icono is not None:
            oferta.icono = icono
        
        db.commit()
        db.refresh(oferta)
        
        logger.info(f"Oferta actualizada ID: {oferta.id}")
        
        # Devolver respuesta con mensaje de éxito
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Oferta actualizada exitosamente",
                "data": {
                    "id": oferta.id,
                    "texto": oferta.texto,
                    "icono": oferta.icono,
                    "created_at": oferta.created_at.isoformat(),
                    "updated_at": oferta.updated_at.isoformat()
                },
                "success": True
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar oferta ID {oferta_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al actualizar la oferta: {str(e)}"
        )

@router.delete("/{oferta_id}")
async def eliminar_oferta(
    oferta_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Elimina una oferta"""
    try:
        logger.info(f"Eliminando oferta ID: {oferta_id}")
        
        oferta = db.query(models.Oferta).filter(models.Oferta.id == oferta_id).first()
        if not oferta:
            logger.warning(f"Oferta no encontrada ID: {oferta_id}")
            raise HTTPException(status_code=404, detail="Oferta no encontrada")
        
        texto_oferta = oferta.texto
        db.delete(oferta)
        db.commit()
        
        logger.info(f"Oferta eliminada ID: {oferta_id}")
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Oferta '{texto_oferta}' eliminada correctamente",
                "id": oferta_id,
                "success": True
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar oferta ID {oferta_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al eliminar la oferta: {str(e)}"
        )