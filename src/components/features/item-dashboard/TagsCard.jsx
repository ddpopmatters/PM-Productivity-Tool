export default function TagsCard({ entry }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
      <h3 className="text-lg font-bold text-ocean-900 mb-3">Tags</h3>
      <div className="flex flex-wrap gap-2">
        {entry.campaign && (
          <span className="px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
            {entry.campaign}
          </span>
        )}
        {entry.contentPillar && (
          <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
            {entry.contentPillar}
          </span>
        )}
        {entry.platforms &&
          entry.platforms.map((p) => (
            <span
              key={p}
              className="px-2 py-1 rounded-md bg-graystone-100 text-graystone-700 text-xs font-medium"
            >
              {p}
            </span>
          ))}
      </div>
    </div>
  );
}
