from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    #path('', views.index, name='index'),  
    path('', views.login_view, name='login'),
    path('cashier/', views.cashier, name='cashier'),
    path('products/', views.showproduct, name='products'),
    path('logout/', views.logout_view, name='logout'),
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('cashier-dashboard/', views.cashier_dashboard, name='cashier_dashboard'),
    path('add-employee/', views.add_employee, name='add_employee'),
    path('delete-employee/<int:user_id>/', views.delete_employee, name='delete_employee'),  # Ensure this line exists
]
