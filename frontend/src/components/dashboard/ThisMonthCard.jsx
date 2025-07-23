/**
 * ThisMonthCard.jsx - Display this month's receipts and amount
 * 
 * Shows monthly statistics including receipt count and total amount
 * with responsive design and loading states.
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  Skeleton
} from '@mui/material';
import {
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

const ThisMonthCard = ({ 
  monthlyReceipts = 0, 
  monthlyTotal = 0, 
  loading = false,
  currency = 'GBP'
}) => {
  const theme = useTheme();

  const formatCurrency = (amount, curr = currency) => {
    try {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: curr,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      return `${curr} ${amount.toFixed(2)}`;
    }
  };

  const getCurrentMonth = () => {
    return new Date().toLocaleDateString('en-GB', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <Card 
        sx={{ 
          height: '100%',
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
            : 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)',
          color: 'white'
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" mb={1}>
            <Box 
              sx={{
                p: 1,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                mr: 2
              }}
            >
              <CalendarIcon />
            </Box>
            <Skeleton variant="text" width={100} height={24} sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
          </Box>
          <Skeleton variant="text" width={80} height={32} sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: '100%',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
          : 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)',
        color: 'white',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8]
        }
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          <Box 
            sx={{
              p: 1,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              mr: 2
            }}
          >
            <CalendarIcon />
          </Box>
          <Typography variant="h6" component="h3" fontWeight="600">
            This Month
          </Typography>
        </Box>
        
        <Typography 
          variant="h4" 
          component="p" 
          fontWeight="700"
          sx={{ mb: 1 }}
        >
          {monthlyReceipts}
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 500,
            mb: 0.5
          }}
        >
          {formatCurrency(monthlyTotal)}
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ 
            opacity: 0.9,
            fontSize: '0.875rem'
          }}
        >
          {getCurrentMonth()}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ThisMonthCard;
