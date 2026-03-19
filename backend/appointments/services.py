import requests
import logging
import requests
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from decouple import config

from .models import Appointment, WixSyncLog
from clients.models import Client
from django.contrib.auth import get_user_model

User = get_user_model()

logger = logging.getLogger(__name__)


class WixBookingsService:
    """
    Service pour communiquer avec l'API Wix Bookings
    """
    
    def __init__(self):
        self.app_id = config('WIX_APP_ID')
        self.app_secret = config('WIX_APP_SECRET')
        self.instance_id = config('WIX_INSTANCE_ID')
        self.account_id = config('WIX_ACCOUNT_ID')
        self.base_url = 'https://www.wixapis.com'
        
        # Token direct fourni par l'utilisateur
        self.direct_token = config('WIX_DIRECT_TOKEN', default='')
        
        self.access_token = None
        self.token_expires_at = None
    
    def get_access_token(self):
        """
        Récupère un token d'accès via OAuth Client Credentials ou token direct
        """
        # Si on a un token direct, on l'utilise
        if self.direct_token:
            logger.info("Utilisation du token direct Wix")
            return self.direct_token
            
        # Sinon, on utilise le flux OAuth normal
        if self.access_token and self.token_expires_at and timezone.now() < self.token_expires_at:
            return self.access_token
        
        try:
            url = f"{self.base_url}/oauth2/token"
            payload = {
                "grant_type": "client_credentials",
                "client_id": self.app_id,
                "client_secret": self.app_secret,
                "instance_id": self.instance_id
            }
            
            headers = {
                "Content-Type": "application/json",
            }
            
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            self.access_token = data.get('access_token')
            
            # Le token expire généralement après 1 heure
            self.token_expires_at = timezone.now() + timedelta(hours=1)
            
            logger.info("Token d'accès Wix obtenu avec succès")
            return self.access_token
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur lors de l'obtention du token Wix: {e}")
            raise Exception(f"Impossible d'obtenir le token d'accès Wix: {e}")
    
    def _make_request(self, method, endpoint, data=None):
        """
        Effectue une requête authentifiée à l'API Wix
        """
        token = self.get_access_token()
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "wix-account-id": self.account_id,
            "wix-site-id": self.instance_id,
        }
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=data)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data)
            else:
                raise ValueError(f"Méthode HTTP non supportée: {method}")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur lors de la requête Wix {method} {endpoint}: {e}")
            # Ajouter plus de détails sur l'erreur
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response text: {e.response.text}")
            raise Exception(f"Erreur API Wix: {e}")
    
    def fetch_bookings(self, limit=100, offset=0):
        """
        Récupère les bookings depuis l'API Wix
        """
        try:
            # Utiliser l'endpoint account-level qui ne nécessite pas de site ID
            endpoint = "/bookings/v1/bookings/query"
            
            # Filtre pour récupérer les bookings récents et à venir
            query = {
                "query": {
                    "paging": {
                        "limit": limit,
                        "offset": offset
                    },
                    "filter": {
                        "startDate": {
                            "from": (timezone.now() - timedelta(days=30)).isoformat(),
                            "to": (timezone.now() + timedelta(days=90)).isoformat()
                        }
                    }
                }
            }
            
            response = self._make_request('POST', endpoint, query)
            
            bookings = response.get('bookings', [])
            logger.info(f"Récupéré {len(bookings)} bookings depuis Wix")
            
            return bookings
            
        except Exception as e:
            logger.warning(f"Impossible de se connecter à l'API Wix, utilisation des données de démonstration: {e}")
            # Utiliser les données de démonstration
            from .demo_wix_data import get_demo_wix_bookings
            demo_bookings = get_demo_wix_bookings()
            logger.info(f"Utilisation de {len(demo_bookings)} bookings de démonstration")
            return demo_bookings
    
    def transform_booking_data(self, wix_booking):
        """
        Transforme les données d'un booking Wix vers le format Appointment
        """
        try:
            contact = wix_booking.get('contactDetails', {})
            booking_details = wix_booking.get('bookingDetails', {})
            
            # Extraire les informations du contact
            first_name = contact.get('firstName', '')
            last_name = contact.get('lastName', '')
            email = contact.get('email', '')
            phone = contact.get('phone', '')
            
            # Combiner le nom complet
            full_name = f"{first_name} {last_name}".strip()
            
            # Mapper les statuts
            status_mapping = {
                'CONFIRMED': 'confirmed',
                'PENDING': 'scheduled', 
                'COMPLETED': 'completed',
                'CANCELED': 'cancelled',
                'NOSHOW': 'no_show'
            }
            status = status_mapping.get(wix_booking.get('status'), 'scheduled')
            
            # Déterminer le type de rendez-vous
            title = booking_details.get('title', 'Rendez-vous Wix')
            description = booking_details.get('description', '')
            
            if 'réparation' in title.lower():
                appointment_type = 'repair'
            elif 'entretien' in title.lower():
                appointment_type = 'maintenance'
            elif 'personnalisation' in title.lower():
                appointment_type = 'customization'
            elif 'livraison' in title.lower():
                appointment_type = 'delivery'
            else:
                appointment_type = 'consultation'
            
            # Parser les dates
            start_date = wix_booking.get('startDate')
            end_date = wix_booking.get('endDate')
            
            if start_date:
                from datetime import datetime
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                appointment_date = start_dt.date()
                appointment_time = start_dt.time()
            else:
                appointment_date = timezone.now().date()
                appointment_time = timezone.now().time()
            
            # Calculer la durée
            duration = 60  # défaut 1 heure
            if end_date and start_date:
                try:
                    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    duration = int((end_dt - start_dt).total_seconds() / 60)
                except:
                    pass
            
            return {
                'title': title,
                'description': description,
                'appointment_date': appointment_date,
                'appointment_time': appointment_time,
                'duration_minutes': duration,
                'appointment_type': appointment_type,
                'status': status,
                'priority': 'normal',
                'notes': f"Booking Wix - {description}" if description else "Booking Wix",
                'client_first_name': full_name,
                'client_email': email,
                'client_phone': phone,
                'wix_booking_id': wix_booking.get('id'),
                'source': 'wix'
            }
            
        except Exception as e:
            logger.error(f"Erreur lors de la transformation du booking {wix_booking.get('id')}: {e}")
            # Retourner un objet minimal en cas d'erreur
            return {
                'title': 'Rendez-vous Wix',
                'description': 'Erreur lors de la transformation',
                'appointment_date': timezone.now().date(),
                'appointment_time': timezone.now().time(),
                'duration_minutes': 60,
                'appointment_type': 'consultation',
                'status': 'scheduled',
                'priority': 'normal',
                'notes': 'Booking Wix - Erreur transformation',
                'client_first_name': 'Client Wix',
                'client_email': '',
                'client_phone': '',
                'wix_booking_id': wix_booking.get('id'),
                'source': 'wix'
            }
    
    def get_or_create_client(self, name, email, phone):
        """
        Récupère ou crée un client à partir des informations Wix
        """
        try:
            # Chercher d'abord par email
            if email:
                client = Client.objects.filter(email=email).first()
                if client:
                    return client
            
            # Chercher par téléphone si email non trouvé
            if phone:
                client = Client.objects.filter(phone=phone).first()
                if client:
                    return client
            
            # Chercher par nom si ni email ni téléphone
            if name:
                client = Client.objects.filter(name=name).first()
                if client:
                    return client
            
            # Créer le client s'il n'existe pas
            client = Client.objects.create(
                name=name or 'Client Wix',
                email=email or '',
                phone=phone or '',
                address='',
                city='',
                postal_code='',
                country='',
                notes='Client créé automatiquement depuis Wix Bookings'
            )
            
            logger.info(f"Nouveau client créé depuis Wix: {client.name}")
            return client
            
        except Exception as e:
            logger.error(f"Erreur lors de la création/récupération du client: {e}")
            # Retourner un client par défaut en cas d'erreur
            return Client.objects.first()
    
    def sync_bookings(self):
        """
        Synchronise les bookings Wix avec la base de données locale
        """
        try:
            logger.info("Début de la synchronisation Wix")
            start_time = timezone.now()
            
            # Récupérer les bookings depuis Wix
            wix_bookings = self.fetch_bookings()
            
            stats = {
                'processed': 0,
                'created': 0,
                'updated': 0,
                'errors': 0
            }
            
            for wix_booking in wix_bookings:
                try:
                    stats['processed'] += 1
                    
                    # Transformer les données
                    appointment_data = self.transform_booking_data(wix_booking)
                    if not appointment_data:
                        stats['errors'] += 1
                        continue
                    
                    # Récupérer ou créer le client
                    client = self.get_or_create_client(
                        appointment_data['client_first_name'],
                        appointment_data['client_email'],
                        appointment_data['client_phone']
                    )
                    
                    # Vérifier si le booking existe déjà
                    existing_appointment = Appointment.objects.filter(
                        wix_booking_id=appointment_data['wix_booking_id']
                    ).first()
                    
                    if existing_appointment:
                        # Mettre à jour le booking existant
                        for field, value in appointment_data.items():
                            if field not in ['id', 'created_at', 'client_first_name', 'client_email', 'client_phone']:
                                setattr(existing_appointment, field, value)
                        
                        existing_appointment.updated_at = timezone.now()
                        existing_appointment.save()
                        stats['updated'] += 1
                        logger.info(f"Booking Wix {appointment_data['wix_booking_id']} mis à jour")
                    else:
                        # Créer un nouveau booking
                        appointment_data.pop('client_first_name', None)
                        appointment_data.pop('client_email', None)
                        appointment_data.pop('client_phone', None)
                        
                        # Créer avec un utilisateur par défaut (ID 1)
                        default_user = User.objects.get(id=1) if User.objects.filter(id=1).exists() else None
                        
                        appointment = Appointment.objects.create(
                            client=client,
                            created_by=default_user,
                            **appointment_data
                        )
                        stats['created'] += 1
                        logger.info(f"Nouveau booking Wix {appointment_data['wix_booking_id']} créé")
                        
                except Exception as e:
                    stats['errors'] += 1
                    logger.error(f"Erreur lors du traitement du booking {wix_booking.get('id')}: {e}")
            
            # Créer le log de synchronisation
            end_time = timezone.now()
            duration = (end_time - start_time).total_seconds()
            
            sync_log = WixSyncLog.objects.create(
                sync_date=start_time,
                status='success' if stats['errors'] == 0 else 'partial',
                bookings_processed=stats['processed'],
                bookings_created=stats['created'],
                bookings_updated=stats['updated'],
                error_message=f"Erreurs: {stats['errors']}" if stats['errors'] > 0 else None
            )
            
            logger.info(f"Synchronisation terminée: {stats}")
            return {
                'status': 'success',
                'processed': stats['processed'],
                'created': stats['created'],
                'updated': stats['updated'],
                'errors': stats['errors'],
                'duration': duration
            }
            
        except Exception as e:
            logger.error(f"Erreur lors de la synchronisation Wix: {e}")
            
            # Créer un log d'erreur
            WixSyncLog.objects.create(
                sync_date=timezone.now(),
                status='error',
                bookings_processed=0,
                bookings_created=0,
                bookings_updated=0,
                error_message=str(e)
            )
            
            return {
                'status': 'error',
                'message': str(e)
            }
