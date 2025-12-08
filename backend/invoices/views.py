from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
from .models import Invoice
from .serializers import InvoiceSerializer
import logging

logger = logging.getLogger(__name__)


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    
    @action(detail=True, methods=['post'], url_path='generate_both')
    def generate_both(self, request, pk=None):
        """Génère le ticket ET la facture, puis envoie par email"""
        try:
            invoice = self.get_object()
            
            # Générer les documents
            logger.info(f"Génération des PDFs pour la facture {invoice.invoice_number}")
            invoice.generate_both()
            
            return Response({
                'status': 'success',
                'message': 'Ticket et facture générés avec succès',
                'invoice_number': invoice.invoice_number,
                'receipt_url': invoice.receipt_pdf.url if invoice.receipt_pdf else None,
                'invoice_url': invoice.invoice_pdf.url if invoice.invoice_pdf else None,
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de la génération pour l'invoice {pk}: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'Erreur lors de la génération: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'], url_path='download_receipt')
    def download_receipt(self, request, pk=None):
        """Télécharge le ticket de caisse"""
        try:
            invoice = self.get_object()
            
            if not invoice.receipt_pdf:
                logger.info(f"Génération du ticket pour la facture {invoice.invoice_number}")
                invoice.generate_receipt()
                invoice.save()
            
            return FileResponse(
                invoice.receipt_pdf.open('rb'),
                content_type='application/pdf',
                as_attachment=True,
                filename=f'ticket_{invoice.invoice_number}.pdf'
            )
            
        except Exception as e:
            logger.error(f"Erreur lors du téléchargement du ticket {pk}: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'], url_path='download_invoice')
    def download_invoice(self, request, pk=None):
        """Télécharge la facture complète"""
        try:
            invoice = self.get_object()
            
            if not invoice.invoice_pdf:
                logger.info(f"Génération de la facture pour {invoice.invoice_number}")
                invoice.generate_invoice()
                invoice.save()
            
            return FileResponse(
                invoice.invoice_pdf.open('rb'),
                content_type='application/pdf',
                as_attachment=True,
                filename=f'facture_{invoice.invoice_number}.pdf'
            )
            
        except Exception as e:
            logger.error(f"Erreur lors du téléchargement de la facture {pk}: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def print_receipt(self, request, pk=None):
        """Prépare le ticket pour impression directe (imprimante thermique)"""
        try:
            invoice = self.get_object()
            
            if not invoice.receipt_pdf:
                invoice.generate_receipt()
                invoice.save()
            
            return Response({
                'message': 'Ticket prêt pour impression',
                'receipt_url': invoice.receipt_pdf.url,
                'print_command': f'lp -d thermal_printer {invoice.receipt_pdf.path}'
            })
            
        except Exception as e:
            logger.error(f"Erreur lors de la préparation d'impression {pk}: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
