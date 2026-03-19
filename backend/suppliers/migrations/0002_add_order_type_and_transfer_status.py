# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('suppliers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='purchaseorder',
            name='order_type',
            field=models.CharField(
                choices=[('central', 'Commande Centrale'), ('local', 'Commande Locale')], 
                default='central', 
                max_length=10
            ),
        ),
        migrations.AddField(
            model_name='purchaseorder',
            name='transfer_status',
            field=models.CharField(
                choices=[
                    ('pending', 'En attente de transfert'),
                    ('partial', 'Transfert partiel'),
                    ('complete', 'Transfert complet')
                ], 
                default='pending', 
                max_length=10
            ),
        ),
    ]
