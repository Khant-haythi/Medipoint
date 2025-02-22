from django.contrib import admin
from .models import User, Category, Product, Sale,SaleDetail

admin.site.register(User),
admin.site.register(Category),
admin.site.register(Product),
admin.site.register(Sale),
admin.site.register(SaleDetail),
