from django.http import JsonResponse
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
import subprocess
import os
from .market_basket import perform_market_basket_analysis
from django.conf import settings
from app import market_basket

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