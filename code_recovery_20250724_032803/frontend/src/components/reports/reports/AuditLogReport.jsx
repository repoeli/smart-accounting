import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  Pagination,
  FormControlLabel,
  Switch
} from '@mui/material';
import { Search, Download, Visibility, Error, CheckCircle, Schedule } from '@mui/icons-material';
import ExportButtons from '../ExportButtons';
import ReportFilters from '../ReportFilters';
import { reportsAPI } from '../../../services/reports/reportsAPI';

const AuditLogReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    status: '',
    include_metadata: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, [filters, page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsAPI.getAuditLog({
        ...filters,
        page,
        page_size: 25
      });
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to load audit log data');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const toggleRowExpansion = (index) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'failed':
        return <Error sx={{ color: '#f44336' }} />;
      case 'processing':
        return <Schedule sx={{ color: '#ff9800' }} />;
      default:
        return <Schedule sx={{ color: '#9e9e9e' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  const prepareSummaryData = () => {
    if (!data) return [];

    const statusCounts = data.audit_logs?.reduce((acc, log) => {
      const status = log.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {}) || {};

    return [
      {
        label: 'Total Events',
        value: data.total_count?.toString() || '0',
        color: '#2196f3',
        icon: <Visibility />
      },
      {
        label: 'Completed',
        value: (statusCounts.completed || 0).toString(),
        color: '#4caf50',
        icon: <CheckCircle />
      },
      {
        label: 'Failed',
        value: (statusCounts.failed || 0).toString(),
        color: '#f44336',
        icon: <Error />
      },
      {
        label: 'Processing',
        value: (statusCounts.processing || 0).toString(),
        color: '#ff9800',
        icon: <Schedule />
      }
    ];
  };

  const filteredLogs = data?.audit_logs?.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(searchLower) ||
      log.user_id?.toString().includes(searchLower) ||
      log.resource_type?.toLowerCase().includes(searchLower) ||
      log.resource_id?.toString().includes(searchLower) ||
      log.status?.toLowerCase().includes(searchLower)
    );
  }) || [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const summaryData = prepareSummaryData();

  return (
    <Box>
      {/* Export Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ExportButtons
          data={data}
          filename="audit-log-report"
          chartData={null}
        />
      </Box>

      {/* Filters */}
      <ReportFilters
        onFiltersChange={handleFiltersChange}
        reportType="audit-log"
        initialFilters={filters}
        compact={true}
      />

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {summaryData.map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                  {item.icon}
                </Box>
                <Typography variant="h4" sx={{ color: item.color, mb: 1 }}>
                  {item.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search and Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <TextField
              placeholder="Search audit logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={filters.include_metadata}
                  onChange={(e) => handleFiltersChange({
                    ...filters,
                    include_metadata: e.target.checked
                  })}
                />
              }
              label="Show Metadata"
            />
          </Box>

          {/* Audit Log Table */}
          {filteredLogs.length > 0 ? (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Resource</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>IP Address</TableCell>
                      {filters.include_metadata && <TableCell>Details</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.map((log, index) => (
                      <React.Fragment key={index}>
                        <TableRow 
                          hover 
                          onClick={() => toggleRowExpansion(index)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(log.timestamp).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              User {log.user_id || 'System'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={log.action || 'Unknown'} 
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {log.resource_type || 'N/A'} #{log.resource_id || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getStatusIcon(log.status)}
                              <Chip 
                                label={log.status || 'Unknown'} 
                                size="small"
                                color={getStatusColor(log.status)}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {log.ip_address || 'N/A'}
                            </Typography>
                          </TableCell>
                          {filters.include_metadata && (
                            <TableCell>
                              <Chip
                                icon={<Visibility />}
                                label="View"
                                size="small"
                                clickable
                                variant="outlined"
                              />
                            </TableCell>
                          )}
                        </TableRow>
                        
                        {/* Expanded Row Details */}
                        {expandedRows.has(index) && (
                          <TableRow>
                            <TableCell colSpan={filters.include_metadata ? 7 : 6}>
                              <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Grid container spacing={2}>
                                  <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" gutterBottom>
                                      Request Details
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>Method:</strong> {log.request_method || 'N/A'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>Path:</strong> {log.request_path || 'N/A'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>User Agent:</strong> {log.user_agent || 'N/A'}
                                    </Typography>
                                  </Grid>
                                  
                                  <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" gutterBottom>
                                      Response Details
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>Status Code:</strong> {log.response_status || 'N/A'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>Duration:</strong> {log.duration ? `${log.duration}ms` : 'N/A'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>Changes:</strong> {log.changes_made || 'None'}
                                    </Typography>
                                  </Grid>
                                  
                                  {log.error_message && (
                                    <Grid item xs={12}>
                                      <Alert severity="error" sx={{ mt: 1 }}>
                                        <strong>Error:</strong> {log.error_message}
                                      </Alert>
                                    </Grid>
                                  )}
                                  
                                  {filters.include_metadata && log.metadata && (
                                    <Grid item xs={12}>
                                      <Typography variant="subtitle2" gutterBottom>
                                        Metadata
                                      </Typography>
                                      <Paper sx={{ p: 1, bgcolor: 'grey.100' }}>
                                        <pre style={{ 
                                          fontSize: '0.75rem', 
                                          margin: 0, 
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-word'
                                        }}>
                                          {JSON.stringify(log.metadata, null, 2)}
                                        </pre>
                                      </Paper>
                                    </Grid>
                                  )}
                                </Grid>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {data.total_pages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={data.total_pages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          ) : (
            <Alert severity="info">
              No audit log entries found for the selected criteria.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <Alert severity="info">
        <Typography variant="body2">
          <strong>Audit Log Help:</strong> This report shows all system activities and user actions. 
          Click on any row to view detailed information. Use filters to narrow down specific time periods or statuses.
          Export functionality is available for compliance and reporting purposes.
        </Typography>
      </Alert>
    </Box>
  );
};

export default AuditLogReport;
