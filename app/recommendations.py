import pandas as pd
import os
import django

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Medipoint.settings")  # Replace with your project name
django.setup()

from app.models import Transaction  # Adjust to your app

# Preprocess function
def preprocess_breadbasket():
    # Load the dataset
    file_path = 'BreadBasket_DMS.csv'  # Update with your file path
    df = pd.read_csv(file_path)

    # Rename columns to match your model
    df.rename(columns={'Transaction': 'invoice_no', 'Item': 'item'}, inplace=True)
    
    # Optional: Filter for bakery-relevant items (keep all for now)
    # bakery_items = ['Bread', 'Pastry', 'Muffin', 'Cookies', 'Scandinavian', 'Medialuna']  # Add more as needed
    # df = df[df['item'].isin(bakery_items)]

    # Remove any empty or irrelevant rows (e.g., 'NONE' items if present)
    df = df[df['item'] != 'NONE'].dropna(subset=['item'])

    # Ensure invoice_no is numeric (as integers)
    df['invoice_no'] = df['invoice_no'].astype(int)

    # Save as CSV for upload (optional)
    output_csv = 'bakery_transactions.csv'
    df.to_csv(output_csv, index=False)
    print(f'Saved preprocessed data to {output_csv}')

    # Optionally load into Django database
    Transaction.objects.all().delete()  # Clear existing data (for testing)
    for _, row in df.iterrows():
        Transaction.objects.create(invoice_no=row['invoice_no'], item=row['item'])
    print('Loaded data into Transaction model')

if __name__ == '__main__':
    preprocess_breadbasket()