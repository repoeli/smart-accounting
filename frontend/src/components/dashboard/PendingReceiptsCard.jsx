/**
 * PendingReceiptsCard.jsx - Display pending receipts count
 * 
 * Shows the number of receipts awaiting processing with status
 * indicators and responsive design.
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  Skeleton,
  Chip
} from '@mui/material';
import {
  HourglassEmpty as PendingIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const PendingReceiptsCard = ({ 
  pendingReceipts = 0, 
  loading = false 
}) => {
  const theme = useTheme();

  const getStatusColor = () => {
    if (pendingReceipts === 0) return 'success';
    if (pendingReceipts <= 5) return 'warning';
    return 'error';
  };

  const getStatusText = () => {
    if (pendingReceipts === 0) return 'All up to date';
    if (pendingReceipts <= 5) return 'Processing';
    return 'High queue';
  };

  if (loading) {
    return (
      <Card 
        sx={{ 
          height: '100%',
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
            : 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
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
              <PendingIcon />
            </Box>
            <Skeleton variant="text" width={100} height={24} sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
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
          ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
          : 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
        color: 'white',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8]
        }
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justify="space-between" mb={1}>
          <Box display="flex" alignItems="center">
            <Box 
              sx={{
                p: 1,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                mr: 2
              }}
            >
              {pendingReceipts > 5 ? <WarningIcon /> : <PendingIcon />}
            </Box>
            <Typography variant="h6" component="h3" fontWeight="600">
              Pending
            </Typography>
          </Box>
        </Box>
        
        <Typography 
          variant="h4" 
          component="p" 
          fontWeight="700"
          sx={{ mb: 1 }}
        >
          {pendingReceipts}
        </Typography>
        
        <Chip
          label={getStatusText()}
          size="small"
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 500
          }}
        />
      </CardContent>
    </Card>
  );
};

export default PendingReceiptsCard;
