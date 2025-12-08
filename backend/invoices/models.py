from django.db import models
from django.core.files.base import ContentFile
from orders.models import Order
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image


class Invoice(models.Model):
    invoice_number = models.CharField(max_length=50, unique=True, verbose_name="Numéro de facture")
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    invoice_date = models.DateField(auto_now_add=True, verbose_name="Date de facture")
    invoice_pdf = models.FileField(upload_to='invoices/', blank=True, null=True)
    receipt_pdf = models.FileField(upload_to='receipts/', blank=True, null=True)
    is_paid = models.BooleanField(default=True, verbose_name="Payée")
    
    class Meta:
        db_table = 'invoices'
        verbose_name = 'Facture'
        verbose_name_plural = 'Factures'
        ordering = ['-invoice_date']
    
    def __str__(self):
        return f"Facture {self.invoice_number}"
    
    def save(self, *args, **kwargs):
        if not self.invoice_number:
            from django.utils import timezone
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            self.invoice_number = f"FACT-{timestamp}"
        super().save(*args, **kwargs)
    
    def _get_store_info(self):
        """Retourne les infos du magasin"""
        stores = {
            'ville_avray': {
                'name': "Ville d'Avray",
                'address': "123 Rue de Paris",
                'postal': "92410 Ville d'Avray",
                'phone': "01 23 45 67 89",
                'email': "villeavray@micheldevelo.fr"
            },
            'garches': {
                'name': "Garches",
                'address': "456 Avenue de Versailles",
                'postal': "92380 Garches",
                'phone': "01 98 76 54 32",
                'email': "garches@micheldevelo.fr"
            }
        }
        return stores.get(self.order.store, stores['ville_avray'])

    def generate_invoice(self):
        """
        Génère une FACTURE COMPLÈTE format A4
        Document officiel avec toutes les mentions légales
        Charte graphique: Blanc, #4ad19e (vert menthe), Noir
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            topMargin=1*cm, 
            bottomMargin=1.5*cm,
            leftMargin=2*cm,
            rightMargin=2*cm
        )
        elements = []
        styles = getSampleStyleSheet()
        
        # Couleurs de la charte
        VERT_MENTHE = colors.HexColor('#4ad19e')
        NOIR = colors.HexColor('#000000')
        GRIS_FONCE = colors.HexColor('#1a1a1a')
        GRIS_CLAIR = colors.HexColor('#f8f9fa')
        
        # ============ EN-TÊTE AVEC LOGO + DATES ============
        logo_url = "https://static.wixstatic.com/media/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png/v1/fit/w_2500,h_1330,al_c/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png"
        logo = Image(logo_url, width=14*mm, height=14*mm)
        
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=26,
            textColor=VERT_MENTHE,
            fontName='Helvetica-Bold',
            alignment=TA_LEFT,
            leading=30
        )
        
        title_text = Paragraph("<b>MICHEL DE VELO</b>", title_style)
        
        # Dates à droite
        date_style = ParagraphStyle(
            'DateStyle',
            parent=styles['Normal'],
            fontSize=9,
            alignment=TA_RIGHT,
            textColor=GRIS_FONCE
        )
        
        date_text = Paragraph(f"""
            <b>Date d'émission:</b> {self.invoice_date.strftime('%d/%m/%Y')}<br/>
            <b>Date de commande:</b> {self.order.created_at.strftime('%d/%m/%Y à %H:%M')}
        """, date_style)
        
        # Table pour aligner logo + titre à gauche, dates à droite
        header_table = Table([[logo, title_text, date_text]], colWidths=[16*mm, 88*mm, 66*mm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (1, 0), 'LEFT'),
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        elements.append(header_table)
        
        # Ligne de séparation élégante
        line_data = [['']]
        line_table = Table(line_data, colWidths=[17*cm])
        line_table.setStyle(TableStyle([
            ('LINEBELOW', (0, 0), (-1, -1), 2, VERT_MENTHE),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(line_table)
        elements.append(Spacer(1, 0.3*cm))
        
        # ============ INFORMATIONS DU MAGASIN (sur une ligne) ============
        store_info = self._get_store_info()
        
        store_style = ParagraphStyle(
            'StoreInfo',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
            textColor=GRIS_FONCE
        )
        
        store_text = f"""
        <b>Magasin de {store_info['name']}</b> · {store_info['address']} · {store_info['postal']}<br/>
        <font color="#4ad19e">☎</font> {store_info['phone']} · <font color="#4ad19e">✉</font> {store_info['email']}
        """
        elements.append(Paragraph(store_text, store_style))
        elements.append(Spacer(1, 0.5*cm))
        
        # ============ NUMÉRO DE FACTURE (encadré élégant) ============
        invoice_header_style = ParagraphStyle(
            'InvoiceHeader',
            parent=styles['Heading2'],
            fontSize=18,
            textColor=colors.white,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        invoice_box_data = [[Paragraph(f"FACTURE N° {self.invoice_number}", invoice_header_style)]]
        invoice_box_table = Table(invoice_box_data, colWidths=[17*cm])
        invoice_box_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), VERT_MENTHE),
            ('PADDING', (0, 0), (-1, -1), 12),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(invoice_box_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # ============ INFORMATIONS CLIENT ============
        client = self.order.client
        
        client_header_style = ParagraphStyle(
            'ClientHeader',
            parent=styles['Normal'],
            fontSize=11,
            fontName='Helvetica-Bold',
            textColor=VERT_MENTHE,
            spaceAfter=4
        )
        
        client_content_style = ParagraphStyle(
            'ClientContent',
            parent=styles['Normal'],
            fontSize=9,
            textColor=GRIS_FONCE
        )
        
        client_box_data = [
            [Paragraph('FACTURÉ À', client_header_style)],
            [Paragraph(f'<b>{client.first_name} {client.last_name}</b>', client_content_style)],
        ]
        
        if client.address:
            client_box_data.append([Paragraph(client.address, client_content_style)])
        if client.postal_code and client.city:
            client_box_data.append([Paragraph(f'{client.postal_code} {client.city}', client_content_style)])
        
        client_box_data.append([Paragraph(f'<font color="#4ad19e">✉</font> {client.email}', client_content_style)])
        client_box_data.append([Paragraph(f'<font color="#4ad19e">☎</font> {client.phone}', client_content_style)])
        
        client_table = Table(client_box_data, colWidths=[17*cm])
        client_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), GRIS_CLAIR),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LINEBELOW', (0, 0), (-1, 0), 2, VERT_MENTHE),
        ]))
        elements.append(client_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # ============ NOTES DE COMMANDE ============
        if self.order.notes:
            notes_style = ParagraphStyle(
                'NotesStyle',
                parent=styles['Normal'],
                fontSize=9,
                textColor=GRIS_FONCE,
                leftIndent=5
            )
            
            notes_box_data = [[Paragraph(f'<b><font color="#4ad19e">💬 Notes:</font></b> {self.order.notes}', notes_style)]]
            notes_table = Table(notes_box_data, colWidths=[17*cm])
            notes_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e8f8f3')),
                ('PADDING', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ]))
            elements.append(notes_table)
            elements.append(Spacer(1, 0.4*cm))
        
        # ============ TABLEAU DES ARTICLES ============
        table_header_style = ParagraphStyle(
            'TableHeader',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.white,
            fontName='Helvetica-Bold',
            alignment=TA_CENTER
        )
        
        item_style = ParagraphStyle(
            'ItemStyle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=GRIS_FONCE
        )
        
        data = [[
            Paragraph('DÉSIGNATION', table_header_style),
            Paragraph('QTÉ', table_header_style),
            Paragraph('PRIX HT', table_header_style),
            Paragraph('TVA', table_header_style),
            Paragraph('TOTAL TTC', table_header_style)
        ]]
        
        for item in self.order.items.all():
            data.append([
                Paragraph(f'<b>{item.product.name}</b><br/><font size="7" color="#666666">Réf: {item.product.reference}</font>', item_style),
                Paragraph(f'<b>{item.quantity}</b>', item_style),
                Paragraph(f'{item.unit_price_ht:.2f} €', item_style),
                Paragraph(f'{item.tva_rate:.0f}%', item_style),
                Paragraph(f'<b>{item.subtotal_ttc:.2f} €</b>', item_style),
            ])
        
        table = Table(data, colWidths=[8*cm, 1.8*cm, 2.5*cm, 1.8*cm, 2.9*cm])
        table.setStyle(TableStyle([
            # En-tête
            ('BACKGROUND', (0, 0), (-1, 0), NOIR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            # Corps du tableau
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, GRIS_CLAIR]),
            # Bordures
            ('LINEBELOW', (0, 0), (-1, 0), 2, VERT_MENTHE),
            ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 0.5*cm))
        
        # ============ TOTAUX (encadré moderne) ============
        payment_methods = {
            'cash': 'Espèces',
            'card': 'Carte bancaire',
            'check': 'Chèque',
            'sumup': 'SumUp',
            'installment': f'Paiement en {self.order.installments}x'
        }
        payment_text = payment_methods.get(self.order.payment_method, self.order.payment_method)
        
        totals_style_label = ParagraphStyle(
            'TotalsLabel',
            parent=styles['Normal'],
            fontSize=10,
            textColor=GRIS_FONCE,
            alignment=TA_RIGHT
        )
        
        totals_style_value = ParagraphStyle(
            'TotalsValue',
            parent=styles['Normal'],
            fontSize=10,
            textColor=GRIS_FONCE,
            alignment=TA_RIGHT,
            fontName='Helvetica-Bold'
        )
        
        total_final_style = ParagraphStyle(
            'TotalFinal',
            parent=styles['Normal'],
            fontSize=16,
            textColor=colors.white,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        totals_data = [
            [Paragraph('Sous-total HT:', totals_style_label), Paragraph(f'{self.order.subtotal_ht:.2f} €', totals_style_value)],
            [Paragraph('TVA (20%):', totals_style_label), Paragraph(f'{self.order.total_tva:.2f} €', totals_style_value)],
        ]
        
        if self.order.discount_amount > 0:
            totals_data.append([
                Paragraph('Remise:', totals_style_label), 
                Paragraph(f'-{self.order.discount_amount:.2f} €', totals_style_value)
            ])
        
        # Ligne du total avec fond vert
        total_ttc_paragraph = Paragraph(
            f'<b>TOTAL TTC: {self.order.total_ttc:.2f} €</b>', 
            total_final_style
        )
        
        totals_data.append([total_ttc_paragraph, Paragraph('', totals_style_value)])
        
        totals_data.append([
            Paragraph(f'<font size="8">Mode de paiement: {payment_text}</font>', totals_style_label),
            Paragraph('', totals_style_value)
        ])
        
        totals_table = Table(totals_data, colWidths=[13*cm, 4*cm])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -2), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -2), 4),
            # Ligne du total final
            ('BACKGROUND', (0, -2), (-1, -2), VERT_MENTHE),
            ('SPAN', (0, -2), (-1, -2)),
            ('PADDING', (0, -2), (-1, -2), 12),
            ('TOPPADDING', (0, -2), (-1, -2), 10),
            ('BOTTOMPADDING', (0, -2), (-1, -2), 10),
            ('ALIGN', (0, -2), (-1, -2), 'CENTER'),
            # Ligne mode de paiement
            ('BACKGROUND', (0, -1), (-1, -1), GRIS_CLAIR),
            ('SPAN', (0, -1), (-1, -1)),
            ('PADDING', (0, -1), (-1, -1), 6),
        ]))
        elements.append(totals_table)
        
        # ============ PIED DE PAGE ============
        elements.append(Spacer(1, 0.8*cm))
        
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=GRIS_FONCE,
            alignment=TA_CENTER,
            leading=12
        )
        
        footer_text = """
        <b>Merci de votre confiance !</b><br/>
        Garantie : 2 ans sur les vélos · 1 an sur les accessoires<br/>
        <i>TVA non applicable, art. 293 B du CGI · Facture acquittée</i><br/>
        <br/>
        <font color="#4ad19e">●</font> SIRET: 123 456 789 00012 <font color="#4ad19e">●</font> TVA: FR12345678901 <font color="#4ad19e">●</font>
        """
        elements.append(Paragraph(footer_text, footer_style))
        
        doc.build(elements)
        buffer.seek(0)
        
        # Sauvegarder
        filename = f'facture_{self.invoice_number}.pdf'
        self.invoice_pdf.save(filename, ContentFile(buffer.read()), save=True)
        
        return buffer

    def generate_receipt(self):
        """Génère un ticket de caisse (format ticket thermique 80mm)"""
        # À implémenter selon vos besoins
        pass
    
    def generate_both(self):
        """Génère à la fois le ticket et la facture"""
        self.generate_receipt()
        self.generate_invoice()
        self.save()
