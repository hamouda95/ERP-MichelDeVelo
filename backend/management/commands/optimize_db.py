from django.core.management.base import BaseCommand
from utils.db_optimizer import create_indexes, analyze_tables, vacuum_tables

class Command(BaseCommand):
    help = 'Optimize database performance'

    def add_arguments(self, parser):
        parser.add_argument(
            '--vacuum',
            action='store_true',
            help='Run VACUUM to reclaim storage',
        )

    def handle(self, *args, **options):
        self.stdout.write('Starting database optimization...')
        
        # Créer les index
        self.stdout.write('Creating indexes...')
        create_indexes()
        self.stdout.write(self.style.SUCCESS('Indexes created successfully'))
        
        # Analyser les tables
        self.stdout.write('Analyzing tables...')
        analyze_tables()
        self.stdout.write(self.style.SUCCESS('Tables analyzed successfully'))
        
        # VACUUM si demandé
        if options['vacuum']:
            self.stdout.write('Running VACUUM...')
            vacuum_tables()
            self.stdout.write(self.style.SUCCESS('VACUUM completed successfully'))
        
        self.stdout.write(self.style.SUCCESS('Database optimization completed!'))
