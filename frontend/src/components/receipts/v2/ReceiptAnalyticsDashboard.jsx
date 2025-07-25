/**
 * ReceiptAnalyticsDashboard - Analytics Component
 * Basic analytics dashboard for receipts
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box
} from '@mui/material';
import { 
  Analytics as AnalyticsIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

const ReceiptAnalyticsDashboard = ({ receipts = [] }) => {
  const totalReceipts = receipts.length;
  const completedReceipts = receipts.filter(r => r.ocr_status === 'completed').length;
  const totalAmount = receipts.reduce((sum, r) => sum + (parseFloat(r.extracted_data?.total) || 0), 0);
  
  const stats = [
    {
      title: 'Total Receipts',
      value: totalReceipts,
      icon: <ReceiptIcon />,
      color: 'primary'
    },
    {
      title: 'Processed',
      value: completedReceipts,
      icon: <TrendingUpIcon />,
      color: 'success'
    },
    {
      title: 'Total Amount',
      value: `£${totalAmount.toFixed(2)}`,
      icon: <AnalyticsIcon />,
      color: 'info'
    }
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Receipt Analytics
        </Typography>
        
        <Grid container spacing={2}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={4} key={index}>
              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'grey.200',
                  borderRadius: 1,
                  textAlign: 'center'
                }}
              >
                <Box sx={{ color: `${stat.color}.main`, mb: 1 }}>
                  {stat.icon}
                </Box>
                <Typography variant="h4" gutterBottom>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        
        {totalReceipts > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Success Rate: {totalReceipts > 0 ? Math.round((completedReceipts / totalReceipts) * 100) : 0}%
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceiptAnalyticsDashboard;