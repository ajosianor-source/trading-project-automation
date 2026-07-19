FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN groupadd --gid 10001 healthgov && useradd --uid 10001 --gid healthgov --no-create-home healthgov
WORKDIR /app
COPY pyproject.toml .
COPY app ./app
COPY ingestion_orchestrator.py .
RUN pip install .
RUN mkdir -p /data/dicom-quarantine && chown -R 10001:10001 /data
USER 10001:10001
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host=0.0.0.0", "--port=8000", "--proxy-headers"]

