from django.contrib import admin
from .models import  Category, Product,EmployeeProfile,Transaction

admin.site.register(EmployeeProfile),
admin.site.register(Category),
admin.site.register(Product),
admin.site.register(Transaction),

