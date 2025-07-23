/**
 * ReceiptPerformanceMetrics.jsx - v2 New Schema Component
 * 
 * Component for displaying processing performance metrics from the new flat schema.
 * Shows processing time, costs, token usage, and other performance indicators.
 */

import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Chip,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
  useTheme,
  alpha
} from '@mui/material';
import {
  Speed,
  AttachMoney,
  Token,
  ViewModule,
  ExpandMore,
  ExpandLess,
  TrendingUp,
  Timer,
  Analytics,
  Info
} from '@mui/icons-material';

const ReceiptPerformanceMetrics = ({ 
  receipt, 
  compact = false,
  showComparison = false 
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  
  // Extract performance data from new schema
  const performance = receipt?.performance || {};
  
  const processingTime = performance.processing_time || 0;
  const costUsd = performance.cost_usd || 0;
  const tokenUsage = performance.token_usage || 0;
  const segmentsProcessed = performance.segments_processed || 1;

  // Performance benchmarks (for comparison)
  const benchmarks = {
    processingTime: { excellent: 2, good: 5, poor: 10 },
    costUsd: { excellent: 0.01, good: 0.05, poor: 0.15 },
    tokenUsage: { excellent: 500, good: 1500, poor: 3000 }
  };

  // Get performance rating
  const getPerformanceRating = (value, benchmark) => {
    if (value <= benchmark.excellent) return { level: 'excellent', color: 'success', score: 100 };
    if (value <= benchmark.good) return { level: 'good', color: 'warning', score: 75 };
    if (value <= benchmark.poor) return { level: 'fair', color: 'error', score: 50 };
    return { level: 'poor', color: 'error', score: 25 };
  };

  // Calculate ratings
  const timeRating = getPerformanceRating(processingTime, benchmarks.processingTime);
  const costRating = getPerformanceRating(costUsd, benchmarks.costUsd);
  const tokenRating = getPerformanceRating(tokenUsage, benchmarks.tokenUsage);

  // Overall performance score
  const overallScore = Math.round((timeRating.score + costRating.score + tokenRating.score) / 3);

  // Format functions
  const formatTime = (seconds) => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    return `${seconds.toFixed(1)}s`;
  };

  const formatCost = (cost) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatTokens = (tokens) => {
    if (tokens < 1000) return tokens.toString();
    return `${(tokens / 1000).toFixed(1)}k`;
  };

  // Compact view for small spaces
  if (compact) {
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 1, 
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          borderRadius: 1
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Speed fontSize="small" color="primary" />
            <Typography variant="caption" fontWeight="medium">
              Performance
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={formatTime(processingTime)}
              size="small"
              color={timeRating.color}
              variant="outlined"
            />
            <Chip 
              label={formatCost(costUsd)}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        mb: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Analytics color="primary" />
          <Typography variant="h6" component="h3">
            Performance Metrics
          </Typography>
          <Chip 
            label={`${overallScore}%`}
            size="small"
            color={overallScore >= 80 ? 'success' : overallScore >= 60 ? 'warning' : 'error'}
          />
        </Box>
        
        <IconButton onClick={() => setExpanded(!expanded)} size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {/* Main Metrics Grid */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Processing Time */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ 
            p: 2, 
            bgcolor: alpha(theme.palette.info.main, 0.04), 
            borderRadius: 1,
            textAlign: 'center',
            border: `1px solid ${alpha(theme.palette.info.main, 0.12)}`,
            height: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Timer color="info" sx={{ mb: 1 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
              {formatTime(processingTime)}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1 }}>
              Processing Time
            </Typography>
            <Chip 
              label={timeRating.level}
              size="small"
              color={timeRating.color}
              variant="outlined"
            />
          </Box>
        </Grid>

        {/* API Cost */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ 
            p: 2, 
            bgcolor: alpha(theme.palette.warning.main, 0.04), 
            borderRadius: 1,
            textAlign: 'center',
            border: `1px solid ${alpha(theme.palette.warning.main, 0.12)}`,
            height: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <AttachMoney color="warning" sx={{ mb: 1 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
              {formatCost(costUsd)}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1 }}>
              API Cost
            </Typography>
            <Chip 
              label={costRating.level}
              size="small"
              color={costRating.color}
              variant="outlined"
            />
          </Box>
        </Grid>

        {/* Token Usage */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ 
            p: 2, 
            bgcolor: alpha(theme.palette.success.main, 0.04), 
            borderRadius: 1,
            textAlign: 'center',
            border: `1px solid ${alpha(theme.palette.success.main, 0.12)}`,
            height: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Token color="success" sx={{ mb: 1 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
              {formatTokens(tokenUsage)}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1 }}>
              Tokens Used
            </Typography>
            <Chip 
              label={tokenRating.level}
              size="small"
              color={tokenRating.color}
              variant="outlined"
            />
          </Box>
        </Grid>

        {/* Segments Processed */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ 
            p: 2, 
            bgcolor: alpha(theme.palette.secondary.main, 0.04), 
            borderRadius: 1,
            textAlign: 'center',
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.12)}`,
            height: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <ViewModule color="secondary" sx={{ mb: 1 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
              {segmentsProcessed}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1 }}>
              Segments
            </Typography>
            <Chip 
              label={segmentsProcessed === 1 ? 'single' : 'multi'}
              size="small"
              color="secondary"
              variant="outlined"
            />
          </Box>
        </Grid>
      </Grid>

      {/* Performance Bar */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="textSecondary">
            Overall Performance Score
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {overallScore}%
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={overallScore} 
          color={overallScore >= 80 ? 'success' : overallScore >= 60 ? 'warning' : 'error'}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>

      {/* Expanded Details */}
      <Collapse in={expanded}>
        <Grid container spacing={2}>
          {/* Performance Breakdown */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp /> Performance Breakdown
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, py: 0.5 }}>
                <Typography variant="body2" sx={{ minWidth: '100px' }}>Processing Speed:</Typography>
                <Chip label={timeRating.level} size="small" color={timeRating.color} variant="outlined" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, py: 0.5 }}>
                <Typography variant="body2" sx={{ minWidth: '100px' }}>Cost Efficiency:</Typography>
                <Chip label={costRating.level} size="small" color={costRating.color} variant="outlined" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, py: 0.5 }}>
                <Typography variant="body2" sx={{ minWidth: '100px' }}>Token Efficiency:</Typography>
                <Chip label={tokenRating.level} size="small" color={tokenRating.color} variant="outlined" />
              </Box>
            </Box>
          </Grid>

          {/* Technical Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info /> Technical Details
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Model: GPT-4o Vision
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Resolution: {segmentsProcessed > 1 ? 'Multi-tile' : 'Single-tile'}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                API Version: v1
              </Typography>
              {receipt?.processing_errors && receipt.processing_errors.length > 0 && (
                <Typography variant="body2" color="error" gutterBottom>
                  Error: {receipt.processing_errors.join(', ')}
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Benchmarks Comparison */}
          {showComparison && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Performance Benchmarks
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Excellent: ≤{benchmarks.processingTime.excellent}s, ≤${benchmarks.costUsd.excellent}, ≤{benchmarks.tokenUsage.excellent} tokens
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Good: ≤{benchmarks.processingTime.good}s, ≤${benchmarks.costUsd.good}, ≤{benchmarks.tokenUsage.good} tokens
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Fair: ≤{benchmarks.processingTime.poor}s, ≤${benchmarks.costUsd.poor}, ≤{benchmarks.tokenUsage.poor} tokens
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          )}
        </Grid>
      </Collapse>
    </Paper>
  );
};

export default ReceiptPerformanceMetrics;
