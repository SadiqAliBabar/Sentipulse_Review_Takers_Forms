import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routes import router
from app.config import settings

app = FastAPI(title="SentiPulse Reviews Taker API")

app.include_router(router, prefix="/api")

app.mount("/inputform", StaticFiles(directory="app/static/inputform", html=True), name="inputform")
app.mount("/qrform", StaticFiles(directory="app/static/qrform", html=True), name="qrform")

@app.get("/")
async def root():
    return {
        "message": "SentiPulse Reviews Taker Server is Running",
        "endpoints": {
            "Input Form": "/inputform",
            "QR Form": "/qrform"
        },
        "config": {
            "database": settings.DATABASE_NAME,
            "collection": settings.COLLECTION_NAME
        }
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
