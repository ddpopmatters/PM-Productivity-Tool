import React from 'react';

/**
 * Pagination - Table/list pagination with items per page selector
 *
 * @param {number} currentPage - Current page number (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {number} totalItems - Total number of items
 * @param {number} itemsPerPage - Items shown per page
 * @param {function} onPageChange - Called with new page number
 * @param {function} onItemsPerPageChange - Called with new items per page value
 */
const Pagination = React.memo(function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-white border-t border-graystone-200">
      <div className="flex items-center gap-4">
        <span className="text-sm text-graystone-600">
          Showing <span className="font-medium">{startItem}-{endItem}</span> of <span className="font-medium">{totalItems}</span> items
        </span>
        <div className="flex items-center gap-2">
          <label className="text-sm text-graystone-500">Per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              onItemsPerPageChange(Number(e.target.value));
              onPageChange(1); // Reset to first page
            }}
            className="px-2 py-1 text-sm border border-graystone-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={999999}>All</option>
          </select>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 text-sm text-graystone-600 hover:bg-graystone-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title="First page"
            aria-label="First page"
          >
            <i data-lucide="chevrons-left" className="w-4 h-4"></i>
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 text-sm text-graystone-600 hover:bg-graystone-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title="Previous page"
            aria-label="Previous page"
          >
            <i data-lucide="chevron-left" className="w-4 h-4"></i>
          </button>

          <span className="px-3 py-1 text-sm text-graystone-700">
            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-sm text-graystone-600 hover:bg-graystone-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title="Next page"
            aria-label="Next page"
          >
            <i data-lucide="chevron-right" className="w-4 h-4"></i>
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-sm text-graystone-600 hover:bg-graystone-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title="Last page"
            aria-label="Last page"
          >
            <i data-lucide="chevrons-right" className="w-4 h-4"></i>
          </button>
        </div>
      )}
    </div>
  );
});

export default Pagination;
