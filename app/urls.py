from django.contrib import admin
from django.urls import path, include
from . import views
from django.conf import settings
from django.conf.urls.static import static

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
    path('delete-employee/<int:user_id>/', views.delete_employee, name='delete_employee'), 
    path('recommendations/', views.mba_recommendations, name='mba_recommendations'), 
    path('save-transaction/', views.save_transaction, name='save_transaction'),
    path('transaction-history/', views.transaction_history, name='transaction_history'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)