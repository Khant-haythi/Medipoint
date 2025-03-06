from django.contrib import admin
from django.urls import path, include
from . import views
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns


urlpatterns = [
    path('admin/', admin.site.urls),
    #path('', views.index, name='index'),  
    path('', views.login_view, name='login'),
    path('cashier/', views.cashier, name='cashier'),
    path('products/', views.showproduct, name='products'),
    path('history/', views.showhistory, name='history'),
    path('logout/', views.logout_view, name='logout'),
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('cashier-dashboard/', views.cashier_dashboard, name='cashier_dashboard'),
    path('add-employee/', views.add_employee, name='add_employee'),
    path('delete-employee/<int:user_id>/', views.delete_employee, name='delete_employee'), 
    path('recommendations/', views.mba_recommendations, name='mba_recommendations'), 
    path('save-transaction/', views.save_transaction, name='save_transaction'),
    path('transaction-history/', views.transaction_history, name='transaction_history'),
    path('transactions/download/csv/', views.download_transactions_csv, name='download_transactions_csv'),
   path('dashboard/data/<str:period>/', views.dashboard_data, name='dashboard_data'),  # Added for chart data
    path('dashboard/kpis/<str:period>/', views.dashboard_kpis, name='dashboard_kpis'), 
     path('mba_product_sales/<str:period>/', views.mba_product_sales, name='mba_product_sales'),  # New endpoint # Added for KPI data
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns += staticfiles_urlpatterns()