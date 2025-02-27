import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import os
import sys
import django
import json

# Dynamically set up Python path for standalone use
if 'RUN_MAIN' not in os.environ:
    # Get the directory where recommendations.py is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Add the parent directory (Medipoint) to sys.path
    project_root = os.path.dirname(script_dir)  # Points to Medipoint/
    sys.path.append(project_root)
    # Add the app directory explicitly
    sys.path.append(os.path.join(project_root, 'app'))

    # Set up Django for standalone use
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Medipoint.settings")  # Replace with your project name
    django.setup()

from market_basket import perform_market_basket_analysis  # Use absolute import

# Set page configuration for a cleaner look
st.set_page_config(page_title="Everyes POS - Market Basket Analysis", layout="wide", initial_sidebar_state="collapsed")

st.title("Everyes POS - Market Basket Analysis & Sales Insights")

# Back button to return to Django admin dashboard
st.markdown(
    """
    <a href="http://127.0.0.1:8000/admin-dashboard/" target="_self" 
       class="text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 focus:ring-4 focus:outline-none focus:ring-red-300 font-semibold rounded-full text-sm px-6 py-3 mb-6 inline-block transform hover:scale-105 transition-transform duration-300">
        Back to Admin Dashboard
    </a>
    """,
    unsafe_allow_html=True
)

# Get data source from command-line argument or default to database
if len(sys.argv) > 1:
    data_source = 'csv'
    csv_path = sys.argv[1]
    # Debug: Print the CSV path received
    st.write(f"Analyzing CSV from: {csv_path}")
else:
    data_source = 'db'
    csv_path = None

# Perform analysis
results = perform_market_basket_analysis(data_source=data_source, csv_path=csv_path)

if "error" in results:
    st.error(results["error"])
else:
    # Display MBA Recommendations
    st.header("Top 10 Item Associations")
    mba_df = pd.DataFrame(results['mba_recommendations'])
    st.table(mba_df.style.set_properties(**{'background-color': 'white', 'border-color': 'gray', 'border-style': 'solid', 'border-width': '1px'}))

    # Display Top 10 Best-Selling Products
    st.header("Top 10 Best-Selling Products")
    top_df = pd.DataFrame(results['top_selling'])
    st.table(top_df.style.set_properties(**{'background-color': 'white', 'border-color': 'gray', 'border-style': 'solid', 'border-width': '1px'}))
    # Render Plotly chart
    top_chart = go.Figure(json.loads(results['top_chart']))
    st.plotly_chart(top_chart, use_container_width=True)

    # Display Least 10 Selling Products
    st.header("Least 10 Selling Products")
    least_df = pd.DataFrame(results['least_selling'])
    st.table(least_df.style.set_properties(**{'background-color': 'white', 'border-color': 'gray', 'border-style': 'solid', 'border-width': '1px'}))
    # Render Plotly chart
    least_chart = go.Figure(json.loads(results['least_chart']))
    st.plotly_chart(least_chart, use_container_width=True)

    st.write("Use these insights to create product sets (e.g., combos) or optimize inventory!")

if __name__ == "__main__":
    # Streamlit runs this file directly
    pass