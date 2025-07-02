from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi import HTTPException
from dotenv import load_dotenv
from database import engine
from models import Base
from routers import auth, productos, ofertas, compras
import logging
from pathlib import Path

# Configura logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="La Galería del Espejo API",
    description="API para la tienda de espejos decorativos",
    version="1.0.0"
)

class CloseConnectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Connection"] = "close"
        return response

app.add_middleware(CloseConnectionMiddleware)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    try:
        response = await call_next(request)
        response.headers["Connection"] = "close"
        return response
    except Exception as e:
        logger.error(f"Error en middleware: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica tus dominios
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # O ["GET", "POST", "PUT", "DELETE"]
    allow_headers=["*"],
)

# Configuración de rutas estáticas
frontend_path = Path(__file__).parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=frontend_path / "static"), name="static")
app.mount("/templates", StaticFiles(directory=frontend_path / "templates"), name="templates")

@app.get("/")
async def read_root():
    return FileResponse(frontend_path / "templates/index.html")

@app.get("/detalle")
async def read_detail(id: int = None):
    if id is None:
        return FileResponse(frontend_path / "templates/index.html")
    return FileResponse(frontend_path / "templates/detalle.html")

# Ruta para detalle.html
@app.get("/detalle.html")
async def read_detail_html(id: int = None):
    return FileResponse(frontend_path / "templates/detalle.html")

# Routers

app.include_router(productos.router, prefix="/api/productos", tags=["productos"])
app.include_router(ofertas.router, prefix="/api/ofertas", tags=["ofertas"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(compras.router, prefix="/api/compras", tags=["compras"])

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    logger.error(f"HTTPException: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Excepción no manejada: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "Error interno del servidor"}
    )