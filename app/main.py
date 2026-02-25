import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routes import router
from app.config import settings

app = FastAPI(title="SentiPulse Reviews Taker API")

app.include_router(router, prefix="/api")

# Dynamic page routes — brand_name and branch_name come from the URL path
@app.get("/pk/{brand_name}/{branch_name}/inputform")
async def serve_inputform(brand_name: str, branch_name: str):
    return FileResponse("app/static/inputform/index.html")

@app.get("/pk/{brand_name}/{branch_name}/qrform")
async def serve_qrform(brand_name: str, branch_name: str):
    return FileResponse("app/static/qrform/index.html")

# Static asset mounts (CSS, JS, images) at fixed paths
app.mount("/static/inputform", StaticFiles(directory="app/static/inputform"), name="inputform_static")
app.mount("/static/qrform", StaticFiles(directory="app/static/qrform"), name="qrform_static")

@app.get("/")
async def root():
    return {
        "message": "SentiPulse Reviews Taker Server is Running",
        "endpoints": {
            "Input Form": "/pk/{brand_name}/{branch_name}/inputform",
            "QR Form": "/pk/{brand_name}/{branch_name}/qrform"
        },
        "config": {
            "database": settings.DATABASE_NAME,
            "collection": settings.COLLECTION_NAME
        }
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
