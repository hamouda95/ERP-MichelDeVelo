#!/usr/bin/env python
"""
Vérification des statuts de réparations
"""
import requests

def check_statuses():
    """Vérifie les statuts disponibles"""
    
    # Obtenir un token
    login_response = requests.post('http://127.0.0.1:8000/api/token/', json={'username': 'test@bikeerp.com', 'password': 'test123'})
    if login_response.status_code != 200:
        print('❌ Login failed')
        return
    
    token = login_response.json()['access']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Vérifier les statuts disponibles
    response = requests.get('http://127.0.0.1:8000/api/repairs/repairs/', headers=headers)
    if response.status_code == 200:
        data = response.json()
        repairs = data.get('results', data)
        statuses = set()
        
        for repair in repairs:
            if isinstance(repair, dict) and 'status' in repair:
                statuses.add(repair['status'])
        
        print('Statuts disponibles dans le backend:')
        for status in sorted(statuses):
            print(f'  - {status}')
        
        print('\nColonnes Kanban dans le frontend:')
        columns = ['pending', 'in_progress', 'completed', 'delivered']
        for col in columns:
            print(f'  - {col}')
            
        print('\nCorrespondance:')
        for col in columns:
            count = len([r for r in repairs if r.get('status') == col])
            print(f'  {col}: {count} réparations')
    else:
        print(f'❌ Erreur API: {response.status_code}')

if __name__ == '__main__':
    check_statuses()
