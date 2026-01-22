import React, { useState } from 'react';
import clsx from 'clsx';
import Icon from '../../ui/Icon';

const FilterBar = ({
  title,
  subtitle,
  searchQuery,
  setSearchQuery,
  filterTags,
  setFilterTags,
  filterUsers,
  setFilterUsers,
  filterTeams,
  setFilterTeams,
  availableTags,
  viewMode,
  setViewMode,
  showArchived,
  setShowArchived,
  savedFilters = [],
  onSaveFilter,
  onApplyFilter,
  onDeleteFilter,
  TEAMS = [],
  USERS = []
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');

  const toggleFilter = (item, currentList, setList) => {
    if (currentList.includes(item)) {
      setList(currentList.filter(i => i !== item));
    } else {
      setList([...currentList, item]);
    }
  };

  const activeFiltersCount = filterUsers.length + filterTeams.length;
  const activeTagsCount = filterTags.length;

  return (
    <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-6 text-white shadow-xl mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">{title}</h1>
          <p className="text-ocean-100 text-sm">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative group">
            <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ocean-200 group-focus-within:text-ocean-600 transition-colors" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white placeholder-ocean-200 focus:outline-none focus:bg-white focus:text-ocean-900 focus:placeholder-graystone-400 transition-all w-48 focus:w-64"
            />
          </div>

          {/* Filters Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowFilters(!showFilters); setShowTags(false); setShowViewMenu(false); }}
              className={clsx(
                "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                showFilters || activeFiltersCount > 0
                  ? "bg-white text-ocean-700 border-white shadow-sm"
                  : "bg-black/20 text-white border-white/10 hover:bg-white/10"
              )}
            >
              <Icon name="filter" className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="bg-ocean-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="absolute top-full right-0 mt-2 w-full md:w-64 bg-white rounded-xl shadow-xl border border-ocean-100 p-3 md:p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-graystone-500 uppercase mb-2">Teams</h4>
                    <div className="space-y-1">
                      {TEAMS.map(team => (
                        <label key={team} className="flex items-center gap-2 p-1.5 hover:bg-ocean-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filterTeams.includes(team)}
                            onChange={() => toggleFilter(team, filterTeams, setFilterTeams)}
                            className="rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                          />
                          <span className="text-sm text-ocean-900">{team}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-ocean-50 pt-3">
                    <h4 className="text-xs font-bold text-graystone-500 uppercase mb-2">Users</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {USERS.map(user => (
                        <label key={user} className="flex items-center gap-2 p-1.5 hover:bg-ocean-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filterUsers.includes(user)}
                            onChange={() => toggleFilter(user, filterUsers, setFilterUsers)}
                            className="rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                          />
                          <span className="text-sm text-ocean-900">{user}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Show Archived Toggle */}
                  {setShowArchived && (
                    <div className="border-t border-ocean-50 pt-3">
                      <label className="flex items-center justify-between p-1.5 hover:bg-ocean-50 rounded cursor-pointer">
                        <span className="text-sm text-ocean-900 flex items-center gap-2">
                          <Icon name="archive" className="w-4 h-4 text-graystone-500" />
                          Show Archived
                        </span>
                        <div
                          className={clsx(
                            "w-10 h-5 rounded-full transition-colors relative cursor-pointer",
                            showArchived ? "bg-ocean-500" : "bg-graystone-300"
                          )}
                          onClick={() => setShowArchived(!showArchived)}
                        >
                          <div className={clsx(
                            "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                            showArchived ? "translate-x-5" : "translate-x-0.5"
                          )}></div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tags Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowTags(!showTags); setShowFilters(false); setShowViewMenu(false); }}
              className={clsx(
                "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                showTags || activeTagsCount > 0
                  ? "bg-white text-ocean-700 border-white shadow-sm"
                  : "bg-black/20 text-white border-white/10 hover:bg-white/10"
              )}
            >
              <Icon name="tag" className="w-4 h-4" />
              Tags
              {activeTagsCount > 0 && (
                <span className="bg-ocean-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                  {activeTagsCount}
                </span>
              )}
            </button>

            {showTags && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-ocean-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                <h4 className="text-xs font-bold text-graystone-500 uppercase mb-2">Filter by Tags</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {availableTags.map(tag => (
                    <label key={tag} className="flex items-center gap-2 p-1.5 hover:bg-ocean-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterTags.includes(tag)}
                        onChange={() => toggleFilter(tag, filterTags, setFilterTags)}
                        className="rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                      />
                      <span className="text-sm text-ocean-900">{tag}</span>
                    </label>
                  ))}
                  {availableTags.length === 0 && (
                    <p className="text-xs text-graystone-400 italic p-2">No tags available</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Saved Filters Dropdown */}
          {onSaveFilter && (
            <div className="relative">
              <button
                onClick={() => { setShowSavedFilters(!showSavedFilters); setShowFilters(false); setShowTags(false); setShowViewMenu(false); }}
                className={clsx(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                  showSavedFilters
                    ? "bg-white text-ocean-700 border-white shadow-sm"
                    : "bg-black/20 text-white border-white/10 hover:bg-white/10"
                )}
              >
                <Icon name="bookmark" className="w-4 h-4" />
                Saved
                {savedFilters.length > 0 && (
                  <span className="bg-ocean-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                    {savedFilters.length}
                  </span>
                )}
              </button>

              {showSavedFilters && (
                <div className="absolute top-full right-0 mt-2 w-full md:w-64 bg-white rounded-xl shadow-xl border border-ocean-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-graystone-500 uppercase">Saved Filters</h4>
                    {(searchQuery || filterTags.length > 0 || filterUsers.length > 0 || filterTeams.length > 0) && (
                      <button
                        onClick={() => { setShowSaveModal(true); setShowSavedFilters(false); }}
                        className="text-xs text-ocean-600 hover:text-ocean-700 font-medium flex items-center gap-1"
                      >
                        <Icon name="plus" className="w-3 h-3" />
                        Save Current
                      </button>
                    )}
                  </div>

                  {savedFilters.length === 0 ? (
                    <p className="text-xs text-graystone-400 italic py-2">
                      No saved filters yet. Apply filters and click "Save Current" to save them.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {savedFilters.map(filter => (
                        <div key={filter.id} className="flex items-center justify-between p-2 hover:bg-ocean-50 rounded-lg group">
                          <button
                            onClick={() => { onApplyFilter(filter); setShowSavedFilters(false); }}
                            className="flex-1 text-left text-sm text-ocean-900 font-medium"
                          >
                            {filter.name}
                          </button>
                          <button
                            onClick={() => onDeleteFilter(filter.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-graystone-400 hover:text-red-500"
                          >
                            <Icon name="trash-2" className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Save Filter Modal */}
          {showSaveModal && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="fixed inset-0" onClick={() => setShowSaveModal(false)} />
              <div className="relative bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
                <h3 className="text-lg font-bold text-ocean-900 mb-4">Save Current Filter</h3>
                <input
                  type="text"
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  placeholder="Filter name (e.g., 'My High Priority')"
                  className="w-full px-3 py-2 border border-graystone-300 rounded-lg mb-4"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFilterName.trim()) {
                      onSaveFilter(newFilterName);
                      setNewFilterName('');
                      setShowSaveModal(false);
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newFilterName.trim()) {
                        onSaveFilter(newFilterName);
                        setNewFilterName('');
                        setShowSaveModal(false);
                      }
                    }}
                    disabled={!newFilterName.trim()}
                    className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50"
                  >
                    Save Filter
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowViewMenu(!showViewMenu); setShowFilters(false); setShowTags(false); }}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border bg-black/20 text-white border-white/10 hover:bg-white/10"
            >
              <Icon
                name={
                  viewMode === 'kanban' ? 'kanban' :
                    viewMode === 'table' ? 'table' :
                      viewMode === 'gantt' ? 'bar-chart-2' :
                        viewMode === 'calendar' ? 'calendar' : 'layout-grid'
                }
                className="w-4 h-4"
              />
              <span className="capitalize">Project view</span>
              <span className="text-[11px] text-white/80 px-2 py-0.5 rounded-full bg-white/10">
                {viewMode === 'kanban' ? 'Board' : viewMode}
              </span>
              <Icon name="chevron-down" className="w-3 h-3 ml-1 opacity-70" />
            </button>

            {showViewMenu && (
              <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-ocean-100 p-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                {[
                  { id: 'kanban', label: 'Board', icon: 'kanban' },
                  { id: 'table', label: 'Table', icon: 'table' },
                  { id: 'gantt', label: 'Gantt', icon: 'bar-chart-2' },
                  { id: 'calendar', label: 'Calendar', icon: 'calendar' }
                ].map(view => (
                  <button
                    key={view.id}
                    onClick={() => { setViewMode(view.id); setShowViewMenu(false); }}
                    className={clsx(
                      "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                      viewMode === view.id
                        ? "bg-ocean-50 text-ocean-700"
                        : "text-graystone-600 hover:bg-graystone-50 hover:text-ocean-900"
                    )}
                  >
                    <Icon name={view.icon} className="w-4 h-4" />
                    {view.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters Chips */}
      {
        (activeFiltersCount > 0 || activeTagsCount > 0) && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
            {filterTeams.map(team => (
              <button
                key={`team-${team}`}
                onClick={() => toggleFilter(team, filterTeams, setFilterTeams)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors border border-white/10"
              >
                <span>{team}</span>
                <Icon name="x" className="w-3 h-3 opacity-70 hover:opacity-100" />
              </button>
            ))}
            {filterUsers.map(user => (
              <button
                key={`user-${user}`}
                onClick={() => toggleFilter(user, filterUsers, setFilterUsers)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors border border-white/10"
              >
                <span>{user}</span>
                <Icon name="x" className="w-3 h-3 opacity-70 hover:opacity-100" />
              </button>
            ))}
            {filterTags.map(tag => (
              <button
                key={`tag-${tag}`}
                onClick={() => toggleFilter(tag, filterTags, setFilterTags)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors border border-white/10"
              >
                <Icon name="tag" className="w-3 h-3 opacity-70" />
                <span>{tag}</span>
                <Icon name="x" className="w-3 h-3 opacity-70 hover:opacity-100" />
              </button>
            ))}
          </div>
        )
      }
    </div>
  );
};

export default FilterBar;
