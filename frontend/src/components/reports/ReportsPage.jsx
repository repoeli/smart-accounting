import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  CircularProgress,
  Fade
} from '@mui/material';
import { 
  Assessment, 
  PieChart, 
  Receipt, 
  Business, 
  History,
  TrendingUp,
  Analytics,
  PsychologyAlt
} from '@mui/icons-material';
import useReportAccess from '../../hooks/reports/useReportAccess';
import SummaryWidget from './SummaryWidget';
import ReportCard from './ReportCard';
import TestExportComponent from '../test/TestExportComponent';
import IncomeVsExpenseReport from './reports/IncomeVsExpenseReport';
import CategoryBreakdownReport from './reports/CategoryBreakdownReport';
import TaxDeductibleReport from './reports/TaxDeductibleReport';
import VendorAnalysisReport from './reports/VendorAnalysisReport';
import AuditLogReport from './reports/AuditLogReport';
import SmartInsightsDashboard from './analytics/SmartInsightsDashboard';
import PredictiveAnalytics from './analytics/PredictiveAnalytics';

const ReportsPage = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const { canAccessReport, userPlan, canViewReports, loading } = useReportAccess();

  const handleReportSelect = (reportType) => {
    setSelectedReport(reportType);
  };

  const handleBackToOverview = () => {
    setSelectedReport(null);
  };

  const reportConfigs = [
    {
      id: 'smart-insights',
      title: 'Smart Insights Dashboard',
      description: 'AI-powered comprehensive financial analytics and business intelligence',
      icon: <Analytics />,
      tier: 'Premium',
      color: '#673ab7',
      component: SmartInsightsDashboard
    },
    {
      id: 'predictive-analytics',
      title: 'Predictive Analytics',
      description: 'Cash flow forecasting and spending predictions with AI confidence intervals',
      icon: <PsychologyAlt />,
      tier: 'Premium',
      color: '#3f51b5',
      component: PredictiveAnalytics
    },
    {
      id: 'income-expense',
      title: 'Income vs Expense',
      description: 'Compare your income and expenses over time with detailed trends',
      icon: <TrendingUp />,
      tier: 'Basic',
      color: '#4caf50',
      component: IncomeVsExpenseReport
    },
    {
      id: 'category-breakdown',
      title: 'Category Breakdown',
      description: 'Analyze spending patterns across different categories',
      icon: <PieChart />,
      tier: 'Basic',
      color: '#2196f3',
      component: CategoryBreakdownReport
    },
    {
      id: 'tax-deductible',
      title: 'Tax Deductible Items',
      description: 'Review business expenses eligible for tax deductions',
      icon: <Receipt />,
      tier: 'Premium',
      color: '#ff9800',
      component: TaxDeductibleReport
    },
    {
      id: 'vendor-analysis',
      title: 'Vendor Analysis',
      description: 'Detailed analysis of spending by vendor and frequency',
      icon: <Business />,
      tier: 'Premium',
      color: '#9c27b0',
      component: VendorAnalysisReport
    },
    {
      id: 'audit-log',
      title: 'Audit Log',
      description: 'Complete transaction history and system audit trail',
      icon: <History />,
      tier: 'Platinum',
      color: '#f44336',
      component: AuditLogReport
    }
  ];

  const getAccessibleReports = () => {
    return reportConfigs.filter(report => canAccessReport(report.id));
  };

  const renderReportOverview = () => (
    <Fade in={!selectedReport}>
      <Box>
        {/* Summary Widgets */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <SummaryWidget />
          </Grid>
        </Grid>

        {/* Debug Export Test Section */}
        <Typography variant="h5" gutterBottom sx={{ mb: 3, mt: 4 }}>
          🧪 Export Functionality Test
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <TestExportComponent />
          </Grid>
        </Grid>

        {/* Report Cards */}
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          Available Reports
        </Typography>
        
        <Grid container spacing={3}>
          {getAccessibleReports().map((report) => (
            <Grid item xs={12} sm={6} lg={4} key={report.id}>
              <ReportCard
                title={report.title}
                description={report.description}
                icon={report.icon}
                color={report.color}
                tier={report.tier}
                onClick={() => handleReportSelect(report.id)}
                hasAccess={canAccessReport(report.id)}
                reportType={report.id}
              />
            </Grid>
          ))}
        </Grid>

        {/* Locked Reports */}
        {reportConfigs.filter(report => !canAccessReport(report.id)).length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom color="text.secondary">
              Upgrade to Access More Reports
            </Typography>
            
            <Grid container spacing={3}>
              {reportConfigs
                .filter(report => !canAccessReport(report.id))
                .map((report) => (
                  <Grid item xs={12} sm={6} lg={4} key={report.id}>
                    <ReportCard
                      title={report.title}
                      description={report.description}
                      icon={report.icon}
                      color={report.color}
                      tier={report.tier}
                      onClick={undefined} // No click handler for locked reports
                      hasAccess={false}
                      reportType={report.id}
                    />
                  </Grid>
                ))}
            </Grid>
          </Box>
        )}
      </Box>
    </Fade>
  );

  const renderSelectedReport = () => {
    const reportConfig = reportConfigs.find(r => r.id === selectedReport);
    if (!reportConfig) return null;

    const ReportComponent = reportConfig.component;

    return (
      <Fade in={!!selectedReport}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Button 
              onClick={handleBackToOverview}
              sx={{ mr: 2 }}
              variant="outlined"
            >
              ← Back to Reports
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {reportConfig.icon}
              <Typography variant="h4">
                {reportConfig.title}
              </Typography>
            </Box>
          </Box>
          
          <ReportComponent onBack={handleBackToOverview} />
        </Box>
      </Fade>
    );
  };

  if (!userPlan) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          Financial Reports
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Comprehensive insights into your financial data • Current Plan: {userPlan || 'Basic'}
        </Typography>
      </Box>

      {/* Main Content */}
      {selectedReport ? renderSelectedReport() : renderReportOverview()}
    </Container>
  );
};

export default ReportsPage;
