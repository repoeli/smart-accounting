/**
 * TotalAmountCard.jsx - Display total financial amount
 * 
 * Shows the total amount extracted from all receipts with proper
 * currency formatting and responsive design.
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
  AttachMoney as MoneyIcon
} from '@mui/icons-material';

const TotalAmountCard = ({ 
  totalAmount = 0, 
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

  if (loading) {
    return (
      <Card 
        sx={{ 
          height: '100%',
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
            : 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
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
              <MoneyIcon />
            </Box>
            <Skeleton variant="text" width={120} height={24} sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
          </Box>
          <Skeleton variant="text" width={100} height={32} sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: '100%',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
          : 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
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
            <MoneyIcon />
          </Box>
          <Typography variant="h6" component="h3" fontWeight="600">
            Total Amount
          </Typography>
        </Box>
        
        <Typography 
          variant="h4" 
          component="p" 
          fontWeight="700"
          sx={{ 
            mb: 1,
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
          }}
        >
          {formatCurrency(totalAmount)}
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ 
            opacity: 0.9,
            fontSize: '0.875rem'
          }}
        >
          Across all receipts
        </Typography>
      </CardContent>
    </Card>
  );
};

export default TotalAmountCard;
