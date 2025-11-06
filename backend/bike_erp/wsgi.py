"""
WSGI config for bike_erp project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bike_erp.settings')

application = get_wsgi_application()
