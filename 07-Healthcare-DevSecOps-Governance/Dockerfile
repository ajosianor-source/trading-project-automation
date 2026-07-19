FROM python:3.12.10-slim AS runtime
ARG SERVICE
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/app/shared:/app
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid app --no-create-home app
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir .
COPY shared ./shared
COPY services/${SERVICE} ./service
USER 10001:10001
EXPOSE 8000
CMD ["uvicorn", "service.app.main:app", "--host=0.0.0.0", "--port=8000", "--proxy-headers"]
