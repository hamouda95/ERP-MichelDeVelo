#!/usr/bin/env python
"""
Service SMS 100% gratuit - Free Mobile API
Pour les clients Free Mobile en France
"""
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class FreeMobileSMSService:
    """Service SMS gratuit via Free Mobile API"""
    
    def __init__(self):
        self.user = getattr(settings, 'FREE_MOBILE_USER', '')
        self.api_key = getattr(settings, 'FREE_MOBILE_API_KEY', '')
    
    def send_sms(self, to_phone, message, store=None):
        """
        Envoyer un SMS gratuit via Free Mobile
        
        Args:
            to_phone (str): Numéro du destinataire (format international)
            message (str): Message à envoyer (max 160 caractères)
            store (str): Magasin (optionnel)
            
        Returns:
            dict: {'success': bool, 'message': str}
        """
        try:
            # Vérifier la configuration
            if not self.user or not self.api_key:
                return {
                    'success': False,
                    'message': 'Configuration Free Mobile manquante (FREE_MOBILE_USER, FREE_MOBILE_API_KEY)'
                }
            
            # Limiter le message à 160 caractères
            if len(message) > 160:
                message = message[:157] + '...'
            
            # Nettoyer le numéro (format international)
            to_phone = self._clean_phone_number(to_phone)
            
            # Envoyer via API Free Mobile
            url = f"https://smsapi.free-mobile.fr/sendmsg?user={self.user}&pass={self.api_key}&msg={message}"
            
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                logger.info(f"SMS Free Mobile envoyé avec succès vers {to_phone}")
                return {
                    'success': True,
                    'message': 'SMS envoyé avec succès via Free Mobile',
                    'phone_used': 'Free Mobile API',
                    'store': store
                }
            else:
                error_msg = f"Erreur Free Mobile: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {
                    'success': False,
                    'message': error_msg,
                    'phone_used': None,
                    'store': store
                }
                
        except Exception as e:
            error_msg = f"Erreur inattendue Free Mobile: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'message': error_msg,
                'phone_used': None,
                'store': store
            }
    
    def _clean_phone_number(self, phone):
        """Nettoyer le numéro pour la France"""
        # Supprimer tous les caractères non numériques
        phone = ''.join(c for c in phone if c.isdigit())
        
        # Ajouter le préfixe français si nécessaire
        if len(phone) == 10 and phone.startswith('0'):
            phone = '+33' + phone[1:]
        elif len(phone) == 9 and phone.startswith('6'):
            phone = '+33' + phone
        elif len(phone) == 9 and phone.startswith('7'):
            phone = '+33' + phone
            
        return phone

# Instance globale
free_mobile_service = FreeMobileSMSService()
