from django.contrib import admin
from .models import  Category, Product,EmployeeProfile,Transaction

from django.contrib import admin
from .models import EmployeeProfile, Category, Product, Transaction

# Customize the admin interface for each model

@admin.register(EmployeeProfile)
class EmployeeProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'role')  # Show id, user, and role in the list view
    search_fields = ('user__username', 'role')  # Allow searching by username or role
    list_filter = ('role',)  # Add filters for role

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')  # Show id and name in the list view
    search_fields = ('name',)  # Allow searching by name

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'price', 'category')  
    search_fields = ('name', 'category__name', 'description')  # Allow searching by name, category, or description
    list_filter = ('category',)  # Add filters for category
    readonly_fields = ('productImage',)  # Make productImage read-only in admin (optional)

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'invoice_no', 'item', 'quantity', 'price', 'timestamp')  # Show all fields
    search_fields = ('invoice_no', 'item')  # Allow searching by invoice_no or item
    list_filter = ('timestamp',)  # Add filters for timestamp
    list_per_page = 25  # Limit the number of items per page (optional)

# If you want to see related objects (e.g., user details in EmployeeProfile), you can use double underscores
# For example, 'user__username' in EmployeeProfileAdmin to show the user's username.