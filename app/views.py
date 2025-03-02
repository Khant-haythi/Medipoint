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
import os,json,datetime,io,uuid
from django.db import IntegrityError
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.colors import HexColor
from .market_basket import perform_market_basket_analysis
from django.conf import settings
from app import market_basket
from django.views.decorators.csrf import csrf_exempt

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

# Admin dashboard
@login_required
def admin_dashboard(request):
    profile = EmployeeProfile.objects.get(user=request.user)
    if profile.role != 'admin':
        return redirect('cashier_dashboard')
    
    return render(request, 'manager/index.html')

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

def mba_recommendations(request):
    if request.method == "POST" and request.headers.get("X-Requested-With") == "XMLHttpRequest":
        csv_file = request.FILES.get("csv_file")
        if not csv_file:
            return JsonResponse({"success": False, "message": "No file uploaded"}, status=400)

        # Save the uploaded file temporarily
        temp_csv_path = os.path.join("temp", "uploaded_csv.csv")
        os.makedirs("temp", exist_ok=True)  # Create temp directory if it doesn't exist
        with open(temp_csv_path, "wb") as f:
            for chunk in csv_file.chunks():
                f.write(chunk)

        try:
            # Call perform_market_basket_analysis with CSV path
            results = market_basket.perform_market_basket_analysis(data_source="csv", csv_path=temp_csv_path)

            if "error" in results:
                return JsonResponse({"success": False, "message": results["error"]}, status=500)

            # Format results for JSON response compatible with your JS
            return JsonResponse({
                "success": True,
                "message": "Analysis completed",
                "results": {
                    "recommendations": results["mba_recommendations"],
                    "top_selling": results["top_selling"],
                    "least_selling": results["least_selling"]
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "message": f"Error processing CSV: {str(e)}"}, status=500)
        finally:
            # Clean up temporary file
            if os.path.exists(temp_csv_path):
                os.remove(temp_csv_path)

    return render(request, "manager/mba_recommendation.html")

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

def transaction_history_cashier(request):
    transactions = Transaction.objects.all().order_by('-timestamp')
    return render(request, 'cashier/cashier_transaction.html', {'transactions': transactions})