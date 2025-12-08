from django.db import models
from orders.models import Order
from django.utils import timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from django.core.mail import EmailMessage
from django.core.files.base import ContentFile
import logging

logger = logging.getLogger(__name__)


class Invoice(models.Model):
    invoice_number = models.CharField(max_length=30, unique=True, editable=False)
    order = models.OneToOneField(Order, on_delete=models.PROTECT, related_name='invoice')
    
    invoice_date = models.DateField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    
    # Fichiers PDF
    receipt_pdf = models.FileField(upload_to='receipts/', blank=True, null=True)
    invoice_pdf = models.FileField(upload_to='invoices/', blank=True, null=True)
    
    is_paid = models.BooleanField(default=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Facture {self.invoice_number}"
    
    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()
        if not self.paid_at and self.is_paid:
            self.paid_at = timezone.now()
        super().save(*args, **kwargs)
    
    def generate_invoice_number(self):
        today = timezone.now()
        date_str = today.strftime('%d%m%Y')
        prefix = 'A' if self.order.store == 'ville_avray' else 'G'
        
        last_invoice = Invoice.objects.filter(
            invoice_number__startswith=f"{prefix}{date_str}"
        ).order_by('-invoice_number').first()
        
        if last_invoice:
            last_number = int(last_invoice.invoice_number.split('-')[1])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"{prefix}{date_str}-{new_number:07d}"
    
    def _get_store_info(self):
        store_addresses = {
            'ville_avray': {
                'name': "Ville d'Avray",
                'address': '6 Rue de Saint-Cloud',
                'postal': '92410 Ville d\'Avray',
                'phone': '09 51 33 31 40'
            },
            'garches': {
                'name': 'Garches',
                'address': '63 Rue de Suresnes',
                'postal': '92380 Garches',
                'phone': '06 95 26 06 07'
            }
        }
        return store_addresses.get(self.order.store, store_addresses['ville_avray'])
    
    def generate_receipt(self):
        try:
            buffer = BytesIO()
            width = 80 * mm
            height = 297 * mm
            
            doc = SimpleDocTemplate(
                buffer,
                pagesize=(width, height),
                topMargin=5*mm,
                bottomMargin=5*mm,
                leftMargin=5*mm,
                rightMargin=5*mm
            )
            
            elements = []
            styles = getSampleStyleSheet()
            
            receipt_title = ParagraphStyle(
                'ReceiptTitle',
                parent=styles['Normal'],
                fontSize=14,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold',
                spaceAfter=2*mm
            )

            receipt_moyen = ParagraphStyle(
                'ReceiptMoyen',
                parent=styles['Normal'],
                fontSize=11,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold',
                spaceAfter=2*mm
            )
            
            receipt_normal = ParagraphStyle(
                'ReceiptNormal',
                parent=styles['Normal'],
                fontSize=9,
                alignment=TA_CENTER,
                spaceAfter=1*mm
            )
            
            receipt_item = ParagraphStyle(
                'ReceiptItem',
                parent=styles['Normal'],
                fontSize=8,
                alignment=TA_LEFT
            )
            
            store_info = self._get_store_info()
            
            elements.append(Paragraph("================================", receipt_normal))
            
            # Logo désactivé - Fix timeout 502
            logger.info("Génération ticket sans logo")
            elements.append(Paragraph("<b>MICHEL DE VELO</b>", receipt_title))

            elements.append(Paragraph(f"<b>{store_info['name']}</b>", receipt_normal))
            elements.append(Paragraph(store_info['address'], receipt_normal))
            elements.append(Paragraph(store_info['postal'], receipt_normal))
            elements.append(Paragraph(f"Tél: {store_info['phone']}", receipt_normal))
            elements.append(Paragraph("================================", receipt_normal))
            elements.append(Spacer(1, 3*mm))
            
            elements.append(Paragraph(f"<b>TICKET N° {self.invoice_number}</b>", receipt_moyen))
            elements.append(Paragraph(self.invoice_date.strftime('%d/%m/%Y %H:%M'), receipt_normal))
            elements.append(Paragraph("--------------------------------", receipt_normal))
            elements.append(Spacer(1, 2*mm))
            
            for item in self.order.items.all():
                elements.append(Paragraph(f"<b>{item.product.name}</b>", receipt_item))
                detail_line = f"{item.quantity} x {item.unit_price_ttc:.2f}€ = {item.subtotal_ttc:.2f}€"
                elements.append(Paragraph(detail_line, receipt_item))
                elements.append(Spacer(1, 1*mm))
            
            elements.append(Paragraph("--------------------------------", receipt_normal))
            elements.append(Spacer(1, 2*mm))
            
            totals_style = ParagraphStyle(
                'Totals',
                parent=styles['Normal'],
                fontSize=9,
                alignment=TA_LEFT,
                spaceAfter=1*mm
            )
            
            elements.append(Paragraph(f"Sous-total HT: {self.order.subtotal_ht:.2f}€", totals_style))
            elements.append(Paragraph(f"TVA (20%): {self.order.total_tva:.2f}€", totals_style))
            elements.append(Paragraph("--------------------------------", receipt_normal))
            
            total_style = ParagraphStyle(
                'Total',
                parent=styles['Normal'],
                fontSize=12,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold',
                spaceAfter=2*mm
            )
            elements.append(Paragraph(f"TOTAL: {self.order.total_ttc:.2f}€", total_style))
            elements.append(Paragraph("================================", receipt_normal))
            elements.append(Spacer(1, 2*mm))
            
            payment_methods = {
                'cash': 'ESPÈCES',
                'card': 'CARTE BANCAIRE',
                'check': 'CHÈQUE',
                'sumup': 'SUMUP',
                'installment': f'PAIEMENT {self.order.installments}X'
            }
            payment_text = payment_methods.get(self.order.payment_method, 'ESPÈCES')
            elements.append(Paragraph(f"<b>Paiement: {payment_text}</b>", receipt_normal))
            
            elements.append(Spacer(1, 3*mm))
            elements.append(Paragraph("--------------------------------", receipt_normal))
            
            client = self.order.client
            elements.append(Paragraph(f"Client: {client.first_name} {client.last_name}", receipt_item))
            if client.email:
                elements.append(Paragraph(f"Email: {client.email}", receipt_item))
            
            elements.append(Spacer(1, 3*mm))
            elements.append(Paragraph("================================", receipt_normal))
            elements.append(Paragraph("Merci de votre visite !", receipt_normal))
            elements.append(Paragraph("À bientôt !", receipt_normal))
            elements.append(Paragraph("================================", receipt_normal))
            
            doc.build(elements)
            buffer.seek(0)
            
            filename = f'ticket_{self.invoice_number}.pdf'
            self.receipt_pdf.save(filename, ContentFile(buffer.read()), save=False)
            
            return buffer
            
        except Exception as e:
            logger.error(f"Erreur génération ticket: {e}")
            raise
    
    def generate_invoice(self):
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer, 
                pagesize=A4, 
                topMargin=1.5*cm, 
                bottomMargin=2*cm,
                leftMargin=2*cm,
                rightMargin=2*cm
            )
            elements = []
            styles = getSampleStyleSheet()
            
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=28,
                textColor=colors.HexColor('#4CAF50'),
                alignment=TA_CENTER,
                spaceAfter=0.3*cm,
                fontName='Helvetica-Bold'
            )
            
            # Logo désactivé - Fix timeout 502
            logger.info("Génération facture sans logo")
            elements.append(Paragraph("<b>MICHEL DE VELO</b>", title_style))

            store_info = self._get_store_info()
            
            store_style = ParagraphStyle(
                'StoreInfo',
                parent=styles['Normal'],
                fontSize=10,
                alignment=TA_CENTER,
                textColor=colors.HexColor('#4b5563'),
                spaceAfter=0.5*cm
            )
            
            store_text = f"""
            <b>Magasin de {store_info['name']}</b><br/>
            {store_info['address']}<br/>
            {store_info['postal']}<br/>
            Tél: {store_info['phone']} | Email: micheldevelo@gmail.com<br/>
            TVA: FR58984149567 | SIRET: 98414956700013
            """
            elements.append(Paragraph(store_text, store_style))
            elements.append(Spacer(1, 0.8*cm))
            
            invoice_header_style = ParagraphStyle(
                'InvoiceHeader',
                parent=styles['Heading2'],
                fontSize=16,
                textColor=colors.HexColor('#1e40af'),
                alignment=TA_CENTER,
                spaceBefore=0.3*cm,
                spaceAfter=0.5*cm,
                fontName='Helvetica-Bold'
            )
            
            elements.append(Paragraph(f"FACTURE N° {self.invoice_number}", invoice_header_style))
            
            date_style = ParagraphStyle(
                'DateStyle',
                parent=styles['Normal'],
                fontSize=10,
                alignment=TA_RIGHT,
                spaceAfter=0.5*cm
            )
            
            date_text = f"""
            Date d'émission: <b>{self.invoice_date.strftime('%d/%m/%Y')}</b><br/>
            Date de commande: <b>{self.order.created_at.strftime('%d/%m/%Y à %H:%M')}</b>
            """
            elements.append(Paragraph(date_text, date_style))
            elements.append(Spacer(1, 0.5*cm))
            
            client = self.order.client
            client_box_data = [
                [Paragraph('<b>FACTURÉ À:</b>', styles['Normal'])],
                [Paragraph(f'<b>{client.first_name} {client.last_name}</b>', styles['Normal'])],
            ]
            
            if client.address:
                client_box_data.append([Paragraph(client.address, styles['Normal'])])
            if client.postal_code and client.city:
                client_box_data.append([Paragraph(f'{client.postal_code} {client.city}', styles['Normal'])])
            
            if client.email:
                client_box_data.append([Paragraph(f'Email: {client.email}', styles['Normal'])])
            if client.phone:
                client_box_data.append([Paragraph(f'Tél: {client.phone}', styles['Normal'])])
            
            client_table = Table(client_box_data, colWidths=[18*cm])
            client_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
                ('PADDING', (0, 0), (-1, -1), 12),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
            ]))
            elements.append(client_table)
            elements.append(Spacer(1, 1*cm))
            
            table_header_style = ParagraphStyle(
                'TableHeader',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.white,
                fontName='Helvetica-Bold'
            )
            
            data = [[
                Paragraph('Désignation', table_header_style),
                Paragraph('Qté', table_header_style),
                Paragraph('Prix HT', table_header_style),
                Paragraph('TVA', table_header_style),
                Paragraph('Total TTC', table_header_style)
            ]]
            
            for item in self.order.items.all():
                data.append([
                    Paragraph(f'<b>{item.product.name}</b><br/><font size="8">Réf: {item.product.reference}</font>', styles['Normal']),
                    Paragraph(f'{item.quantity}', styles['Normal']),
                    Paragraph(f'{item.unit_price_ht:.2f} €', styles['Normal']),
                    Paragraph(f'{item.tva_rate:.0f}%', styles['Normal']),
                    Paragraph(f'<b>{item.subtotal_ttc:.2f} €</b>', styles['Normal']),
                ])
            
            table = Table(data, colWidths=[9*cm, 2*cm, 3*cm, 2*cm, 3*cm])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
                ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
                ('ALIGN', (0, 1), (0, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 0.8*cm))
            
            payment_methods = {
                'cash': 'Espèces',
                'card': 'Carte bancaire',
                'check': 'Chèque',
                'sumup': 'SumUp',
                'installment': f'Paiement en {self.order.installments}x'
            }
            payment_text = payment_methods.get(self.order.payment_method, self.order.payment_method)
            
            totals_data = [
                ['Sous-total HT:', f'{self.order.subtotal_ht:.2f} €'],
                ['TVA (20%):', f'{self.order.total_tva:.2f} €'],
            ]
            
            if self.order.discount_amount > 0:
                totals_data.append(['Remise:', f'-{self.order.discount_amount:.2f} €'])
            
            totals_data.extend([
                ['', ''],
                [Paragraph('<b>TOTAL TTC:</b>', styles['Normal']), 
                 Paragraph(f'<b>{self.order.total_ttc:.2f} €</b>', styles['Normal'])],
                ['Mode de paiement:', payment_text],
            ])
            
            totals_table = Table(totals_data, colWidths=[14*cm, 5*cm])
            totals_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
                ('FONTSIZE', (0, 0), (-1, -2), 10),
                ('FONTNAME', (0, -2), (-1, -2), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -2), (-1, -2), 14),
                ('TEXTCOLOR', (0, -2), (-1, -2), colors.HexColor('#1e40af')),
                ('LINEABOVE', (0, -2), (-1, -2), 2, colors.HexColor('#1e40af')),
                ('TOPPADDING', (0, -2), (-1, -2), 10),
                ('BOTTOMPADDING', (0, -2), (-1, -2), 10),
                ('BACKGROUND', (1, -2), (1, -2), colors.HexColor('#dbeafe')),
            ]))
            elements.append(totals_table)
            
            elements.append(Spacer(1, 1.5*cm))
            
            notes_style = ParagraphStyle(
                'Notes',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#6b7280'),
                alignment=TA_CENTER
            )
            
            notes = """
            <b>Merci de votre confiance !</b><br/>
            <br/>
            En cas de questions, n'hésitez pas à nous contacter.<br/>
            Garantie : 2 ans sur les vélos, 1 an sur les accessoires<br/>
            <br/>
            <i>Facture acquittée</i>
            """
            elements.append(Paragraph(notes, notes_style))
            
            doc.build(elements)
            buffer.seek(0)
            
            filename = f'facture_{self.invoice_number}.pdf'
            self.invoice_pdf.save(filename, ContentFile(buffer.read()), save=False)
            
            return buffer
            
        except Exception as e:
            logger.error(f"Erreur génération facture: {e}")
            raise
    
    def send_invoice_email(self):
        try:
            if not self.order.client.email:
                logger.warning(f"Aucun email pour {self.invoice_number}")
                return False
            
            if not self.invoice_pdf or not self.receipt_pdf:
                logger.warning(f"PDFs manquants pour {self.invoice_number}")
                return False
            
            client_name = self.order.client.full_name if hasattr(self.order.client, 'full_name') else self.order.client.first_name
            
            subject = f"Votre facture {self.invoice_number} - Michel de Vélo"
            message = (
                f"Bonjour {client_name},\n\n"
                f"Merci pour votre achat chez Michel de Vélo.\n"
                f"Veuillez trouver ci-joint votre facture N° {self.invoice_number}.\n\n"
                "À bientôt !\n\n"
                "L'équipe Michel de Vélo"
            )
            
            email = EmailMessage(
                subject=subject,
                body=message,
                from_email="micheldevelo@gmail.com",
                to=[self.order.client.email]
            )
            
            email.attach_file(self.invoice_pdf.path)
            email.attach_file(self.receipt_pdf.path)
            
            email.send(fail_silently=False)
            logger.info(f"Email envoyé pour {self.invoice_number}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur envoi email {self.invoice_number}: {e}")
            return False
    
    def generate_both(self):
        try:
            self.generate_receipt()
            self.generate_invoice()
            self.save()
            
            email_sent = self.send_invoice_email()
            
            if email_sent:
                logger.info(f"Facture {self.invoice_number} générée et envoyée")
            else:
                logger.warning(f"Facture {self.invoice_number} générée mais email non envoyé")
            
            return True
            
        except Exception as e:
            logger.error(f"Erreur génération {self.invoice_number}: {e}")
            raise
