from django.db import models
from django.core.files.base import ContentFile
from orders.models import Order
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
)


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

    # ---------------------
    # Génération numéro facture
    # ---------------------
    def save(self, *args, **kwargs):
        if not self.invoice_number:
            from django.utils import timezone
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            self.invoice_number = f"FACT-{timestamp}"
        super().save(*args, **kwargs)

    # ---------------------
    # Informations magasin
    # ---------------------
    def _get_store_info(self):
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

    # ---------------------
    # GENERATION FACTURE A4
    # ---------------------
    def generate_invoice(self):
        """
        Génère une facture A4 complète, avec mise en forme moderne
        respectant la charte graphique (blanc / vert menthe / noir).
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=1 * cm,
            bottomMargin=1.5 * cm,
            leftMargin=2 * cm,
            rightMargin=2 * cm
        )

        elements = []
        styles = getSampleStyleSheet()

        # Couleurs
        VERT = colors.HexColor('#4ad19e')
        NOIR = colors.HexColor('#000000')
        GRIS = colors.HexColor('#1a1a1a')
        GRIS_CLAIR = colors.HexColor('#f8f9fa')

        # -------- EN-TÊTE --------
        logo = Image(
            "https://static.wixstatic.com/media/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png/v1/fit/w_2500,h_1330,al_c/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png",
            width=14 * mm,
            height=14 * mm
        )

        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            fontSize=26,
            textColor=VERT,
            fontName='Helvetica-Bold',
            alignment=TA_LEFT
        )

        date_style = ParagraphStyle(
            'Date',
            parent=styles['Normal'],
            fontSize=9,
            alignment=TA_RIGHT,
            textColor=GRIS
        )

        header = Table(
            [[logo,
              Paragraph("<b>MICHEL DE VELO</b>", title_style),
              Paragraph(
                  f"<b>Date d'émission :</b> {self.invoice_date:%d/%m/%Y}<br/>"
                  f"<b>Date de commande :</b> {self.order.created_at:%d/%m/%Y à %H:%M}",
                  date_style
              )]],
            colWidths=[16 * mm, 88 * mm, 66 * mm]
        )

        header.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0)
        ]))

        elements.append(header)

        # Ligne verte
        line = Table([['']], colWidths=[17 * cm])
        line.setStyle(TableStyle([
            ('LINEBELOW', (0, 0), (0, 0), 2, VERT),
        ]))
        elements.append(line)
        elements.append(Spacer(1, 0.4 * cm))

        # -------- INFO MAGASIN --------
        store = self._get_store_info()
        store_style = ParagraphStyle(
            'Store',
            parent=styles['Normal'],
            alignment=TA_CENTER,
            textColor=GRIS,
            fontSize=10
        )

        elements.append(Paragraph(
            f"<b>Magasin de {store['name']}</b> · {store['address']} · {store['postal']}<br/>"
            f"<font color='#4ad19e'>☎</font> {store['phone']} · "
            f"<font color='#4ad19e'>✉</font> {store['email']}",
            store_style
        ))

        elements.append(Spacer(1, 0.5 * cm))

        # -------- TITRE FACTURE --------
        title_box = Table(
            [[Paragraph(f"FACTURE N° {self.invoice_number}",
                        ParagraphStyle('InvTitle', parent=styles['Heading2'],
                                       fontSize=18, textColor=colors.white,
                                       alignment=TA_CENTER,
                                       fontName="Helvetica-Bold"))]],
            colWidths=[17 * cm]
        )
        title_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), VERT),
            ('PADDING', (0, 0), (-1, -1), 12),
        ]))
        elements.append(title_box)
        elements.append(Spacer(1, 0.5 * cm))

        # -------- INFOS CLIENT --------
        client = self.order.client

        client_box = Table([
            [Paragraph("FACTURÉ À", ParagraphStyle(
                'CH', parent=styles['Normal'], fontName="Helvetica-Bold",
                fontSize=11, textColor=VERT))],
            [Paragraph(f"<b>{client.first_name} {client.last_name}</b>",
                       ParagraphStyle('CC', parent=styles['Normal'], fontSize=9, textColor=GRIS))]
        ] + [
            [Paragraph(line, ParagraphStyle('CC', parent=styles['Normal'], fontSize=9, textColor=GRIS))]
            for line in [
                client.address or "",
                f"{client.postal_code} {client.city}" if client.postal_code else "",
                f"<font color='#4ad19e'>✉</font> {client.email}",
                f"<font color='#4ad19e'>☎</font> {client.phone}",
            ] if line
        ], colWidths=[17 * cm])

        client_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), GRIS_CLAIR),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('LINEBELOW', (0, 0), (-1, 0), 2, VERT),
        ]))
        elements.append(client_box)
        elements.append(Spacer(1, 0.5 * cm))

        # -------- NOTES --------
        if self.order.notes:
            notes_table = Table(
                [[Paragraph(
                    f"<b><font color='#4ad19e'>💬 Notes :</font></b> {self.order.notes}",
                    ParagraphStyle('Notes', parent=styles['Normal'], fontSize=9, textColor=GRIS)
                )]],
                colWidths=[17 * cm]
            )
            notes_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e8f8f3')),
                ('PADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(notes_table)
            elements.append(Spacer(1, 0.4 * cm))

        # -------- TABLEAU PRODUITS --------
        header_style = ParagraphStyle('TH', parent=styles['Normal'],
                                      fontSize=10, textColor=colors.white,
                                      alignment=TA_CENTER, fontName='Helvetica-Bold')

        item_style = ParagraphStyle('Item', parent=styles['Normal'],
                                    fontSize=9, textColor=GRIS)

        data = [[
            Paragraph('DÉSIGNATION', header_style),
            Paragraph('QTÉ', header_style),
            Paragraph('PRIX HT', header_style),
            Paragraph('TVA', header_style),
            Paragraph('TOTAL TTC', header_style)
        ]]

        for item in self.order.items.all():
            data.append([
                Paragraph(
                    f"<b>{item.product.name}</b><br/><font size='7' color='#666'>Réf: {item.product.reference}</font>",
                    item_style
                ),
                Paragraph(str(item.quantity), item_style),
                Paragraph(f"{item.unit_price_ht:.2f} €", item_style),
                Paragraph(f"{item.tva_rate:.0f}%", item_style),
                Paragraph(f"<b>{item.subtotal_ttc:.2f} €</b>", item_style),
            ])

        table = Table(
            data,
            colWidths=[8 * cm, 1.8 * cm, 2.5 * cm, 1.8 * cm, 2.9 * cm]
        )

        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), NOIR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, GRIS_CLAIR]),
            ('LINEBELOW', (0, 0), (-1, 0), 2, VERT),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 0.5 * cm))

        # -------- TOTAUX --------
        pay_label = {
            'cash': 'Espèces',
            'card': 'Carte bancaire',
            'check': 'Chèque',
            'sumup': 'SumUp',
            'installment': f"Paiement en {self.order.installments}x"
        }.get(self.order.payment_method, self.order.payment_method)

        total_data = [
            ["Sous-total HT:", f"{self.order.subtotal_ht:.2f} €"],
            ["TVA (20%):", f"{self.order.total_tva:.2f} €"],
        ]

        if self.order.discount_amount > 0:
            total_data.append(["Remise:", f"-{self.order.discount_amount:.2f} €"])

        total_data.append([f"TOTAL TTC: {self.order.total_ttc:.2f} €", ""])
        total_data.append([f"Mode de paiement : {pay_label}", ""])

        total_table = Table(total_data, colWidths=[13 * cm, 4 * cm])
        total_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('BACKGROUND', (0, -2), (-1, -2), VERT),
            ('TEXTCOLOR', (0, -2), (-1, -2), colors.white),
            ('SPAN', (0, -2), (-1, -2)),
            ('BACKGROUND', (0, -1), (-1, -1), GRIS_CLAIR),
            ('SPAN', (0, -1), (-1, -1)),
        ]))

        elements.append(total_table)

        # -------- PIED DE PAGE --------
        elements.append(Spacer(1, 0.8 * cm))
        footer_style = ParagraphStyle(
            'Footer', parent=styles['Normal'], fontSize=8,
            textColor=GRIS, alignment=TA_CENTER
        )

        elements.append(Paragraph(
            "<b>Merci de votre confiance !</b><br/>"
            "Garantie : 2 ans vélos · 1 an accessoires<br/>"
            "<i>TVA non applicable, art. 293 B du CGI · Facture acquittée</i><br/><br/>"
            "<font color='#4ad19e'>●</font> SIRET: 123 456 789 00012 "
            "<font color='#4ad19e'>●</font> TVA: FR12345678901 <font color='#4ad19e'>●</font>",
            footer_style
        ))

        doc.build(elements)
        buffer.seek(0)

        self.invoice_pdf.save(
            f"facture_{self.invoice_number}.pdf",
            ContentFile(buffer.read()),
            save=True
        )

        return buffer

    # ---------------------
    # TICKET THERMIQUE
    # ---------------------
    def generate_receipt(self):
        """
        Génère un ticket de caisse 80mm, optimisé pour imprimante thermique.
        """
        buffer = BytesIO()
        TICKET_WIDTH = 80 * mm

        doc = SimpleDocTemplate(
            buffer,
            pagesize=(TICKET_WIDTH, 297 * mm),
            topMargin=5 * mm,
            bottomMargin=5 * mm,
            leftMargin=5 * mm,
            rightMargin=5 * mm
        )

        elements = []
        styles = getSampleStyleSheet()

        VERT = colors.HexColor('#4ad19e')

        # -------- EN-TÊTE --------
        header = Paragraph(
            "<b>MICHEL DE VELO</b>",
            ParagraphStyle('TH', parent=styles['Normal'],
                           fontSize=14, textColor=VERT,
                           alignment=TA_CENTER, fontName='Helvetica-Bold')
        )
        elements.append(header)

        # Info magasin
        store = self._get_store_info()
        info_style = ParagraphStyle(
            'Info', parent=styles['Normal'], alignment=TA_CENTER, fontSize=8
        )

        for line in [
            f"<b>{store['name']}</b>",
            store['address'],
            store['postal'],
            f"Tél: {store['phone']}"
        ]:
            elements.append(Paragraph(line, info_style))

        # Ligne
        line = Table([['']], colWidths=[70 * mm])
        line.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, -1), 1, colors.black)]))
        elements.append(Spacer(1, 3 * mm))
        elements.append(line)
        elements.append(Spacer(1, 3 * mm))

        # -------- TICKET N° --------
        elements.append(Paragraph(
            f"TICKET N° {self.invoice_number}",
            ParagraphStyle('TN', parent=styles['Normal'],
                           fontSize=10, alignment=TA_CENTER, fontName='Helvetica-Bold')
        ))
        elements.append(Paragraph(
            f"Date: {self.invoice_date:%d/%m/%Y %H:%M}",
            info_style
        ))

        elements.append(Spacer(1, 3 * mm))

        # -------- CLIENT --------
        client = self.order.client
        client_style = ParagraphStyle('Client', parent=styles['Normal'], fontSize=8)

        elements.append(Paragraph(f"<b>Client:</b> {client.first_name} {client.last_name}", client_style))
        if client.phone:
            elements.append(Paragraph(f"Tél: {client.phone}", client_style))

        elements.append(Spacer(1, 3 * mm))

        # -------- ARTICLES --------
        elements.append(Paragraph("<b>Article / Qté / Prix</b>", client_style))
        elements.append(Spacer(1, 1 * mm))

        for item in self.order.items.all():
            elements.append(Paragraph(f"<b>{item.product.name}</b>", client_style))
            elements.append(Paragraph(
                f"{item.quantity} x {item.unit_price_ttc:.2f}€ = "
                f"<b>{item.subtotal_ttc:.2f}€</b>",
                client_style
            ))
            elements.append(Spacer(1, 2 * mm))

        elements.append(line)
        elements.append(Spacer(1, 2 * mm))

        # -------- TOTAUX --------
        total_style = ParagraphStyle('TT', parent=styles['Normal'], fontSize=9, alignment=TA_RIGHT)

        elements.append(Paragraph(f"Sous-total HT: {self.order.subtotal_ht:.2f}€", total_style))
        elements.append(Paragraph(f"TVA (20%): {self.order.total_tva:.2f}€", total_style))

        if self.order.discount_amount > 0:
            elements.append(Paragraph(f"Remise: -{self.order.discount_amount:.2f}€", total_style))

        elements.append(Spacer(1, 2 * mm))
        elements.append(Paragraph(
            f"<b>TOTAL TTC: {self.order.total_ttc:.2f}€</b>",
            ParagraphStyle('Big', parent=styles['Normal'], fontSize=12,
                           alignment=TA_CENTER, fontName='Helvetica-Bold')
        ))

        pay_label = {
            'cash': 'Espèces',
            'card': 'Carte bancaire',
            'check': 'Chèque',
            'sumup': 'SumUp',
            'installment': f"{self.order.installments}x"
        }.get(self.order.payment_method, self.order.payment_method)

        elements.append(Paragraph(f"Paiement: {pay_label}", info_style))

        elements.append(Spacer(1, 3 * mm))
        elements.append(line)
        elements.append(Spacer(1, 3 * mm))

        # -------- NOTES --------
        if self.order.notes:
            elements.append(Paragraph(
                f"<b>Notes :</b> {self.order.notes}",
                ParagraphStyle('Notes', parent=styles['Normal'], fontSize=7)
            ))
            elements.append(Spacer(1, 2 * mm))

        # -------- PIED DE PAGE --------
        footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=7, alignment=TA_CENTER)

        elements.append(Paragraph("<b>Merci de votre visite !</b>", footer_style))
        elements.append(Paragraph("Garantie: 2 ans vélos / 1 an accessoires", footer_style))
        elements.append(Paragraph("TVA non applicable - art. 293 B du CGI", footer_style))
        elements.append(Paragraph("SIRET: 123 456 789 00012", footer_style))

        # Finalisation
        doc.build(elements)
        buffer.seek(0)

        self.receipt_pdf.save(
            f"ticket_{self.invoice_number}.pdf",
            ContentFile(buffer.read()),
            save=True
        )

        return buffer

    # ---------------------
    # Génération totale
    # ---------------------
    def generate_both(self):
        self.generate_receipt()
        self.generate_invoice()
        self.save()
