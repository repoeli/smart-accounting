from django.urls import path
from . import views

urlpatterns = [
    path('expense-summary/', views.ExpenseSummaryView.as_view(), name='expense-summary'),
    path('profit-loss/', views.ProfitLossView.as_view(), name='profit-loss'),
]