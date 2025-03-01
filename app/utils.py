from .models import Transaction

# Get all items in a specific invoice
def get_items_in_invoice(invoice_no):
    return Transaction.objects.filter(invoice_no=invoice_no).values('item', 'quantity')

# Example: Get all unique items across all invoices for MBA
def get_all_transactions_for_mba():
    return Transaction.objects.values('invoice_no', 'item').distinct()