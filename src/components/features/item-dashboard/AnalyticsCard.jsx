import { Icon } from '../../ui';

export default function AnalyticsCard({ analytics }) {
  if (!analytics) return null;

  return (
    <div className="bg-gradient-to-br from-ocean-900 to-ocean-800 rounded-3xl p-6 text-white shadow-lg">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Icon name="bar-chart-2" className="w-5 h-5" />
        Analytics
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
          <div className="text-xs text-ocean-200 mb-1">Views</div>
          <div className="text-xl font-bold">{analytics.views || 0}</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
          <div className="text-xs text-ocean-200 mb-1">Clicks</div>
          <div className="text-xl font-bold">{analytics.clicks || 0}</div>
        </div>
      </div>
    </div>
  );
}
