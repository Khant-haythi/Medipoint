from django.contrib import admin
from .models import  Category, Product,EmployeeProfile

admin.site.register(EmployeeProfile),
admin.site.register(Category),
admin.site.register(Product),

