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

@login_required
def mba_recommendations(request):
    profile = EmployeeProfile.objects.get(user=request.user)
    if profile.role != 'admin':
        messages.error(request, 'Only admins can access recommendations.')
        return redirect('admin_dashboard')
    
    # Check for AJAX request by looking at the X-Requested-With header
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    # Handle AJAX requests for analysis
    if request.method == 'POST' and is_ajax:
        if 'csv_file' in request.FILES and 'analyze_csv' in request.POST:
            csv_file = request.FILES['csv_file']
            if not csv_file.name.endswith('.csv'):
                return JsonResponse({'error': 'Please upload a valid CSV file.'}, status=400)
            
            # Save the CSV file temporarily
            fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'uploads'))
            filename = fs.save(csv_file.name, csv_file)
            file_path = fs.path(filename)
            print(f"Saved CSV to: {file_path}")
            
            # Perform MBA on CSV data
            result = perform_market_basket_analysis(data_source='csv', csv_path=file_path)
            # Clean up the file after processing
            fs.delete(filename)
            
            if 'error' in result:
                return JsonResponse({'error': result['error']}, status=400)
            return JsonResponse(result)
        
        elif 'analyze_db' in request.POST:
            # Perform MBA on database data
            result = perform_market_basket_analysis(data_source='db')
            if 'error' in result:
                return JsonResponse({'error': result['error']}, status=400)
            return JsonResponse(result)
        
        return JsonResponse({'error': 'Invalid request'}, status=400)
    
    # Render the initial template for non-AJAX requests
    return render(request, 'manager/mba_recommendation.html', {
        'recommendations': None,
        'error': None
    })