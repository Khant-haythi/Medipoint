import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
import plotly.express as px
import os
import sys
import django

# Dynamically set up Django for standalone use
if 'RUN_MAIN' not in os.environ:
    # Add the project root to sys.path (assuming Medipoint is the parent directory of app)
    project_root = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(os.path.dirname(project_root))  # Add Medipoint/ directory
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Medipoint.settings")  # Replace with your project name
    django.setup()

# Import Transaction model
try:
    from app.models import Transaction  # Use absolute import
except ImportError as e:
    print(f"Warning: Could not import Transaction model. Running without database access: {e}")
    Transaction = None  # Fallback for testing without Django

def perform_market_basket_analysis(data_source='db', csv_path=None):
    # Fetch data based on source
    if data_source == 'db':
        if Transaction is None:
            return {"error": "Database not available. Please run within Django or install dependencies."}
        df = pd.DataFrame(Transaction.objects.all().values('invoice_no', 'item'))
    elif data_source == 'csv' and csv_path:
        try:
            # Debug: Print the CSV path to ensure it’s correct
            print(f"Attempting to read CSV from: {csv_path}")
            df = pd.read_csv(csv_path)
            # Debug: Print the first few rows to verify data
            print("CSV Data Sample:", df.head())
            if not {'invoice_no', 'item'}.issubset(df.columns):
                return {"error": "CSV must contain 'invoice_no' and 'item' columns"}
            # Ensure invoice_no is numeric
            df['invoice_no'] = df['invoice_no'].astype(str)  # Convert to string to match database format
        except Exception as e:
            return {"error": f"Error reading CSV: {str(e)}"}
    else:
        return {"error": "No valid data source provided"}
    
    if df.empty:
        return {"error": "No transaction data available"}
    
    # Create basket matrix for MBA
    basket = (df.groupby(['invoice_no', 'item'])['item']
              .count().unstack().reset_index().fillna(0)
              .set_index('invoice_no'))
    basket = basket.applymap(lambda x: 1 if x > 0 else 0)
    
    # Run Apriori algorithm
    frequent_itemsets = apriori(basket, min_support=0.01, use_colnames=True)
    rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1)
    
    # Sort and format MBA results
    rules = rules.sort_values(['lift', 'confidence'], ascending=[False, False])
    mba_recommendations = rules[['antecedents', 'consequents', 'support', 'confidence', 'lift']].head(10)
    mba_recommendations['antecedents'] = mba_recommendations['antecedents'].apply(lambda x: ', '.join(list(x)))
    mba_recommendations['consequents'] = mba_recommendations['consequents'].apply(lambda x: ', '.join(list(x)))
    
    # Calculate best and least-selling products
    item_counts = df['item'].value_counts().reset_index()
    item_counts.columns = ['item', 'count']
    
    # Top 10 best-selling products
    top_selling = item_counts.head(10)
    
    # Least 10 selling products (excluding zero counts if any)
    least_selling = item_counts[item_counts['count'] > 0].tail(10)
    
    # Create Plotly bar charts for visualization
    top_fig = px.bar(top_selling, x='item', y='count', title='Top 10 Best-Selling Products',
                     labels={'item': 'Product', 'count': 'Sales Count'},
                     color='count', color_continuous_scale='Viridis')
    top_fig.update_layout(showlegend=False, plot_bgcolor='white', paper_bgcolor='white')
    
    least_fig = px.bar(least_selling, x='item', y='count', title='Least 10 Selling Products',
                       labels={'item': 'Product', 'count': 'Sales Count'},
                       color='count', color_continuous_scale='Reds')
    least_fig.update_layout(showlegend=False, plot_bgcolor='white', paper_bgcolor='white')
    
    # Convert Plotly figures to JSON for Streamlit
    top_json = top_fig.to_json()
    least_json = least_fig.to_json()
    
    return {
        'mba_recommendations': mba_recommendations.to_dict('records'),
        'top_selling': top_selling.to_dict('records'),
        'least_selling': least_selling.to_dict('records'),
        'top_chart': top_json,
        'least_chart': least_json
    }