#!/usr/bin/env python
"""
Vérification des URLs de l'application
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bike_erp.settings')
django.setup()

from django.urls import get_resolver

def check_repair_urls():
    """Vérifie les URLs contenant 'repair'"""
    resolver = get_resolver()
    print('URL patterns contenant "repair":')
    
    def check_pattern(pattern, prefix=''):
        if hasattr(pattern, 'url_patterns'):
            for sub_pattern in pattern.url_patterns:
                check_pattern(sub_pattern, prefix)
        elif hasattr(pattern, 'pattern'):
            pattern_str = str(pattern.pattern)
            if 'repair' in pattern_str.lower():
                print(f'  {prefix}{pattern.pattern} -> {pattern.callback}')
        elif hasattr(pattern, '_regex'):
            if 'repair' in str(pattern._regex).lower():
                print(f'  {prefix}{pattern._regex} -> {pattern.callback}')
    
    for pattern in resolver.url_patterns:
        check_pattern(pattern)

if __name__ == '__main__':
    check_repair_urls()
