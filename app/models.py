from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('cashier', 'Cashier'),
    )
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    )

    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='cashier')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')

    # Fix group and permission conflicts
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_groups',
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_permissions',
        blank=True
    )

    def __str__(self):
        return f"{self.username} ({self.role})"

class Category(models.Model):

    name = models.CharField(max_length=64)

    def __str__ (self):
        return self.name
    
class Product(models.Model):

    product_code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    stock_quantity = models.PositiveIntegerField()
    productImage = models.ImageField(upload_to='products',blank=True, null=True)

    def __str__(self):
        return self.name
    
# Sales Model
class Sale(models.Model):
    sale_id = models.AutoField(primary_key=True)
    invoice_no = models.CharField(max_length=20, unique=True)
    cashier_id = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'cashier'})
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    
# Sale Details Model
class SaleDetail(models.Model):
    sale_detail_id = models.AutoField(primary_key=True)
    sale_id = models.ForeignKey(Sale, on_delete=models.CASCADE)
    product_id = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)


    
