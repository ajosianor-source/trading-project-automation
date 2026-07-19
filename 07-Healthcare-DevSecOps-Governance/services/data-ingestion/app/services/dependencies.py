from fastapi import Request

from app.services.container import ServiceContainer


def container(request: Request) -> ServiceContainer:
    return request.app.state.container
