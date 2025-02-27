import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules

def perform_market_basket_analysis(csv_path):
    # Read the CSV file
    try:
        df = pd.read_csv(csv_path)
        # Assuming CSV has 'InvoiceNo' and 'Item' columns
        basket = (df.groupby(['InvoiceNo', 'Item'])['Item']
                  .count().unstack().reset_index().fillna(0)
                  .set_index('InvoiceNo'))
        # Encode to 0/1
        basket = basket.applymap(lambda x: 1 if x > 0 else 0)
    except Exception as e:
        return {"error": f"Error reading CSV: {str(e)}"}
    
    # Run Apriori algorithm
    frequent_itemsets = apriori(basket, min_support=0.01, use_colnames=True)
    rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1)
    
    # Sort and format results
    rules = rules.sort_values(['lift', 'confidence'], ascending=[False, False])
    recommendations = rules[['antecedents', 'consequents', 'support', 'confidence', 'lift']].head(10)
    recommendations['antecedents'] = recommendations['antecedents'].apply(lambda x: ', '.join(list(x)))
    recommendations['consequents'] = recommendations['consequents'].apply(lambda x: ', '.join(list(x)))
    
    return recommendations.to_dict('records')

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        csv_path = sys.argv[1]
        results = perform_market_basket_analysis(csv_path)
        print(results)
    else:
        print("Please provide a CSV file path")