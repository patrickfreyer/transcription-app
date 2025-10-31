import React from 'react';
import { useApp } from '../../context/AppContext';
import ListView from './ListView';
import DetailView from './DetailView';

/**
 * LeftPanel - Wrapper component for left panel in Analysis tab
 * Switches between ListView and DetailView based on leftPanelView state
 */
function LeftPanel() {
  const { leftPanelView } = useApp();

  return (
    <div className="h-full">
      {leftPanelView === 'list' ? <ListView /> : <DetailView />}
    </div>
  );
}

export default LeftPanel;
