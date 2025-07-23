/**
 * RecentExpensesCard.jsx - Display recent expense receipts
 * 
 * Shows a list of recent expense receipts with vendor names and amounts
 * in a clean, responsive card format.
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  useTheme,
  Skeleton,
  Chip,
  Divider
} from '@mui/material';
import {
  TrendingDown as ExpenseIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';

const RecentExpensesCard = ({ 
  expenseReceipts = [], 
  loading = false 
}) => {
  const theme = useTheme();

  const formatCurrency = (amount, currency = 'GBP') => {
    try {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
      });
    } catch (error) {
      return 'Recent';
    }
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <ExpenseIcon sx={{ mr: 1, color: 'error.main' }} />
            <Typography variant="h6" component="h3">
              Recent Expenses
            </Typography>
          </Box>
          <List sx={{ py: 0 }}>
            {[1, 2, 3].map((index) => (
              <ListItem key={index} sx={{ px: 0, py: 1 }}>
                <Box sx={{ width: '100%' }}>
                  <Skeleton variant="text" width="70%" height={20} />
                  <Skeleton variant="text" width="40%" height={16} />
                </Box>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        }
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justify="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <ExpenseIcon sx={{ mr: 1, color: 'error.main' }} />
            <Typography variant="h6" component="h3" fontWeight="600">
              Recent Expenses
            </Typography>
          </Box>
          <Chip 
            label={expenseReceipts.length}
            size="small"
            color="error"
            variant="outlined"
          />
        </Box>

        {expenseReceipts.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              py: 3,
              color: 'text.secondary'
            }}
          >
            <ReceiptIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
            <Typography variant="body2" align="center">
              No expense receipts found
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {expenseReceipts.map((receipt, index) => (
              <React.Fragment key={receipt.id}>
                <ListItem 
                  sx={{ 
                    px: 0, 
                    py: 1,
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                      borderRadius: 1
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight="500" noWrap>
                          {receipt.vendor}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="error.main"
                          fontWeight="600"
                        >
                          -{formatCurrency(receipt.amount, receipt.currency)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(receipt.date)}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < expenseReceipts.length - 1 && (
                  <Divider variant="inset" component="li" />
                )}
              </React.Fragment>
            ))}
          </List>
        )}

        {expenseReceipts.length > 0 && (
          <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              Showing last {expenseReceipts.length} expense receipts
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentExpensesCard;
