def generate_invoice(self):
    """
    Génère une FACTURE COMPLÈTE format A4
    Document officiel avec toutes les mentions légales
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
    
    # ============ EN-TÊTE AVEC LOGO + DATES ============
    logo_url = "https://static.wixstatic.com/media/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png/v1/fit/w_2500,h_1330,al_c/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png"
    logo = Image(logo_url, width=12*mm, height=12*mm)
    
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#4CAF50'),
        fontName='Helvetica-Bold',
        alignment=TA_LEFT
    )
    
    title_text = Paragraph("<b>MICHEL DE VELO</b>", title_style)
    
    # Dates à droite
    date_style = ParagraphStyle(
        'DateStyle',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_RIGHT
    )
    
    date_text = Paragraph(f"""
        <b>Date d'émission:</b> {self.invoice_date.strftime('%d/%m/%Y')}<br/>
        <b>Date de commande:</b> {self.order.created_at.strftime('%d/%m/%Y à %H:%M')}
    """, date_style)
    
    # Table pour aligner logo + titre à gauche, dates à droite
    header_table = Table([[logo, title_text, date_text]], colWidths=[15*mm, 90*mm, 65*mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (1, 0), 'LEFT'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    elements.append(header_table)
    elements.append(Spacer(1, 0.3*cm))
    
    # ============ INFORMATIONS DU MAGASIN (sur une ligne) ============
    store_info = self._get_store_info()
    
    store_style = ParagraphStyle(
        'StoreInfo',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#4b5563')
    )
    
    store_text = f"""
    <b>Magasin de {store_info['name']}</b> {store_info['address']} {store_info['postal']}<br/>
    Tél: {store_info['phone']} | Email: {store_info['email']}
    """
    elements.append(Paragraph(store_text, store_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # ============ NUMÉRO DE FACTURE ============
    invoice_header_style = ParagraphStyle(
        'InvoiceHeader',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    elements.append(Paragraph(f"FACTURE N° {self.invoice_number}", invoice_header_style))
    elements.append(Spacer(1, 0.4*cm))
    
    # ============ INFORMATIONS CLIENT ============
    client = self.order.client
    client_box_data = [
        [Paragraph('<b>FACTURÉ À:</b>', styles['Normal'])],
        [Paragraph(f'<b>{client.first_name} {client.last_name}</b>', styles['Normal'])],
    ]
    
    if client.address:
        client_box_data.append([Paragraph(client.address, styles['Normal'])])
    if client.postal_code and client.city:
        client_box_data.append([Paragraph(f'{client.postal_code} {client.city}', styles['Normal'])])
    
    client_box_data.append([Paragraph(f'Email: {client.email}', styles['Normal'])])
    client_box_data.append([Paragraph(f'Tél: {client.phone}', styles['Normal'])])
    
    client_table = Table(client_box_data, colWidths=[17*cm])
    client_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 0.5*cm))
    
    # ============ NOTES DE COMMANDE ============
    if self.order.notes:
        notes_content_style = ParagraphStyle(
            'NotesContent',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#374151')
        )
        
        notes_box_data = [[Paragraph(f'<b>📝 Notes:</b> {self.order.notes}', notes_content_style)]]
        notes_table = Table(notes_box_data, colWidths=[17*cm])
        notes_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef3c7')),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#fbbf24')),
        ]))
        elements.append(notes_table)
        elements.append(Spacer(1, 0.4*cm))
    
    # ============ TABLEAU DES ARTICLES ============
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=9,
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
            Paragraph(f'<b>{item.product.name}</b><br/><font size="7">Réf: {item.product.reference}</font>', styles['Normal']),
            Paragraph(f'{item.quantity}', styles['Normal']),
            Paragraph(f'{item.unit_price_ht:.2f} €', styles['Normal']),
            Paragraph(f'{item.tva_rate:.0f}%', styles['Normal']),
            Paragraph(f'<b>{item.subtotal_ttc:.2f} €</b>', styles['Normal']),
        ])
    
    table = Table(data, colWidths=[8*cm, 1.8*cm, 2.5*cm, 1.8*cm, 2.9*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
        ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 0.5*cm))
    
    # ============ TOTAUX ============
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
        ['TVA:', f'{self.order.total_tva:.2f} €'],
    ]
    
    if self.order.discount_amount > 0:
        totals_data.append(['Remise:', f'-{self.order.discount_amount:.2f} €'])
    
    totals_data.extend([
        ['', ''],
        [Paragraph('<b>TOTAL TTC:</b>', styles['Normal']), 
         Paragraph(f'<b>{self.order.total_ttc:.2f} €</b>', styles['Normal'])],
        ['Mode de paiement:', payment_text],
    ])
    
    totals_table = Table(totals_data, colWidths=[13*cm, 4*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -2), 9),
        ('FONTNAME', (0, -2), (-1, -2), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -2), (-1, -2), 12),
        ('TEXTCOLOR', (0, -2), (-1, -2), colors.HexColor('#1e40af')),
        ('LINEABOVE', (0, -2), (-1, -2), 2, colors.HexColor('#1e40af')),
        ('TOPPADDING', (0, -2), (-1, -2), 8),
        ('BOTTOMPADDING', (0, -2), (-1, -2), 8),
        ('BACKGROUND', (1, -2), (1, -2), colors.HexColor('#dbeafe')),
    ]))
    elements.append(totals_table)
    
    # ============ PIED DE PAGE ============
    elements.append(Spacer(1, 0.8*cm))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER
    )
    
    footer_text = """
    <b>Merci de votre confiance !</b><br/>
    Garantie : 2 ans sur les vélos, 1 an sur les accessoires<br/>
    <i>TVA non applicable, art. 293 B du CGI - Facture acquittée</i><br/>
    <br/>
    SIRET: 123 456 789 00012 | TVA: FR12345678901
    """
    elements.append(Paragraph(footer_text, footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    # Sauvegarder
    filename = f'facture_{self.invoice_number}.pdf'
    self.invoice_pdf.save(filename, ContentFile(buffer.read()), save=True)
    
    return buffer
