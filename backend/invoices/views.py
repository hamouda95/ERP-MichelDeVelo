from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
from .models import Invoice
from .serializers import InvoiceSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    
    @action(detail=True, methods=['post'])
    def generate_both(self, request, pk=None):
        """Génère le ticket ET la facture"""
        invoice = self.get_object()
        invoice.generate_both()
        return Response({
            'message': 'Ticket et facture générés avec succès',
            'invoice_number': invoice.invoice_number,
            'receipt_url': invoice.receipt_pdf.url if invoice.receipt_pdf else None,
            'invoice_url': invoice.invoice_pdf.url if invoice.invoice_pdf else None,
        })
    
    @action(detail=True, methods=['get'])
    def download_receipt(self, request, pk=None):
        """Télécharge le ticket de caisse"""
        invoice = self.get_object()
        if not invoice.receipt_pdf:
            invoice.generate_receipt()
        
        return FileResponse(
            invoice.receipt_pdf.open('rb'),
            as_attachment=True,
            filename=f'ticket_{invoice.invoice_number}.pdf'
        )
    
    @action(detail=True, methods=['get'])
    def download_invoice(self, request, pk=None):
        """Télécharge la facture complète"""
        invoice = self.get_object()
        if not invoice.invoice_pdf:
            invoice.generate_invoice()
        
        return FileResponse(
            invoice.invoice_pdf.open('rb'),
            as_attachment=True,
            filename=f'facture_{invoice.invoice_number}.pdf'
        )
    
    @action(detail=True, methods=['post'])
    def print_receipt(self, request, pk=None):
        """Prépare le ticket pour impression directe (imprimante thermique)"""
        invoice = self.get_object()
        if not invoice.receipt_pdf:
            invoice.generate_receipt()
        
        return Response({
            'message': 'Ticket prêt pour impression',
            'receipt_url': invoice.receipt_pdf.url,
            'print_command': f'lp -d thermal_printer {invoice.receipt_pdf.path}'  # Commande d'impression Linux
        })