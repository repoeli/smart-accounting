/**
 * ReceiptPerformanceMetrics - Performance Information Component
 * Displays processing performance and confidence metrics
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Grid,
  Divider
} from '@mui/material';
import { 
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

const ReceiptPerformanceMetrics = ({ receipt, compact = false }) => {
  if (!receipt) {
    return (
      <Card>
        <CardContent>
          <Typography>No performance data available</Typography>
        </CardContent>
      </Card>
    );
  }

  const confidence = receipt.ocr_confidence || 0;
  const processingTime = receipt.processing_metadata?.processing_time || 0;
  const cost = receipt.processing_metadata?.cost_usd || 0;
  const tokenUsage = receipt.processing_metadata?.token_usage || 0;

  const getConfidenceColor = (conf) => {
    if (conf >= 90) return 'success';
    if (conf >= 70) return 'warning';
    return 'error';
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <AssessmentIcon color="primary" />
          <Typography variant="h6">
            Performance Metrics
          </Typography>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Confidence Score
              </Typography>
              <Chip
                label={`${confidence}%`}
                color={getConfidenceColor(confidence)}
                size="small"
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={confidence}
              color={getConfidenceColor(confidence)}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>
          
          <Grid item xs={6}>
            <Box display="flex" alignItems="center" gap={1}>
              <SpeedIcon fontSize="small" color="action" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Processing Time
                </Typography>
                <Typography variant="body1">
                  {processingTime.toFixed(2)}s
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={6}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                API Cost
              </Typography>
              <Typography variant="body1">
                ${cost.toFixed(4)}
              </Typography>
            </Box>
          </Grid>
          
          {tokenUsage > 0 && (
            <Grid item xs={12}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Tokens Used
                </Typography>
                <Typography variant="body1">
                  {tokenUsage.toLocaleString()}
                </Typography>
              </Box>
            </Grid>
          )}
          
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Box display="flex" alignItems="center" gap={1}>
              <CheckIcon 
                fontSize="small" 
                color={receipt.ocr_status === 'completed' ? 'success' : 'action'} 
              />
              <Typography variant="body2">
                Status: {receipt.ocr_status || 'Unknown'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ReceiptPerformanceMetrics;