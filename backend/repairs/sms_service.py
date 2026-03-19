import os
import logging
from django.conf import settings
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)

class SMSService:
    """Service d'envoi de SMS via Twilio avec gestion multi-magasins"""
    
    def __init__(self):
        self.client = None
        if getattr(settings, 'TWILIO_ACCOUNT_SID', None) and getattr(settings, 'TWILIO_AUTH_TOKEN', None):
            self.client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )
    
    def get_phone_number_for_store(self, store):
        """
        Obtenir le numéro de téléphone approprié selon le magasin
        
        Args:
            store (str): Identifiant du magasin ('ville_avray' ou 'garches')
            
        Returns:
            str: Numéro de téléphone à utiliser
        """
        phone_mapping = {
            'ville_avray': getattr(settings, 'PHONE_NUMBER_VILLE_AVRAY', None),
            'garches': getattr(settings, 'PHONE_NUMBER_GARCHES', None)
        }
        
        phone_number = phone_mapping.get(store)
        
        if not phone_number:
            # Fallback sur le numéro par défaut
            phone_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)
            logger.warning(f"Pas de numéro configuré pour le magasin {store}, utilisation du numéro par défaut: {phone_number}")
        
        return phone_number
    
    def send_sms(self, to_phone, message, from_name=None, store=None):
        """
        Envoyer un SMS avec gestion multi-magasins
        
        Args:
            to_phone (str): Numéro de téléphone du destinataire
            message (str): Message à envoyer
            from_name (str): Nom de l'expéditeur (optionnel)
            store (str): Magasin de la réparation (optionnel)
        
        Returns:
            dict: {'success': bool, 'message': str, 'sid': str, 'phone_used': str, 'store': str}
        """
        try:
            # Vérifier si le service SMS est activé
            if not getattr(settings, 'SMS_ENABLED', False):
                return {
                    'success': False,
                    'message': 'Service SMS désactivé',
                    'sid': None,
                    'phone_used': None,
                    'store': store
                }
            
            # Vérifier si le client Twilio est configuré
            if not self.client:
                return {
                    'success': False,
                    'message': 'Client Twilio non configuré',
                    'sid': None,
                    'phone_used': None,
                    'store': store
                }
            
            # Déterminer le numéro de téléphone à utiliser
            if store:
                from_number = self.get_phone_number_for_store(store)
            else:
                from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)
            
            if not from_number:
                return {
                    'success': False,
                    'message': 'Aucun numéro de téléphone configuré',
                    'sid': None,
                    'phone_used': None,
                    'store': store
                }
            
            # Nettoyer le numéro de téléphone du destinataire
            to_phone = self._clean_phone_number(to_phone)
            
            # Mode test : logger au lieu d'envoyer
            if getattr(settings, 'SMS_TEST_MODE', False):
                logger.info(f"[SMS TEST] Vers: {to_phone}, De: {from_number}, Message: {message}, Magasin: {store}")
                return {
                    'success': True,
                    'message': 'SMS envoyé en mode test',
                    'sid': 'test-mode-sid',
                    'phone_used': from_number,
                    'store': store
                }
            
            # Envoyer le SMS
            message_instance = self.client.messages.create(
                body=message,
                from_=from_number,
                to=to_phone
            )
            
            logger.info(f"SMS envoyé avec succès vers {to_phone}, SID: {message_instance.sid}, Numéro utilisé: {from_number}, Magasin: {store}")
            
            return {
                'success': True,
                'message': 'SMS envoyé avec succès',
                'sid': message_instance.sid,
                'phone_used': from_number,
                'store': store
            }
            
        except TwilioRestException as e:
            error_message = f"Erreur Twilio: {str(e)}"
            logger.error(error_message)
            return {
                'success': False,
                'message': error_message,
                'sid': None,
                'phone_used': None,
                'store': store
            }
        except Exception as e:
            error_message = f"Erreur inattendue: {str(e)}"
            logger.error(error_message)
            return {
                'success': False,
                'message': error_message,
                'sid': None,
                'phone_used': None,
                'store': store
            }
    
    def _clean_phone_number(self, phone):
        """
        Nettoyer et formater le numéro de téléphone
        
        Args:
            phone (str): Numéro à nettoyer
            
        Returns:
            str: Numéro formaté pour Twilio
        """
        # Supprimer tous les caractères non numériques sauf +
        phone = ''.join(c for c in phone if c.isdigit() or c == '+')
        
        # S'assurer que le numéro commence par +
        if not phone.startswith('+'):
            # Ajouter le préfixe français si absent
            if phone.startswith('0') and len(phone) == 10:
                phone = '+33' + phone[1:]
            elif phone.startswith('6') or phone.startswith('7'):
                phone = '+' + phone
            else:
                phone = '+33' + phone
        
        return phone
    
    def get_account_info(self):
        """
        Obtenir les informations du compte Twilio
        
        Returns:
            dict: Informations du compte ou erreur
        """
        try:
            if not self.client:
                return {
                    'success': False,
                    'message': 'Client Twilio non configuré'
                }
            
            account = self.client.api.accounts(settings.TWILIO_ACCOUNT_SID).fetch()
            
            return {
                'success': True,
                'account_sid': account.sid,
                'friendly_name': account.friendly_name,
                'status': account.status,
                'type': account.type,
                'date_created': account.date_created
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f"Erreur: {str(e)}"
            }
    
    def get_store_phone_numbers(self):
        """
        Obtenir la configuration des numéros par magasin
        
        Returns:
            dict: Configuration des numéros par magasin
        """
        return {
            'ville_avray': getattr(settings, 'PHONE_NUMBER_VILLE_AVRAY', None),
            'garches': getattr(settings, 'PHONE_NUMBER_GARCHES', None),
            'default': getattr(settings, 'TWILIO_PHONE_NUMBER', None)
        }

# Instance globale du service SMS
sms_service = SMSService()
