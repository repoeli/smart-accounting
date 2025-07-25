import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Box, 
  IconButton, 
  Tooltip,
  Typography,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Refresh, 
  OpenInFull, 
  Lock,
  TrendingUp,
  TrendingDown,
  Remove
} from '@mui/icons-material';
import ExportButtons from './ExportButtons';
import useReportAccess from '../../hooks/reports/useReportAccess';

const ReportCard = ({ 
  title,
  subtitle,
  icon,
  children,
  reportData,
  reportType,
  reportRef,
  loading = false,
  error = null,
  onRefresh,
  onViewFull,
  showExport = true,
  showRefresh = true,
  showFullView = true,
  accessLevel = 'basic', // DEPRECATED: Use getRequiredPlan from useReportAccess hook instead
  trend = null, // { value: number, direction: 'up'|'down'|'neutral', period: string }
  height = 'auto',
  className = ''
}) => {
  const { canViewReport, getUpgradeMessage, getRequiredPlan } = useReportAccess();
  const hasAccess = canViewReport(reportType);
  // Get the actual required access level for this report type, not the user's current level
  const requiredAccessLevel = getRequiredPlan(reportType);

  // Render trend indicator (memoized to prevent unnecessary re-creations)
  const renderTrend = useCallback(() => {
    if (!trend) return null;

    const { value, direction, period } = trend;
    const isPositive = direction === 'up';
    const isNegative = direction === 'down';
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {isPositive && <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />}
        {isNegative && <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />}
        {direction === 'neutral' && <Remove sx={{ fontSize: 16, color: 'text.secondary' }} />}
        <Typography 
          variant="caption" 
          color={isPositive ? 'success.main' : isNegative ? 'error.main' : 'text.secondary'}
          sx={{ fontWeight: 'medium' }}
        >
          {Math.abs(value)}% {period}
        </Typography>
      </Box>
    );
  }, [trend]);

  // Render upgrade prompt if no access
  if (!hasAccess) {
    return (
      <Card className={className} sx={{ height }}>
        <CardHeader
          avatar={icon}
          title={title}
          subheader={subtitle}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={requiredAccessLevel.toUpperCase()} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
              <Tooltip title="Feature locked">
                <Lock color="action" />
              </Tooltip>
            </Box>
          }
        />
        <CardContent>
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: 200,
              textAlign: 'center',
              gap: 2
            }}
          >
            <Lock sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography variant="h6" color="text.secondary">
              Premium Feature
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getUpgradeMessage(reportType)}
            </Typography>
            <Chip 
              label={`Upgrade to ${requiredAccessLevel.charAt(0).toUpperCase() + requiredAccessLevel.slice(1)}`} 
              color="primary" 
              clickable
              sx={{ mt: 1 }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  }



  return (
    <Card className={className} sx={{ height, display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        avatar={icon}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {title}
            {renderTrend()}
          </Box>
        }
        subheader={subtitle}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {showExport && !loading && !error && (
              <ExportButtons
                reportData={reportData}
                reportType={reportType}
                reportRef={reportRef}
                title={title}
                disabled={loading}
              />
            )}
            {showRefresh && (
              <Tooltip title="Refresh data">
                <IconButton onClick={onRefresh} disabled={loading} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
            )}
            {showFullView && (
              <Tooltip title="View full report">
                <IconButton onClick={onViewFull} disabled={loading} size="small">
                  <OpenInFull />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        }
      />
      
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: 200,
              flex: 1
            }}
          >
            <CircularProgress />
          </Box>
        )}
        
        {error && !loading && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {!loading && !error && (
          <Box ref={reportRef} sx={{ flex: 1 }}>
            {children}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

ReportCard.propTypes = {
  // Required props
  title: PropTypes.string.isRequired,
  reportType: PropTypes.string.isRequired,
  
  // Optional content props
  subtitle: PropTypes.string,
  icon: PropTypes.node,
  children: PropTypes.node,
  reportData: PropTypes.object,
  reportRef: PropTypes.object,
  
  // Event handlers
  onRefresh: PropTypes.func,
  onViewFull: PropTypes.func,
  
  // State props
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.instanceOf(Error)
  ]),
  
  // Display options
  showExport: PropTypes.bool,
  showRefresh: PropTypes.bool,
  showFullView: PropTypes.bool,
  
  // Styling props
  height: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  className: PropTypes.string,
  
  // Deprecated prop (kept for backward compatibility)
  accessLevel: PropTypes.oneOf(['basic', 'premium', 'platinum']),
  
  // Trend data structure
  trend: PropTypes.shape({
    value: PropTypes.number.isRequired,
    direction: PropTypes.oneOf(['up', 'down', 'neutral']).isRequired,
    period: PropTypes.string.isRequired
  })
};

export default ReportCard;
