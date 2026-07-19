from healthgov.control_catalogs import DSP_CONTROLS
from healthgov.framework_api import framework_router
from healthgov.middleware import secure_app

app = secure_app("dsp-toolkit-service")
app.include_router(framework_router("NHS_DSPT", "2025-26-v8", DSP_CONTROLS))
