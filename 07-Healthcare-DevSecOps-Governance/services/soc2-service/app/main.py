from healthgov.control_catalogs import SOC2_CONTROLS
from healthgov.framework_api import framework_router
from healthgov.middleware import secure_app

app = secure_app("soc2-service")
app.include_router(
    framework_router("SOC2", "2017-TSC-revised-points-of-focus-2022", SOC2_CONTROLS)
)
