from django.http import JsonResponse, FileResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.shortcuts import render
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from .models import Product,EmployeeProfile,Transaction
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth import logout
from django.core.files.storage import FileSystemStorage
import os,json,datetime,io,uuid,csv
from mlxtend.frequent_patterns import association_rules, apriori
import pandas as pd
from django.db import IntegrityError
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.colors import HexColor
from .market_basket import perform_market_basket_analysis
from django.conf import settings
from app import market_basket
from django.views.decorators.csrf import csrf_exempt
from django.db.models import F
from django.db.models.functions import ExtractHour, ExtractDay
from datetime import datetime  
from scipy.stats import chi2_contingency
from sklearn.model_selection import train_test_split
import logging

# Login view
def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            profile = EmployeeProfile.objects.get(user=user)
            if profile.role == 'admin':
                return redirect('admin_dashboard')
            elif profile.role == 'cashier':
                return redirect('cashier_dashboard')
        else:
            messages.error(request, 'Invalid username or password.')
    return render(request, 'login.html')


@login_required
def admin_dashboard(request):
    profile = EmployeeProfile.objects.get(user=request.user)
    if profile.role != 'admin':
        return redirect('cashier_dashboard')  # Adjust 'cashier_dashboard' URL name if different
    
    # Default to monthly data for initial render
    try:
        monthly_sales = Transaction.objects.values('timestamp__month', 'timestamp__year').annotate(total=Sum(F('quantity') * F('price'))).order_by('timestamp')
        overview_labels = [f"{s['timestamp__month']}/{s['timestamp__year']}" for s in monthly_sales if s['total'] is not None]
        overview_data = [float(s['total'] or 0) for s in monthly_sales]
    except Exception as e:
        print(f"Error in monthly sales query: {e}")
        overview_labels = ["No Data"]
        overview_data = [0.0]

    # Fallback if no data exists
    if not overview_labels:
        overview_labels = ["No Data"]
        overview_data = [0.0]

    # Total Sales, Cost, and Products Sold (Monthly by default, will be updated dynamically)
    try:
        total_sales = Transaction.objects.annotate(total=Sum(F('quantity') * F('price'))).aggregate(total=Sum('total'))['total'] or 0
        sales_progress = min(100, (total_sales / 50000) * 100)  # Example: 100% at $50,000

        transactions = Transaction.objects.all()
        total_cost = 0
        for transaction in transactions:
            try:
                product = Product.objects.get(name=transaction.item)  # Match item name to Product.name
                total_cost += product.price * transaction.quantity  # Adjust if 'cost' field name differs
            except Product.DoesNotExist:
                continue
            except Exception as e:
                print(f"Error calculating cost for transaction {transaction.id}: {e}")
        cost_progress = min(100, (total_cost / 10000) * 100)  # Example: 100% at $10,000

        products_sold = Transaction.objects.aggregate(total=Sum('quantity'))['total'] or 0
        products_progress = min(100, (products_sold / 10000) * 100)  # Example: 100% at 10,000 units
    except Exception as e:
        print(f"Error calculating KPIs: {e}")
        total_sales, total_cost, products_sold = 0.0, 0.0, 0
        sales_progress, cost_progress, products_progress = 0, 0, 0

    # Cashiers (Employees with their total sales, inferred from transactions)
    try:
        cashiers = EmployeeProfile.objects.filter(role='cashier').annotate(total_sales=Sum(F('transaction__quantity') * F('transaction__price')))
    except Exception as e:
        print(f"Error fetching cashiers: {e}")
        cashiers = EmployeeProfile.objects.filter(role='cashier')  # Fallback with no sales data

    # Recent Transactions (Last 10 transactions, for example)
    try:
        recent_transactions = Transaction.objects.order_by('-timestamp')[:10]
    except Exception as e:
        print(f"Error fetching recent transactions: {e}")
        recent_transactions = []

    context = {
        'total_sales': total_sales,
        'sales_progress': sales_progress,
        'total_cost': total_cost,
        'cost_progress': cost_progress,
        'products_sold': products_sold,
        'products_progress': products_progress,
        'cashiers': cashiers,
        'recent_transactions': recent_transactions,
        'overview_labels': json.dumps(overview_labels),
        'overview_data': json.dumps(overview_data),
    }
    return render(request, 'manager/index.html', context)

# AJAX endpoints for chart data by time period
def dashboard_data(request, period):
    today = datetime.now().date()
    try:
        if period == 'daily':
            start_date = today - timedelta(days=7)  # Last 7 days for daily view
            transactions = Transaction.objects.filter(timestamp__date__gte=start_date).annotate(total=Sum(F('quantity') * F('price'))).values('timestamp__date').annotate(total=Sum('total')).order_by('timestamp__date')
            labels = [t['timestamp__date'].strftime('%Y-%m-%d') for t in transactions if t['total'] is not None]
            data = [float(t['total'] or 0) for t in transactions]
        elif period == 'weekly':
            start_date = today - timedelta(weeks=4)  # Last 4 weeks for weekly view
            transactions = Transaction.objects.filter(timestamp__date__gte=start_date).annotate(total=Sum(F('quantity') * F('price'))).values('timestamp__week', 'timestamp__year').annotate(total=Sum('total')).order_by('timestamp__year', 'timestamp__week')
            labels = [f"Week {t['timestamp__week']}/{t['timestamp__year']}" for t in transactions if t['total'] is not None]
            data = [float(t['total'] or 0) for t in transactions]
        elif period == 'monthly':
            transactions = Transaction.objects.values('timestamp__month', 'timestamp__year').annotate(total=Sum(F('quantity') * F('price'))).order_by('timestamp')
            labels = [f"{t['timestamp__month']}/{t['timestamp__year']}" for t in transactions if t['total'] is not None]
            data = [float(t['total'] or 0) for t in transactions]
        else:  # yearly
            transactions = Transaction.objects.values('timestamp__year').annotate(total=Sum(F('quantity') * F('price'))).order_by('timestamp')
            labels = [str(t['timestamp__year']) for t in transactions if t['total'] is not None]
            data = [float(t['total'] or 0) for t in transactions]

        # Fallback if no data exists
        if not labels:
            labels = ["No Data"]
            data = [0.0]
    except Exception as e:
        print(f"Error in dashboard_data for {period}: {e}")
        labels = ["No Data"]
        data = [0.0]

    return JsonResponse({'labels': labels, 'sales': data})

# AJAX endpoint for KPI data by time period
def dashboard_kpis(request, period):
    today = datetime.now().date()
    try:
        if period == 'daily':
            start_date = today - timedelta(days=7)  # Last 7 days
            transactions = Transaction.objects.filter(timestamp__date__gte=start_date)
        elif period == 'weekly':
            start_date = today - timedelta(weeks=4)  # Last 4 weeks
            transactions = Transaction.objects.filter(timestamp__date__gte=start_date)
        elif period == 'monthly':
            # Filter for the current month
            transactions = Transaction.objects.filter(timestamp__year=datetime.now().year, timestamp__month=datetime.now().month)
        else:  # yearly
            # Filter for the current year
            transactions = Transaction.objects.filter(timestamp__year=datetime.now().year)

        total_sales = transactions.annotate(total=Sum(F('quantity') * F('price'))).aggregate(total=Sum('total'))['total'] or 0
        total_cost = 0
        for transaction in transactions:
            try:
                product = Product.objects.get(name=transaction.item)  # Match item name to Product.name
                total_cost += product.price * transaction.quantity  # Adjust if 'cost' field name differs
            except Product.DoesNotExist:
                continue
            except Exception as e:
                print(f"Error calculating cost for transaction {transaction.id}: {e}")
                continue
        products_sold = transactions.aggregate(total=Sum('quantity'))['total'] or 0
    except Exception as e:
        print(f"Error in dashboard_kpis for {period}: {e}")
        total_sales, total_cost, products_sold = 0.0, 0.0, 0

    return JsonResponse({
        'total_sales': float(total_sales),
        'total_cost': float(total_cost),
        'products_sold': int(products_sold),
    })
# Cashier dashboard
@login_required
def cashier_dashboard(request):
    profile = EmployeeProfile.objects.get(user=request.user)
    if profile.role != 'cashier':
        return redirect('admin_dashboard')
    return render(request, 'cashier/cashier_side.html')

# Logout view
@login_required
def logout_view(request):
    logout(request)
    return redirect('login')

@login_required
def add_employee(request):
    profile = EmployeeProfile.objects.get(user=request.user)
    employees = EmployeeProfile.objects.all()
    if profile.role != 'admin':
        return redirect('cashier_dashboard')
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        if User.objects.filter(username=username).exists():
            messages.error(request, 'Username already exists.')
        else:
            user = User.objects.create_user(username=username, password=password)
            EmployeeProfile.objects.create(user=user, role='cashier')
            messages.success(request, 'Employee added successfully.')
        return redirect('admin_dashboard')
    return render(request, 'manager/employee.html', {'employees': employees})  

@login_required
def delete_employee(request, user_id):
    profile = EmployeeProfile.objects.get(user=request.user)
    if profile.role != 'admin':
        return redirect('cashier_dashboard')
    employee = EmployeeProfile.objects.get(user__id=user_id)
    if employee.role != 'admin':  # Prevent deleting admin
        employee.user.delete()
        messages.success(request, 'Employee deleted successfully.')
    return redirect('admin_dashboard')

def index(request):
    return render(request, 'manager/index.html')

def cashier(request):
    return render(request, 'cashier/cashier_side.html')

def showproduct(request):
    # Fetch all products (ignoring product_id)
    products = Product.objects.all()
    
    # Order products by name (optional)
    products = products.order_by("name").all()
    
    # Serialize all products
    serialized_products = [product.serialize(current_user=request.user) for product in products]
    
    # Create the data dictionary
    data = {
        'products': serialized_products,
    }
    
    # print(data)  # For debugging
    return JsonResponse(data)

def showhistory(request):
    # Fetch all products (ignoring product_id)
    transactions = Transaction.objects.all().order_by('-timestamp')
    
    # Serialize all products
    serialized_transaction = [transaction.serialize(current_user=request.user) for transaction in transactions]
    
    # Create the data dictionary
    data = {
        'transactions': serialized_transaction,
    }
    
    # print(data)  # For debugging
    return JsonResponse(data)

# Configure logging

# Configure logging
logger = logging.getLogger(__name__)

@login_required
def mba_recommendations(request):
    if request.method == "POST" and 'csv_file' in request.FILES:
        csv_file = request.FILES['csv_file']
        try:
            df = pd.read_csv(csv_file).drop_duplicates(subset=['invoice_no', 'item'])
            required_columns = ['invoice_no', 'item']
            if not all(col in df.columns for col in required_columns):
                return JsonResponse({'success': False, 'message': "CSV must contain 'invoice_no' and 'item' columns."})

            df['invoice_no'] = df['invoice_no'].astype(str)
            df['item'] = df['item'].astype(str)

            print("Item frequencies:", df['item'].value_counts(normalize=True).head(10))

            basket = (df.groupby(['invoice_no', 'item'])['item']
                      .count().unstack().reset_index().fillna(0)
                      .set_index('invoice_no') > 0).astype(bool)

            # Ensure enough transactions exist
            if len(basket) < 10:
                return JsonResponse({'success': False, 'message': "Not enough transactions for analysis."})

            train_idx, test_idx = train_test_split(basket.index, test_size=0.1, random_state=42)
            train_basket = basket.loc[train_idx]
            test_basket = basket.loc[test_idx]

            frequent_itemsets = apriori(basket, min_support=0.005, use_colnames=True)
            rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1.2)
            rules = rules[rules['confidence'] > 0.5].sort_values(['lift', 'confidence'], ascending=[False, False])

            if rules.empty:
                return JsonResponse({'success': False, 'message': "No strong association rules found."})

            rules['antecedents'] = rules['antecedents'].apply(lambda x: ', '.join(list(x)))
            rules['consequents'] = rules['consequents'].apply(lambda x: ', '.join(list(x)))

            recommendations = rules.to_dict(orient="records")[:15]  # Show only 15 recommendations

            # Train rules separately
            frequent_itemsets_train = apriori(train_basket, min_support=0.005, use_colnames=True)
            rules_train = association_rules(frequent_itemsets_train, metric="lift", min_threshold=1.2)
            rules_train = rules_train[rules_train['confidence'] > 0.5].sort_values(['lift', 'confidence'], ascending=[False, False])

            if rules_train.empty:
                return JsonResponse({'success': False, 'message': "No rules found in training set."})

            rules_train['antecedents'] = rules_train['antecedents'].apply(lambda x: ', '.join(list(x)))
            rules_train['consequents'] = rules_train['consequents'].apply(lambda x: ', '.join(list(x)))

            correct_predictions = 0
            total_predictions = 0
            prediction_details = []

            for idx in test_basket.index:
                transaction = test_basket.loc[idx]
                items_in_transaction = set(transaction.index[transaction].tolist())

                best_rule = rules_train[rules_train['antecedents'].apply(lambda x: set(x.split(', ')).issubset(items_in_transaction))].sort_values('confidence', ascending=False).head(1)

                if not best_rule.empty:
                    total_predictions += 1
                    predicted_consequent = best_rule['consequents'].iloc[0]
                    actual_consequent = 'Present' if set(predicted_consequent.split(', ')).issubset(items_in_transaction) else 'Not present'
                    is_correct = actual_consequent == 'Present'
                    if is_correct:
                        correct_predictions += 1
                    prediction_details.append({
                        'transaction': '{' + ', '.join(items_in_transaction) + '}',
                        'rule_applied': best_rule['antecedents'].iloc[0] + ' -> ' + predicted_consequent,
                        'predicted_consequent': predicted_consequent,
                        'actual_consequent': actual_consequent,
                        'correct': is_correct
                    })

            predictive_accuracy = (correct_predictions / total_predictions) * 100 if total_predictions > 0 else "Insufficient data for prediction."

            return JsonResponse({
                'success': True,
                'message': 'CSV analyzed successfully!',
                'results': {
                    'recommendations': recommendations,
                    'top_selling': [{'item': item, 'count': int(count)} for item, count in df['item'].value_counts().head(10).items()],
                    'least_selling': [{'item': item, 'count': int(count)} for item, count in df['item'].value_counts().tail(10).items()],
                    'product_sales': [],
                },
                'predictive_accuracy': predictive_accuracy,
                'prediction_details': prediction_details if prediction_details else "No valid predictions."
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f"Error processing CSV: {str(e)}",
                'results': {},
                'predictive_accuracy': 0.0,
                'prediction_details': []
            })
    return render(request, 'manager/mba_recommendation.html')


@login_required
def mba_product_sales(request, period):
    try:
        session_key = request.session.session_key or "Not set"
        print(f"In mba_product_sales. Session key: {session_key}")
        df_dict = request.session.get('mba_data')
        if not df_dict:
            print(f"No session data found for mba_product_sales. Session key: {request.session.session_key}")
            return JsonResponse({'error': 'No data available. Please upload a CSV file first.'}, status=400)

        df = pd.DataFrame.from_dict(df_dict)
        print(f"Loaded DataFrame with columns: {df.columns.tolist()}")
        if 'Date' not in df.columns:
            print("No Date column in DataFrame, using overall counts")
            product_sales = df['item'].value_counts().reset_index()
            product_sales.columns = ['item', 'count']
            product_sales = product_sales.to_dict('records')
            return JsonResponse({'product_sales': product_sales})

        # Convert string back to datetime for processing
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
        print(f"Date column after parsing: {df['Date'].head().tolist()}")
        today = datetime.now()
        print(f"Current date for filtering: {today}")

        if period == 'weekly':
            print("Processing weekly product sales")
            start_date = today - timedelta(weeks=4)
            print(f"Weekly start date: {start_date}")
            df_period = df[df['Date'] >= start_date]
            if df_period.empty:
                print(f"No data for the last 4 weeks. Date range in data: {df['Date'].min()} to {df['Date'].max()}")
                return JsonResponse({'error': 'No data available for the last 4 weeks.'}, status=400)
            df_period['week'] = df_period['Date'].dt.isocalendar().week
            df_period['year'] = df_period['Date'].dt.year
            product_sales = df_period.groupby(['year', 'week', 'item']).size().reset_index(name='count')
        elif period == 'monthly':
            print("Processing monthly product sales")
            df_period = df
            df_period['month'] = df_period['Date'].dt.month
            df_period['year'] = df_period['Date'].dt.year
            product_sales = df_period.groupby(['month', 'year', 'item']).size().reset_index(name='count')
        elif period == 'yearly':
            print("Processing yearly product sales")
            df_period = df
            df_period['year'] = df_period['Date'].dt.year
            product_sales = df_period.groupby(['year', 'item']).size().reset_index(name='count')
        else:
            print(f"Invalid period: {period}")
            return JsonResponse({'error': f'Invalid period: {period}'}, status=400)

        product_sales = product_sales.groupby('item')['count'].sum().reset_index()
        product_sales = product_sales.sort_values(by='count', ascending=False).to_dict('records')
        print(f"Product sales for {period}: {product_sales}")
        return JsonResponse({'product_sales': product_sales})

    except Exception as e:
        print(f"Error in mba_product_sales: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)
    
def generateInvoiceNumber():
    # Use only date (YYYYMMDD) and a 3-digit sequential number for the day
    today = datetime.datetime.now().strftime('%Y%m%d')
    # Get the count of transactions for today to use as a sequence
    transaction_count_today = Transaction.objects.filter(
        invoice_no__startswith=f"INV-{today}"
    ).count()
    sequence = f"{transaction_count_today + 1:03d}"  # 3-digit sequence (001, 002, etc.)
    return f"INV-{today}-{sequence}"

def generate_invoice_pdf(invoice_no, order_details, subtotal, tax, total, cashier_id):
    print(f"Generating invoice for {invoice_no} with details: {order_details}, cashier: {cashier_id}")  # Debug
    buffer = io.BytesIO()
    try:
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []

        styles = getSampleStyleSheet()

        # Bakery-specific title and branding
        elements.append(Paragraph("EverYes POS - Invoice", styles['Title']))
        elements.append(Paragraph(f"Invoice No: {invoice_no}", styles['Normal']))
        elements.append(Paragraph(f"Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        elements.append(Paragraph(f"Cashier: {cashier_id}", styles['Normal']))

        # Table data matching the image style
        data = [
            ["Item Details", "Qty", "Unit Price", "Total"]  # Header row
        ]
        for item in order_details:
            print(f"Processing item: {item}")  # Debug each item
            data.append([
                item['name'],  # Item name (e.g., Cookies, Muffins)
                str(item['quantity']),  # Quantity
                f"${item['price']:.2f}",  # Unit price
                f"${item['subtotal']:.2f}"  # Total for this item
            ])
        
        table = Table(data)
        table.setStyle(TableStyle([
            # Header style (dark blue background, white text, centered)
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2C3E50')),  # Use HexColor for hexadecimal color
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),

            # Data rows (light background, black text, left-aligned for items, centered for numbers)
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),  # Light background for data rows
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),  # Left-align item details
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),  # Center-align Qty, Unit Price, Total
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 12),

            # Grid lines (black borders)
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(table)

        # Totals section
        elements.append(Paragraph(f"Subtotal: ${subtotal:.2f}", styles['Normal']))
        elements.append(Paragraph(f"Tax (10%): ${tax:.2f}", styles['Normal']))
        elements.append(Paragraph(f"Total: ${total:.2f}", styles['Heading2']))

        doc.build(elements)
        buffer.seek(0)
        return buffer
    except Exception as e:
        print(f"Error generating PDF: {str(e)}")  # Debug PDF errors
        raise


@login_required
@csrf_exempt
def save_transaction(request):
    if request.method == "POST":
        try:
            print("Received POST data:", request.body.decode('utf-8'))
            data = json.loads(request.body)
            transactions = data.get("transactions", [])
            if not transactions:
                raise ValueError("No transactions provided")

            # Generate a unique invoice number
            invoice_no = generateInvoiceNumber()
            while Transaction.objects.filter(invoice_no=invoice_no).exists():
                invoice_no = f"{invoice_no}-{uuid.uuid4().hex[:8]}"
            
            # Get the current cashier (authenticated user)
            if not request.user.is_authenticated:
                return JsonResponse({"success": False, "message": "User not authenticated"}, status=401)
            cashier = request.user
            try:
                cashier_profile = EmployeeProfile.objects.get(user=cashier)
                cashier_id = cashier_profile.user.username
            except EmployeeProfile.DoesNotExist:
                cashier_id = "Unknown Cashier"

            order_details = []
            subtotal = 0

            for transaction in transactions:
                item = transaction.get("item", "").strip()
                quantity = transaction.get("quantity", 1)
                price = transaction.get("price", 0.0)

                if not item or not isinstance(item, str):
                    raise ValueError(f"Invalid item name: {item}")
                if not isinstance(quantity, (int, float)) or quantity < 1:
                    raise ValueError(f"Invalid quantity for item {item}: {quantity}")
                if not isinstance(price, (int, float)) or price < 0:
                    raise ValueError(f"Invalid price for item {item}: {price}")

                quantity = int(quantity)
                price = float(price)
                item_subtotal = price * quantity
                subtotal += item_subtotal

                Transaction.objects.create(
                    invoice_no=invoice_no,
                    item=item,
                    quantity=quantity,
                    price=price
                )

                order_details.append({
                    "name": item,
                    "quantity": quantity,
                    "price": price,
                    "subtotal": item_subtotal
                })

            tax = subtotal * 0.1
            total = subtotal + tax

            print(f"Generating invoice for {invoice_no} with details: {order_details}")
            pdf_buffer = generate_invoice_pdf(invoice_no, order_details, subtotal, tax, total, cashier_id)
            
            media_path = os.path.join(settings.MEDIA_ROOT, "invoices", f"invoice_{invoice_no}.pdf")
            os.makedirs(os.path.dirname(media_path), exist_ok=True)
            with open(media_path, "wb") as f:
                f.write(pdf_buffer.getvalue())
            pdf_url = f"/media/invoices/invoice_{invoice_no}.pdf"

            return JsonResponse({
                "success": True,
                "message": "Transactions and invoice saved successfully",
                "invoice_url": pdf_url
            })
        except IntegrityError as e:
            print(f"Database error: {str(e)}")
            return JsonResponse({"success": False, "message": f"Database error: {str(e)}"}, status=500)
        except ValueError as e:
            print(f"Validation error: {str(e)}")
            return JsonResponse({"success": False, "message": str(e)}, status=400)
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return JsonResponse({"success": False, "message": f"Unexpected error: {str(e)}"}, status=500)
    
    return JsonResponse({"success": False, "message": "Invalid request method"}, status=400)

def transaction_history(request):
    transactions = Transaction.objects.all().order_by('-timestamp')
    return render(request, 'manager/transaction_history.html', {'transactions': transactions})

def download_transactions_csv(request):
    # Create the HttpResponse object with CSV header
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="transaction_history.csv"'

    # Create a CSV writer object
    writer = csv.writer(response)
    
    # Write the header row (matching your table columns)
    writer.writerow(['Invoice No', 'Item', 'Quantity', 'Timestamp'])

    # Fetch the transactions from the database
    transactions = Transaction.objects.all()  # Adjust queryset as needed

    # Write data rows
    for transaction in transactions:
        writer.writerow([
            transaction.invoice_no,
            transaction.item,
            transaction.quantity,
            transaction.timestamp
        ])

    return response

