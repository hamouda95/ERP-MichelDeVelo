# Generated migration for enhanced repair models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('repairs', '0001_initial'),
        ('auth', '0012_alter_user_first_name_max_length'),
        ('clients', '0002_alter_client_address_alter_client_city_and_more'),
        ('products', '0004_fix_stock_columns'),
    ]

    operations = [
        # Ajouter les nouveaux champs au modèle Repair
        migrations.AddField(
            model_name='repair',
            name='bike_type',
            field=models.CharField(
                choices=[
                    ('mtb', 'VTT'),
                    ('road', 'Route'),
                    ('electric', 'Électrique'),
                    ('city', 'Ville'),
                    ('kids', 'Enfant'),
                    ('other', 'Autre')
                ],
                default='other',
                max_length=50,
                verbose_name='Type de vélo'
            ),
        ),
        migrations.AddField(
            model_name='repair',
            name='photo_1',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='repairs/photos/'
            ),
        ),
        migrations.AddField(
            model_name='repair',
            name='photo_2',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='repairs/photos/'
            ),
        ),
        migrations.AddField(
            model_name='repair',
            name='photo_3',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='repairs/photos/'
            ),
        ),
        migrations.AddField(
            model_name='repair',
            name='repair_type',
            field=models.CharField(
                choices=[
                    ('repair', 'Réparation'),
                    ('maintenance', 'Entretien'),
                    ('customization', 'Personnalisation'),
                    ('emergency', 'Urgence')
                ],
                default='repair',
                max_length=20,
                verbose_name='Type de service'
            ),
        ),
        migrations.AddField(
            model_name='repair',
            name='estimated_duration',
            field=models.IntegerField(
                blank=True,
                null=True,
                verbose_name='Durée estimée (heures)'
            ),
        ),
        migrations.AddField(
            model_name='repair',
            name='client_notified',
            field=models.BooleanField(
                default=False,
                verbose_name='Client notifié'
            ),
        ),
        migrations.AddField(
            model_name='repair',
            name='client_approved',
            field=models.BooleanField(
                default=False,
                verbose_name='Devis approuvé par client'
            ),
        ),
        migrations.AddField(
            model_name='repair',
            name='client_approval_date',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Date d\'approbation client'
            ),
        ),
        migrations.AddField(
            model_name='repair',
            name='labor_hours',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=5,
                verbose_name='Heures de main d\'œuvre'
            ),
        ),
        migrations.AddField(
            model_name='repair',
            name='labor_rate',
            field=models.DecimalField(
                decimal_places=2,
                default=35.00,
                max_digits=5,
                verbose_name='Taux horaire'
            ),
        ),
        migrations.AddField(
            model_name='repair',
            name='quote_pdf',
            field=models.FileField(
                blank=True,
                null=True,
                upload_to='repairs/quotes/',
                verbose_name='Devis PDF'
            ),
        ),
        migrations.AddField(
            model_name='repair',
            name='invoice_pdf',
            field=models.FileField(
                blank=True,
                null=True,
                upload_to='repairs/invoices/',
                verbose_name='Facture PDF'
            ),
        ),
        
        # Mettre à jour le statut choices
        migrations.AlterField(
            model_name='repair',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'En attente'),
                    ('diagnosis', 'Diagnostic'),
                    ('waiting_parts', 'Attente pièces'),
                    ('in_progress', 'En cours'),
                    ('testing', 'Test'),
                    ('completed', 'Terminée'),
                    ('delivered', 'Livrée'),
                    ('cancelled', 'Annulée')
                ],
                default='pending',
                max_length=20
            ),
        ),
        
        # Ajouter les nouveaux champs à RepairItem
        migrations.AddField(
            model_name='repairitem',
            name='item_type',
            field=models.CharField(
                choices=[
                    ('part', 'Pièce'),
                    ('labor', 'Main d\'œuvre'),
                    ('service', 'Service'),
                    ('other', 'Autre')
                ],
                default='part',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='repairitem',
            name='product',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='products.product',
                verbose_name='Produit (si applicable)'
            ),
        ),
        migrations.AddField(
            model_name='repairitem',
            name='ordered',
            field=models.BooleanField(
                default=False,
                verbose_name='Pièce commandée'
            ),
        ),
        migrations.AddField(
            model_name='repairitem',
            name='received',
            field=models.BooleanField(
                default=False,
                verbose_name='Pièce reçue'
            ),
        ),
        migrations.AddField(
            model_name='repairitem',
            name='ordered_date',
            field=models.DateField(
                blank=True,
                null=True,
                verbose_name='Date de commande'
            ),
        ),
        migrations.AddField(
            model_name='repairitem',
            name='received_date',
            field=models.DateField(
                blank=True,
                null=True,
                verbose_name='Date de réception'
            ),
        ),
        
        # Créer les nouveaux modèles
        migrations.CreateModel(
            name='RepairTimeline',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[
                    ('pending', 'En attente'),
                    ('diagnosis', 'Diagnostic'),
                    ('waiting_parts', 'Attente pièces'),
                    ('in_progress', 'En cours'),
                    ('testing', 'Test'),
                    ('completed', 'Terminée'),
                    ('delivered', 'Livrée'),
                    ('cancelled', 'Annulée')
                ], max_length=20)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='accounts.customuser')),
                ('repair', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='timeline', to='repairs.repair')),
            ],
            options={
                'db_table': 'repair_timeline',
                'ordering': ['-created_at'],
            },
        ),
        
        migrations.CreateModel(
            name='RepairDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_type', models.CharField(choices=[
                    ('quote', 'Devis'),
                    ('invoice', 'Facture'),
                    ('photo', 'Photo'),
                    ('diagnostic', 'Rapport de diagnostic'),
                    ('other', 'Autre')
                ], max_length=20)),
                ('title', models.CharField(max_length=200)),
                ('file', models.FileField(upload_to='repairs/documents/')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('uploaded_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='accounts.customuser')),
                ('repair', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='repairs.repair')),
            ],
            options={
                'db_table': 'repair_documents',
                'ordering': ['-uploaded_at'],
            },
        ),
        
        migrations.CreateModel(
            name='WorkshopWorkload',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('estimated_hours', models.DecimalField(decimal_places=2, max_digits=5)),
                ('actual_hours', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('mechanic', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='workload', to='accounts.customuser')),
                ('store', models.CharField(choices=[
                    ('ville_avray', 'Ville d\'Avray'),
                    ('garches', 'Garches')
                ], max_length=20)),
            ],
            options={
                'db_table': 'workshop_workload',
                'ordering': ['-date', 'store', 'mechanic'],
            },
        ),
        
        # Ajouter les index
        migrations.AddIndex(
            model_name='repair',
            index=models.Index(fields=['store'], name='repairs_store_idx'),
        ),
        migrations.AddIndex(
            model_name='repair',
            index=models.Index(fields=['priority'], name='repairs_priority_idx'),
        ),
    ]
