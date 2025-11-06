"""
ASGI config for bike_erp project.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bike_erp.settings')

application = get_asgi_application()
