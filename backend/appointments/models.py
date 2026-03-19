from django.db import models
from django.contrib.auth import get_user_model
from clients.models import Client

User = get_user_model()


class Appointment(models.Model):
    """
    Modèle pour les rendez-vous et planifications
    """
    STATUS_CHOICES = [
        ('scheduled', 'Planifié'),
        ('confirmed', 'Confirmé'),
        ('in_progress', 'En cours'),
        ('completed', 'Terminé'),
        ('cancelled', 'Annulé'),
        ('no_show', 'Absent'),
    ]
    
    TYPE_CHOICES = [
        ('repair', 'Réparation'),
        ('maintenance', 'Entretien'),
        ('customization', 'Personnalisation'),
        ('delivery', 'Livraison'),
        ('consultation', 'Consultation'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Basse'),
        ('normal', 'Normale'),
        ('high', 'Haute'),
        ('urgent', 'Urgente'),
    ]
    
    SOURCE_CHOICES = [
        ('local', 'Local'),
        ('wix', 'Wix Bookings'),
    ]
    
    # Informations de base
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='appointments')
    title = models.CharField(max_length=200, verbose_name="Titre du rendez-vous")
    description = models.TextField(blank=True, verbose_name="Description")
    
    # Source et intégration externe
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='local', verbose_name="Source")
    wix_booking_id = models.CharField(max_length=100, unique=True, null=True, blank=True, verbose_name="ID Booking Wix")
    
    # Dates et heures
    appointment_date = models.DateField(verbose_name="Date du rendez-vous")
    appointment_time = models.TimeField(verbose_name="Heure du rendez-vous")
    duration_minutes = models.IntegerField(default=60, verbose_name="Durée (minutes)")
    
    # Type et priorité
    appointment_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='repair', verbose_name="Type de rendez-vous")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal', verbose_name="Priorité")
    
    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled', verbose_name="Statut")
    
    # Informations associées
    repair = models.ForeignKey('repairs.Repair', on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    quote = models.ForeignKey('quotes.Quote', on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    
    # Notes et suivi
    notes = models.TextField(blank=True, verbose_name="Notes internes")
    client_notes = models.TextField(blank=True, verbose_name="Notes client")
    
    # Gestion
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_appointments')
    reminder_sent = models.BooleanField(default=False, verbose_name="Rappel envoyé")
    confirmation_sent = models.BooleanField(default=False, verbose_name="Confirmation envoyée")
    
    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_appointments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'appointments'
        ordering = ['appointment_date', 'appointment_time']
        indexes = [
            models.Index(fields=['appointment_date']),
            models.Index(fields=['status']),
            models.Index(fields=['client']),
            models.Index(fields=['appointment_type']),
        ]
    
    def __str__(self):
        return f"RDV {self.appointment_date} {self.appointment_time} - {self.client.name}"
    
    @property
    def is_today(self):
        """Vérifie si le rendez-vous est aujourd'hui"""
        from django.utils import timezone
        today = timezone.now().date()
        return self.appointment_date == today
    
    @property
    def is_past(self):
        """Vérifie si le rendez-vous est passé"""
        from django.utils import timezone
        now = timezone.now()
        appointment_datetime = timezone.make_aware(
            timezone.datetime.combine(self.appointment_date, self.appointment_time)
        )
        return appointment_datetime < now
    
    @property
    def end_time(self):
        """Calcule l'heure de fin"""
        from datetime import datetime, timedelta
        appointment_datetime = datetime.combine(self.appointment_date, self.appointment_time)
        end_datetime = appointment_datetime + timedelta(minutes=self.duration_minutes)
        return end_datetime.time()


class AppointmentReminder(models.Model):
    """
    Rappels automatiques pour les rendez-vous
    """
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='reminders')
    
    REMINDER_TYPE_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('phone', 'Appel téléphonique'),
    ]
    
    reminder_type = models.CharField(max_length=20, choices=REMINDER_TYPE_CHOICES, default='email')
    reminder_time = models.DateTimeField(verbose_name="Heure du rappel")
    sent = models.BooleanField(default=False, verbose_name="Envoyé")
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Date d'envoi")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'appointment_reminders'
        ordering = ['reminder_time']
    
    def __str__(self):
        return f"Rappel {self.reminder_type} pour {self.appointment}"


class WixSyncLog(models.Model):
    """
    Journal des synchronisations avec Wix Bookings
    """
    SYNC_STATUS_CHOICES = [
        ('success', 'Succès'),
        ('error', 'Erreur'),
        ('partial', 'Partiel'),
    ]
    
    sync_date = models.DateTimeField(auto_now_add=True, verbose_name="Date de synchronisation")
    status = models.CharField(max_length=20, choices=SYNC_STATUS_CHOICES, verbose_name="Statut")
    bookings_processed = models.IntegerField(default=0, verbose_name="Bookings traités")
    bookings_created = models.IntegerField(default=0, verbose_name="Bookings créés")
    bookings_updated = models.IntegerField(default=0, verbose_name="Bookings mis à jour")
    error_message = models.TextField(blank=True, null=True, verbose_name="Message d'erreur")
    sync_duration_seconds = models.FloatField(null=True, blank=True, verbose_name="Durée (secondes)")
    
    class Meta:
        db_table = 'wix_sync_logs'
        ordering = ['-sync_date']
        indexes = [
            models.Index(fields=['sync_date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Sync Wix {self.sync_date} - {self.status}"
