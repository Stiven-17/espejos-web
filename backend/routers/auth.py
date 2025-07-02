from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Annotated

from backend.database import get_db
from backend.schemas import Token
from backend.auth import (
    authenticate_admin,
    create_access_token,
    get_current_admin
)

router = APIRouter()

# Configuración de tiempo de expiración del token
ACCESS_TOKEN_EXPIRE_MINUTES = 30

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    admin = authenticate_admin(db, form_data.username, form_data.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin.email},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/verify")
async def verify_token(current_admin: dict = Depends(get_current_admin)):
    """Endpoint para verificar si el token es válido"""
    return {"valid": True}