from django.shortcuts import render
from django.http import HttpResponse
from django.shortcuts import render

def index(request):
    return render(request, 'manager/cashier.html')

def cashier(request):
    return render(request, 'cashier/cashier_side.html')