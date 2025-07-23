/**
 * TotalReceiptsCard.jsx - Display total receipts processed
 * 
 * Shows the total number of receipts in the system with loading state
 * and responsive design for dashboard metrics.
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
  Receipt as ReceiptIcon
} from '@mui/icons-material';

const TotalReceiptsCard = ({ 
  receiptsCount = 0, 
  loading = false,
  successRate = 0 
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Card 
        sx={{ 
          height: '100%',
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
            : 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
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
              <ReceiptIcon />
            </Box>
            <Skeleton variant="text" width={120} height={24} sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
          </Box>
          <Skeleton variant="text" width={60} height={32} sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: '100%',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
          : 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
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
            <ReceiptIcon />
          </Box>
          <Typography variant="h6" component="h3" fontWeight="600">
            Total Receipts
          </Typography>
        </Box>
        
        <Typography 
          variant="h4" 
          component="p" 
          fontWeight="700"
          sx={{ mb: 1 }}
        >
          {receiptsCount.toLocaleString()}
        </Typography>
        
        {successRate > 0 && (
          <Typography 
            variant="body2" 
            sx={{ 
              opacity: 0.9,
              fontSize: '0.875rem'
            }}
          >
            {successRate}% success rate
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default TotalReceiptsCard;
