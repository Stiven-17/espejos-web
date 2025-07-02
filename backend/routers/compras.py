from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse, JSONResponse
from urllib.parse import quote

router = APIRouter()

@router.post("/enviar", tags=["compras"])
async def enviar_compra(
    nombre: str = Form(...),
    apellido: str = Form(...),
    ubicacion: str = Form(...),
    telefono: str = Form(...),
    pago: str = Form(...),
    nombre_espejo: str = Form(...),
    enlace_espejo: str = Form(...),
):
    mensaje = (
        f"*Nuevo Pedido*\n"
        f"Nombre del Espejo: {nombre_espejo}\n"
        f"Espejo: {enlace_espejo}\n"
        f"Cliente: {nombre} {apellido}\n"
        f"Ubicación: {ubicacion}\n"
        f"Teléfono: {telefono}\n"
        f"Método de pago: {pago}"
    )
    url = f"https://wa.me/573053646901?text={quote(mensaje)}"
    # Puedes devolver un redirect o el enlace como JSON
    return JSONResponse({"whatsapp_url": url})
    # O para redirigir directamente:
    # return RedirectResponse(url=url, status_code=302)
