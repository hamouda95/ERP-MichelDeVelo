import logging
from celery import shared_task
from django.utils import timezone
from .services import WixBookingsService

logger = logging.getLogger(__name__)


@shared_task(name='appointments.sync_wix_bookings_hourly')
def sync_wix_bookings_hourly():
    """
    Tâche planifiée pour synchroniser les bookings Wix toutes les heures
    """
    try:
        logger.info("Début de la synchronisation horaire des bookings Wix")
        
        wix_service = WixBookingsService()
        result = wix_service.sync_bookings()
        
        if result['status'] == 'success':
            logger.info(f"Synchronisation réussie: {result['processed']} bookings traités, "
                       f"{result['created']} créés, {result['updated']} mis à jour")
        else:
            logger.error(f"Échec de la synchronisation: {result.get('message', 'Erreur inconnue')}")
        
        return result
        
    except Exception as e:
        logger.error(f"Erreur lors de la synchronisation horaire Wix: {e}")
        return {
            'status': 'error',
            'message': str(e),
            'processed': 0,
            'created': 0,
            'updated': 0
        }


@shared_task(name='appointments.sync_wix_bookings_daily')
def sync_wix_bookings_daily():
    """
    Tâche planifiée pour synchroniser les bookings Wix tous les jours
    (plus complète, inclut les bookings plus anciens)
    """
    try:
        logger.info("Début de la synchronisation quotidienne des bookings Wix")
        
        wix_service = WixBookingsService()
        # Pour la sync quotidienne, on peut augmenter la limite
        result = wix_service.sync_bookings(limit=500)
        
        if result['status'] == 'success':
            logger.info(f"Synchronisation quotidienne réussie: {result['processed']} bookings traités")
        else:
            logger.error(f"Échec de la synchronisation quotidienne: {result.get('message', 'Erreur inconnue')}")
        
        return result
        
    except Exception as e:
        logger.error(f"Erreur lors de la synchronisation quotidienne Wix: {e}")
        return {
            'status': 'error',
            'message': str(e),
            'processed': 0,
            'created': 0,
            'updated': 0
        }


@shared_task(name='appointments.cleanup_old_wix_logs')
def cleanup_old_wix_logs():
    """
    Tâche pour nettoyer les anciens logs de synchronisation Wix
    (garde seulement les 30 derniers jours)
    """
    try:
        from .models import WixSyncLog
        
        cutoff_date = timezone.now() - timezone.timedelta(days=30)
        deleted_count = WixSyncLog.objects.filter(sync_date__lt=cutoff_date).delete()[0]
        
        logger.info(f"Nettoyage des logs Wix: {deleted_count} entrées supprimées")
        
        return {
            'status': 'success',
            'deleted_count': deleted_count
        }
        
    except Exception as e:
        logger.error(f"Erreur lors du nettoyage des logs Wix: {e}")
        return {
            'status': 'error',
            'message': str(e)
        }
