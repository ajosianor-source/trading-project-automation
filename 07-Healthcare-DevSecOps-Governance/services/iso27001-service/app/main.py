from healthgov.control_catalogs import ISO27001_CONTROLS
from healthgov.framework_api import framework_router
from healthgov.middleware import secure_app

app = secure_app("iso27001-service")
app.include_router(framework_router("ISO27001", "2022", ISO27001_CONTROLS))
