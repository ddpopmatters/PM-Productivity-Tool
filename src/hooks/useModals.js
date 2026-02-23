import { useState, useCallback } from 'react';

export function useModals() {
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [subtaskModalEntryId, setSubtaskModalEntryId] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalData, setStatsModalData] = useState({ title: '', items: [] });
  const [showPdfExportModal, setShowPdfExportModal] = useState(false);
  const [pdfExportContext, setPdfExportContext] = useState('dashboard');
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showJobDetailModal, setShowJobDetailModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [showAddItemTypeModal, setShowAddItemTypeModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertSourceItem, setConvertSourceItem] = useState(null);
  const [convertSourceType, setConvertSourceType] = useState(null);

  // Dropdown state
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const openSubtaskModal = useCallback((entryId) => {
    setSubtaskModalEntryId(entryId);
    setShowSubtaskModal(true);
  }, []);

  const closeSubtaskModal = useCallback(() => {
    setShowSubtaskModal(false);
    setSubtaskModalEntryId(null);
  }, []);

  const openStatsModal = useCallback((title, items) => {
    setStatsModalData({ title, items });
    setShowStatsModal(true);
  }, []);

  const openPdfExport = useCallback((context) => {
    setPdfExportContext(context);
    setShowPdfExportModal(true);
  }, []);

  const openConvertModal = useCallback((item, sourceType) => {
    setConvertSourceItem(item);
    setConvertSourceType(sourceType);
    setShowConvertModal(true);
  }, []);

  const closeConvertModal = useCallback(() => {
    setShowConvertModal(false);
    setConvertSourceItem(null);
    setConvertSourceType(null);
  }, []);

  const closeJobDetailModal = useCallback(() => {
    setShowJobDetailModal(false);
    setSelectedJobId(null);
  }, []);

  const closeAllOverlays = useCallback(() => {
    setShowKeyboardHelp(false);
    setShowNotificationsPanel(false);
    setShowQuickAdd(false);
    setShowGlobalSearch(false);
  }, []);

  return {
    showNotificationsPanel, setShowNotificationsPanel,
    showKeyboardHelp, setShowKeyboardHelp,
    showGlobalSearch, setShowGlobalSearch,
    showQuickAdd, setShowQuickAdd,
    showAddItemModal, setShowAddItemModal,
    showSubtaskModal, subtaskModalEntryId,
    openSubtaskModal, closeSubtaskModal,
    showStatsModal, setShowStatsModal, statsModalData, openStatsModal,
    showPdfExportModal, setShowPdfExportModal, pdfExportContext, openPdfExport,
    showAddJobModal, setShowAddJobModal,
    showJobDetailModal, setShowJobDetailModal,
    selectedJobId, setSelectedJobId,
    closeJobDetailModal,
    showAddItemTypeModal, setShowAddItemTypeModal,
    showConvertModal, convertSourceItem, convertSourceType,
    openConvertModal, closeConvertModal,
    showFiltersDropdown, setShowFiltersDropdown,
    showTagsDropdown, setShowTagsDropdown,
    showViewDropdown, setShowViewDropdown,
    showExportMenu, setShowExportMenu,
    closeAllOverlays,
  };
}
