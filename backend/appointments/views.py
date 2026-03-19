from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Sum, F, Value, CharField
from django.utils import timezone
from datetime import timedelta
from django.db import models

from .models import Appointment, AppointmentReminder, WixSyncLog
from .services import WixBookingsService
from repairs.models import Repair
from quotes.models import Quote


class AppointmentViewSet(viewsets.ViewSet):
    """
    ViewSet pour la gestion des rendez-vous
    """
    
    def list(self, request):
        """Liste tous les rendez-vous avec filtres"""
        try:
            queryset = Appointment.objects.select_related('client', 'assigned_to')
            
            # Filtres
            date_filter = request.query_params.get('date')
            if date_filter:
                queryset = queryset.filter(appointment_date=date_filter)
            
            status_filter = request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            # Rendez-vous du jour par défaut
            if not date_filter and not status_filter:
                today = timezone.now().date()
                queryset = queryset.filter(
                    Q(appointment_date=today) | 
                    Q(appointment_date__gt=today, appointment_date__lte=today + timedelta(days=7))
                )
            
            # Filtre par source
            source_filter = request.query_params.get('source')
            if source_filter:
                queryset = queryset.filter(source=source_filter)
            
            appointments = list(queryset.order_by('appointment_date', 'appointment_time').values(
                'id', 'title', 'description', 'appointment_date', 'appointment_time',
                'duration_minutes', 'appointment_type', 'priority', 'status', 'source',
                'wix_booking_id', 'client__first_name', 'client__last_name', 'client__phone', 'client__email',
                'assigned_to__username', 'notes'
            ))
            
            return Response(appointments)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Statistiques des rendez-vous"""
        try:
            today = timezone.now().date()
            start_of_month = today.replace(day=1)
            start_of_week = today - timedelta(days=today.weekday())
            
            # RDV du jour
            today_appointments = Appointment.objects.filter(appointment_date=today).count()
            
            # RDV de la semaine
            week_appointments = Appointment.objects.filter(
                appointment_date__gte=start_of_week,
                appointment_date__lte=today + timedelta(days=7)
            ).count()
            
            # RDV du mois
            month_appointments = Appointment.objects.filter(
                appointment_date__gte=start_of_month,
                appointment_date__lte=today + timedelta(days=30)
            ).count()
            
            # RDV par statut
            appointments_by_status = Appointment.objects.values('status').annotate(
                count=Count('id')
            ).order_by('status')
            
            # RDV par type
            appointments_by_type = Appointment.objects.values('appointment_type').annotate(
                count=Count('id')
            ).order_by('-count')
            
            return Response({
                'today': today_appointments,
                'this_week': week_appointments,
                'this_month': month_appointments,
                'by_status': list(appointments_by_status),
                'by_type': list(appointments_by_type)
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Rendez-vous du jour uniquement"""
        try:
            today = timezone.now().date()
            appointments = Appointment.objects.filter(
                appointment_date=today
            ).select_related('client', 'assigned_to').order_by('appointment_time')
            
            return Response(list(appointments.values(
                'id', 'title', 'appointment_time', 'duration_minutes',
                'priority', 'status', 'client__first_name', 'client__phone',
                'assigned_to__username', 'notes'
            )))
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Rendez-vous à venir (prochains 7 jours)"""
        try:
            today = timezone.now().date()
            appointments = Appointment.objects.filter(
                appointment_date__gt=today,
                appointment_date__lte=today + timedelta(days=7)
            ).select_related('client', 'assigned_to').order_by('appointment_date', 'appointment_time')
            
            return Response(list(appointments.values(
                'id', 'title', 'appointment_date', 'appointment_time',
                'duration_minutes', 'priority', 'status', 'client__first_name',
                'client__phone', 'assigned_to__username', 'notes'
            )))
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def sync_wix(self, request):
        """Synchronisation manuelle des bookings Wix"""
        try:
            wix_service = WixBookingsService()
            result = wix_service.sync_bookings()
            
            if result['status'] == 'success':
                return Response({
                    'message': 'Synchronisation Wix réussie',
                    'processed': result['processed'],
                    'created': result['created'],
                    'updated': result['updated'],
                    'duration': result['duration']
                })
            else:
                return Response({
                    'error': result['message'],
                    'processed': result['processed'],
                    'created': result['created'],
                    'updated': result['updated']
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la synchronisation Wix: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def sync_status(self, request):
        """Statut de la dernière synchronisation Wix"""
        try:
            last_sync = WixSyncLog.objects.first()
            
            if not last_sync:
                return Response({
                    'last_sync': None,
                    'message': 'Aucune synchronisation effectuée'
                })
            
            return Response({
                'last_sync': {
                    'date': last_sync.sync_date,
                    'status': last_sync.status,
                    'processed': last_sync.bookings_processed,
                    'created': last_sync.bookings_created,
                    'updated': last_sync.bookings_updated,
                    'duration': last_sync.sync_duration_seconds,
                    'error': last_sync.error_message
                }
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def force_sync(self, request):
        """Synchronisation forcée (ignore les erreurs de configuration)"""
        try:
            wix_service = WixBookingsService()
            result = wix_service.sync_bookings()
            
            return Response({
                'message': 'Synchronisation forcée terminée',
                'result': result
            })
            
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'La synchronisation forcée a échoué'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def wix_stats(self, request):
        """Statistiques des bookings Wix"""
        try:
            # Nombre total de bookings Wix
            wix_bookings = Appointment.objects.filter(source='wix').count()
            
            # Bookings Wix par statut
            wix_by_status = Appointment.objects.filter(source='wix').values('status').annotate(
                count=Count('id')
            ).order_by('status')
            
            # Bookings Wix des 7 derniers jours
            week_ago = timezone.now() - timedelta(days=7)
            recent_wix = Appointment.objects.filter(
                source='wix',
                created_at__gte=week_ago
            ).count()
            
            # Dernière synchronisation
            last_sync = WixSyncLog.objects.first()
            
            return Response({
                'total_wix_bookings': wix_bookings,
                'recent_wix_bookings': recent_wix,
                'by_status': list(wix_by_status),
                'last_sync': {
                    'date': last_sync.sync_date if last_sync else None,
                    'status': last_sync.status if last_sync else None
                }
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
