from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
def read_root() -> dict[str, str]:
  return {'message': 'AI Study Assistant backend is running.'}
