"""
Validations sécurisées pour l'ERP Michel De Vélo
"""
import re
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _

def validate_phone_number(value):
    """Validation sécurisée des numéros de téléphone"""
    pattern = r'^[\+]?[1-9][\d]{0,15}$'
    if not re.match(pattern, value):
        raise ValidationError(_('Numéro de téléphone invalide'))
    return value

def validate_bike_serial(value):
    """Validation des numéros de série de vélo"""
    if len(value) < 3 or len(value) > 30:
        raise ValidationError(_('Le numéro de série doit contenir entre 3 et 30 caractères'))
    return value.upper()

def validate_no_html(value):
    """Empêche les injections HTML"""
    if '<' in value or '>' in value:
        raise ValidationError(_('Les caractères HTML ne sont pas autorisés'))
    return value

def validate_safe_string(value):
    """Validation des chaînes de caractères sécurisées"""
    # Patterns dangereux à bloquer
    dangerous_patterns = [
        r'<script.*?>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',  # onclick, onload, etc.
        r'<iframe.*?>.*?</iframe>',
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, value, re.IGNORECASE):
            raise ValidationError(_('Contenu non autorisé détecté'))
    
    return value.strip()

class SecurePasswordValidator:
    """Validation renforcée des mots de passe"""
    def __init__(self, min_length=8):
        self.min_length = min_length
    
    def validate(self, password, user=None):
        errors = []
        
        if len(password) < self.min_length:
            errors.append(_('Le mot de passe doit contenir au moins {} caractères').format(self.min_length))
        
        if not re.search(r'[A-Z]', password):
            errors.append(_('Le mot de passe doit contenir au moins une majuscule'))
        
        if not re.search(r'[a-z]', password):
            errors.append(_('Le mot de passe doit contenir au moins une minuscule'))
        
        if not re.search(r'\d', password):
            errors.append(_('Le mot de passe doit contenir au moins un chiffre'))
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append(_('Le mot de passe doit contenir au moins un caractère spécial'))
        
        # Vérifier les mots de passe courants
        common_passwords = ['password', '123456', 'admin', 'qwerty', 'letmein']
        if password.lower() in common_passwords:
            errors.append(_('Ce mot de passe est trop courant'))
        
        if errors:
            raise ValidationError(errors)
        
        return password
    
    def get_help_text(self):
        return _(
            'Le mot de passe doit contenir au moins {} caractères, '
            'une majuscule, une minuscule, un chiffre et un caractère spécial.'
        ).format(self.min_length)

# Validateur pour les montants monétaires
def validate_positive_amount(value):
    """Validation des montants positifs"""
    try:
        amount = float(value)
        if amount < 0:
            raise ValidationError(_('Le montant doit être positif'))
        if amount > 999999.99:
            raise ValidationError(_('Le montant ne peut pas dépasser 999,999.99'))
        return amount
    except (ValueError, TypeError):
        raise ValidationError(_('Montant invalide'))

# Validateur pour les emails avec vérification de domaine
def validate_email_advanced(value):
    """Validation avancée des emails"""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, value):
        raise ValidationError(_('Format d\'email invalide'))
    
    # Vérifier les domaines temporaires courants
    temporary_domains = ['tempmail.org', '10minutemail.com', 'guerrillamail.com']
    domain = value.split('@')[1].lower()
    if domain in temporary_domains:
        raise ValidationError(_('Les emails temporaires ne sont pas autorisés'))
    
    return value.lower()

# Validateur pour les noms et prénoms
def validate_name(value):
    """Validation des noms de personnes"""
    if not value or not value.strip():
        raise ValidationError(_('Ce champ est obligatoire'))
    
    # Autoriser les caractères internationaux mais bloquer les chiffres et symboles
    if not re.match(r'^[a-zA-ZÀ-ÿ\s\'-]+$', value):
        raise ValidationError(_('Le nom ne peut contenir que des lettres'))
    
    if len(value.strip()) < 2:
        raise ValidationError(_('Le nom doit contenir au moins 2 caractères'))
    
    return value.strip().title()
