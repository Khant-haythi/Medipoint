import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from .models import Transaction

def perform_market_basket_analysis(data_source='db', csv_path=None):
    # Fetch data based on source
    if data_source == 'db':
        df = pd.DataFrame(Transaction.objects.all().values('invoice_no', 'item'))
    elif data_source == 'csv' and csv_path:
        try:
            df = pd.read_csv(csv_path)
            if not {'invoice_no', 'item'}.issubset(df.columns):
                return {"error": "CSV must contain 'invoice_no' and 'item' columns"}
        except Exception as e:
            return {"error": f"Error reading CSV: {str(e)}"}
    else:
        return {"error": "No valid data source provided"}
    
    if df.empty:
        return {"error": "No transaction data available"}
    
    # Create basket matrix
    basket = (df.groupby(['invoice_no', 'item'])['item']
              .count().unstack().reset_index().fillna(0)
              .set_index('invoice_no'))
    basket = basket.applymap(lambda x: 1 if x > 0 else 0)
    
    # Run Apriori algorithm
    frequent_itemsets = apriori(basket, min_support=0.01, use_colnames=True)
    rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1)
    
    # Sort and format results
    rules = rules.sort_values(['lift', 'confidence'], ascending=[False, False])
    recommendations = rules[['antecedents', 'consequents', 'support', 'confidence', 'lift']].head(10)
    recommendations['antecedents'] = recommendations['antecedents'].apply(lambda x: ', '.join(list(x)))
    recommendations['consequents'] = recommendations['consequents'].apply(lambda x: ', '.join(list(x)))
    
    return recommendations.to_dict('records')