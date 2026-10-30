from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
  title=settings.app_name,
  version='0.1.0',
)

app.add_middleware(
  CORSMiddleware,
  allow_credentials=True,
  allow_headers=['*'],
  allow_methods=['*'],
  allow_origins=settings.cors_origins,
)

app.include_router(router, prefix=settings.api_prefix)


@app.get('/')
def read_root():
  index_file = Path(__file__).resolve().parents[2] / 'frontend' / 'dist' / 'index.html'
  if index_file.is_file():
    return FileResponse(index_file)
  return {'message': 'AI Study Assistant backend is running.'}


FRONTEND_DIST = Path(__file__).resolve().parents[2] / 'frontend' / 'dist'
if (FRONTEND_DIST / 'assets').is_dir():
  app.mount('/assets', StaticFiles(directory=FRONTEND_DIST / 'assets'), name='assets')


@app.get('/{path:path}', include_in_schema=False)
def frontend_routes(path: str):
  requested_file = (FRONTEND_DIST / path).resolve()
  if requested_file.is_relative_to(FRONTEND_DIST.resolve()) and requested_file.is_file():
    return FileResponse(requested_file)

  index_file = FRONTEND_DIST / 'index.html'
  if index_file.is_file():
    return FileResponse(index_file)
  raise HTTPException(status_code=404, detail='Frontend build not found.')
