from django.db import models
from django.contrib.auth.models import User



class EmployeeProfile(models.Model):
    USER_ROLES = (
        ('admin', 'Admin'),
        ('cashier', 'Cashier'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=USER_ROLES, default='cashier')

    def __str__(self):
        return f"{self.user.username} - {self.role}"

class Category(models.Model):

    name = models.CharField(max_length=64)

    def __str__ (self):
        return self.name
    def serialize(self):
        return {
            'id': self.id,
            'name': self.name,
        }
    
class Product(models.Model):

    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    productImage = models.ImageField(upload_to='products',blank=True, null=True)

    def serialize(self, current_user=None):
        return {

 
        'name': self.name,
        'price': float(self.price),  # Convert Decimal to float for JSON
        'description': self.description,
        'category': self.category.name if self.category else None,  # Assuming Category has a name field
        'productImage': self.productImage.url if self.productImage else None,
    }
    
class Transaction(models.Model):
    invoice_no = models.CharField(max_length=50, unique=True)  # Unique invoice ID
    item = models.CharField(max_length=100)  # Single item per row
    quantity = models.PositiveIntegerField(default=1)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.invoice_no} - {self.item}"