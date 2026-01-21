import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';

// Simple classnames utility
const cx = (...classes) => classes.filter(Boolean).join(' ');

const BookmarkManager = ({ onBack }) => {
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('bookmarkManager');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('bookmarkCategories');
      return saved ? JSON.parse(saved) : ['General', 'Work', 'Learning', 'Tools'];
    } catch {
      return ['General', 'Work', 'Learning', 'Tools'];
    }
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    localStorage.setItem('bookmarkManager', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('bookmarkCategories', JSON.stringify(categories));
  }, [categories]);

  const addBookmark = () => {
    if (!newUrl.trim()) return;
    const bookmark = {
      id: `bm${Date.now()}`,
      url: newUrl.trim().startsWith('http') ? newUrl.trim() : `https://${newUrl.trim()}`,
      title: newTitle.trim() || new URL(newUrl.trim().startsWith('http') ? newUrl.trim() : `https://${newUrl.trim()}`).hostname,
      category: newCategory,
      createdAt: new Date().toISOString(),
      favicon: `https://www.google.com/s2/favicons?domain=${newUrl.trim().replace(/^https?:\/\//, '').split('/')[0]}&sz=32`
    };
    if (editingId) {
      setBookmarks(prev => prev.map(b => b.id === editingId ? { ...bookmark, id: editingId } : b));
      setEditingId(null);
    } else {
      setBookmarks(prev => [...prev, bookmark]);
    }
    setNewUrl('');
    setNewTitle('');
    setNewCategory('General');
    setShowAddForm(false);
  };

  const deleteBookmark = (id) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const editBookmark = (bookmark) => {
    setEditingId(bookmark.id);
    setNewUrl(bookmark.url);
    setNewTitle(bookmark.title);
    setNewCategory(bookmark.category);
    setShowAddForm(true);
  };

  const addCategory = () => {
    if (!newCategoryName.trim() || categories.includes(newCategoryName.trim())) return;
    setCategories(prev => [...prev, newCategoryName.trim()]);
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const deleteCategory = (cat) => {
    if (cat === 'General') return;
    setCategories(prev => prev.filter(c => c !== cat));
    setBookmarks(prev => prev.map(b => b.category === cat ? { ...b, category: 'General' } : b));
    if (activeCategory === cat) setActiveCategory('All');
  };

  const filteredBookmarks = bookmarks.filter(b => {
    const matchesCategory = activeCategory === 'All' || b.category === activeCategory;
    const matchesSearch = !searchQuery ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryCount = (cat) => bookmarks.filter(b => b.category === cat).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-graystone-100 rounded-lg transition-colors"
          >
            <Icon name="arrow-left" className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-indigo-900">Bookmark Manager</h1>
            <p className="text-sm text-graystone-600">{bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''} saved</p>
          </div>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setEditingId(null); setNewUrl(''); setNewTitle(''); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
        >
          <Icon name="plus" className="w-4 h-4" />
          Add Bookmark
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar - Categories */}
        <div className="w-48 shrink-0">
          <div className="bg-white rounded-xl border border-indigo-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-graystone-700">Categories</h3>
              <button
                onClick={() => setShowAddCategory(true)}
                className="p-1 hover:bg-indigo-50 rounded transition-colors text-indigo-600"
                title="Add category"
              >
                <Icon name="plus" className="w-4 h-4" />
              </button>
            </div>

            {showAddCategory && (
              <div className="mb-3 p-2 bg-indigo-50 rounded-lg">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="w-full px-2 py-1 text-sm border border-indigo-200 rounded focus:outline-none focus:border-indigo-400"
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                />
                <div className="flex gap-1 mt-2">
                  <button onClick={addCategory} className="flex-1 px-2 py-1 bg-indigo-600 text-white text-xs rounded">Add</button>
                  <button onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }} className="flex-1 px-2 py-1 bg-graystone-200 text-graystone-700 text-xs rounded">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <button
                onClick={() => setActiveCategory('All')}
                className={cx(
                  "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between",
                  activeCategory === 'All' ? "bg-indigo-100 text-indigo-700" : "hover:bg-graystone-50 text-graystone-700"
                )}
              >
                <span>All</span>
                <span className="text-xs bg-graystone-200 px-2 py-0.5 rounded-full">{bookmarks.length}</span>
              </button>
              {categories.map(cat => (
                <div key={cat} className="group relative">
                  <button
                    onClick={() => setActiveCategory(cat)}
                    className={cx(
                      "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between",
                      activeCategory === cat ? "bg-indigo-100 text-indigo-700" : "hover:bg-graystone-50 text-graystone-700"
                    )}
                  >
                    <span>{cat}</span>
                    <span className="text-xs bg-graystone-200 px-2 py-0.5 rounded-full">{getCategoryCount(cat)}</span>
                  </button>
                  {cat !== 'General' && (
                    <button
                      onClick={() => deleteCategory(cat)}
                      className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 transition-all"
                      title="Delete category"
                    >
                      <Icon name="x" className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graystone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bookmarks..."
                className="w-full pl-10 pr-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
              <h3 className="font-bold text-indigo-900 mb-3">{editingId ? 'Edit Bookmark' : 'Add Bookmark'}</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">URL *</label>
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">Title (optional)</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="My Bookmark"
                    className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setShowAddForm(false); setEditingId(null); }}
                    className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addBookmark}
                    disabled={!newUrl.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {editingId ? 'Save Changes' : 'Add Bookmark'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bookmarks Grid */}
          {filteredBookmarks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredBookmarks.map(bookmark => (
                <div
                  key={bookmark.id}
                  className="bg-white border border-graystone-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={bookmark.favicon}
                      alt=""
                      className="w-8 h-8 rounded mt-0.5"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-graystone-900 hover:text-indigo-600 transition-colors block truncate"
                      >
                        {bookmark.title}
                      </a>
                      <p className="text-xs text-graystone-500 truncate">{bookmark.url}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">{bookmark.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => editBookmark(bookmark)}
                        className="p-1.5 hover:bg-graystone-100 rounded transition-colors text-graystone-500"
                        title="Edit"
                      >
                        <Icon name="edit-2" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteBookmark(bookmark.id)}
                        className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-500"
                        title="Delete"
                      >
                        <Icon name="trash-2" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-graystone-500">
              <Icon name="bookmark" className="w-12 h-12 mx-auto mb-3 text-graystone-300" />
              <p className="font-medium">{searchQuery ? 'No bookmarks match your search' : 'No bookmarks yet'}</p>
              <p className="text-sm mt-1">Click "Add Bookmark" to save your first link</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookmarkManager;
