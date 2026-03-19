#!/usr/bin/env python
"""
Service Email 100% Gratuit - Alternative aux SMS
Fonctionne avec TOUS les opérateurs français
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class EmailNotificationService:
    """Service Email gratuit pour notifications automatiques"""
    
    def __init__(self):
        self.smtp_server = getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'EMAIL_PORT', 587)
        self.email_user = getattr(settings, 'EMAIL_HOST_USER', '')
        self.email_password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        self.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', self.email_user)
    
    def send_notification(self, to_email, subject, message, client_name=None, store=None):
        """
        Envoyer un email de notification automatique
        
        Args:
            to_email (str): Email du client
            subject (str): Sujet de l'email
            message (str): Message principal
            client_name (str): Nom du client (optionnel)
            store (str): Magasin (optionnel)
            
        Returns:
            dict: {'success': bool, 'message': str}
        """
        try:
            # Vérifier la configuration
            if not self.email_user or not self.email_password:
                return {
                    'success': False,
                    'message': 'Configuration email manquante (EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)'
                }
            
            # Créer le message email
            msg = MIMEMultipart()
            msg['From'] = f"Michel De Vélo <{self.from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Créer le contenu HTML pour un look professionnel
            html_content = self._create_html_email(client_name, message, store)
            
            # Ajouter le contenu
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))
            
            # Envoyer l'email
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.email_user, self.email_password)
            
            text = msg.as_string()
            server.sendmail(self.from_email, to_email, text)
            server.quit()
            
            logger.info(f"Email envoyé avec succès à {to_email}")
            return {
                'success': True,
                'message': 'Email envoyé avec succès',
                'method': 'Email',
                'store': store
            }
            
        except Exception as e:
            error_msg = f"Erreur lors de l'envoi de l'email: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'message': error_msg,
                'method': 'Email',
                'store': store
            }
    
    def _create_html_email(self, client_name, message, store):
        """Créer un email HTML professionnel"""
        
        # Déterminer le magasin
        store_info = {
            'ville_avray': {
                'name': 'Michel De Vélo - Ville d\'Avray',
                'address': '123 Avenue de la République, 92310 Ville d\'Avray',
                'phone': '01 23 45 67 89'
            },
            'garches': {
                'name': 'Michel De Vélo - Garches',
                'address': '45 Rue de la Paix, 92380 Garches',
                'phone': '01 23 45 67 90'
            }
        }.get(store, {
            'name': 'Michel De Vélo',
            'address': 'Adresse à confirmer',
            'phone': 'Numéro à confirmer'
        })
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Michel De Vélo - Notification</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                }}
                .button {{
                    display: inline-block;
                    padding: 15px 30px;
                    background: #28a745;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    color: #666;
                    font-size: 12px;
                }}
                .highlight {{
                    background: #e7f3ff;
                    padding: 15px;
                    border-left: 4px solid #007bff;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚴 Michel De Vélo</h1>
                <p>Votre vélo est prêt !</p>
            </div>
            
            <div class="content">
                <h2>Bonjour {client_name or 'Client'},</h2>
                
                <div class="highlight">
                    <strong>{message}</strong>
                </div>
                
                <p>Nous sommes ravis de vous informer que votre vélo a été entièrement réparé et est disponible pour retrait.</p>
                
                <h3>📍 Informations de retrait</h3>
                <ul>
                    <li><strong>Magasin :</strong> {store_info['name']}</li>
                    <li><strong>Adresse :</strong> {store_info['address']}</li>
                    <li><strong>Téléphone :</strong> {store_info['phone']}</li>
                </ul>
                
                <p><strong>Horaires d'ouverture :</strong></p>
                <ul>
                    <li>Lundi - Vendredi : 9h00 - 19h00</li>
                    <li>Samedi : 9h00 - 18h00</li>
                    <li>Dimanche : Fermé</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="#" class="button">📱 Contacter le magasin</a>
                </div>
                
                <p>N'hésitez pas à nous appeler pour confirmer votre venue.</p>
                
                <p>Merci de votre confiance !</p>
                
                <p><em>L'équipe Michel De Vélo</em></p>
            </div>
            
            <div class="footer">
                <p>© 2024 Michel De Vélo - Service client : {store_info['phone']}</p>
                <p>Cet email a été envoyé automatiquement</p>
            </div>
        </body>
        </html>
        """
        
        return html

# Instance globale
email_service = EmailNotificationService()
