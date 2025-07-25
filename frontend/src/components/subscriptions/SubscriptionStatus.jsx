/**
 * Subscription Status Component
 * Shows current subscription status in the header
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import subscriptionAPI from '../../services/subscriptions/subscriptionAPI';

const SubscriptionStatus = () => {
  const [subscription, setSubscription] = useState(null);
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      const data = await subscriptionAPI.getSubscriptionDetails();
      setSubscription(data.subscription);
      setFeatures(data.features);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPlan = () => {
    if (subscription && subscription.plan_id) {
      return subscription.plan_id.toUpperCase();
    }
    return 'BASIC';
  };

  const getPlanColor = () => {
    const plan = getCurrentPlan();
    switch (plan) {
      case 'PLATINUM':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PREMIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleUpgrade = () => {
    navigate('/subscriptions');
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
        <div className="w-16 h-4 bg-gray-300 rounded animate-pulse"></div>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();
  const isBasic = currentPlan === 'BASIC';

  return (
    <div className="flex items-center space-x-2">
      {/* Plan Badge */}
      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getPlanColor()}`}>
        {currentPlan}
      </div>

      {/* Upgrade Button for Basic Users */}
      {isBasic && (
        <button
          onClick={handleUpgrade}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
          title="Upgrade your subscription"
        >
          Upgrade
        </button>
      )}

      {/* Documents Counter */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {features.max_documents === 999999 ? '∞' : features.max_documents} docs
      </div>
    </div>
  );
};

export default SubscriptionStatus;
