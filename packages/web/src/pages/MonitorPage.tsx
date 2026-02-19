/**
 * Monitor Page - Connection Monitoring
 */

import { useAgentStatus, useServices, useTools } from '@/hooks/useAgent';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';
import { MCPServiceStatus } from '@mcp-agent/shared';
import { useTranslation } from '@/hooks/useI18n';

function StatusBadge({ status }: { status: MCPServiceStatus }) {
  const { t } = useTranslation();
  const config = {
    [MCPServiceStatus.RUNNING]: { color: 'success' as const, label: t('services.status.running'), Icon: CheckCircle2 },
    [MCPServiceStatus.STOPPED]: { color: 'default' as const, label: t('services.status.stopped'), Icon: XCircle },
    [MCPServiceStatus.STARTING]: { color: 'warning' as const, label: t('services.status.starting'), Icon: Clock },
    [MCPServiceStatus.ERROR]: { color: 'error' as const, label: t('services.status.error'), Icon: XCircle },
  };

  const { color, label, Icon } = config[status] || config[MCPServiceStatus.STOPPED];

  return (
    <Badge variant={color} className="gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

export function MonitorPage() {
  const { t } = useTranslation();
  const { data: status, isLoading: statusLoading } = useAgentStatus();
  const { data: services, isLoading: servicesLoading } = useServices();
  const { data: tools, isLoading: toolsLoading } = useTools();

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">{t('monitor.agent.status')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {status?.running ? t('monitor.agent.running') : t('monitor.agent.stopped')}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              status?.running && status?.connected
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-gray-100 dark:bg-slate-800'
            }`}>
              <Activity className={`w-6 h-6 ${
                status?.running && status?.connected
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-400'
              }`} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">{t('monitor.service.total')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {status?.services.total || 0}
              </p>
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-500">
              {t('monitor.service.running')}: {status?.services.running || 0}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">{t('monitor.tool.total')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {tools?.tools.length || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">{t('monitor.uptime')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {status?.uptime ? `${Math.floor(status.uptime / 60)}m` : '-'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Xiaozhi Connection */}
      {status?.xiaozhi && (
        <Card>
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('monitor.xiaozhi.connection')}</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {status.xiaozhi.connected ? t('monitor.xiaozhi.connected') : t('monitor.xiaozhi.disconnected')}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {status.xiaozhi.endpoint || t('monitor.xiaozhi.unconfigured')}
                </p>
              </div>
              <Badge variant={status.xiaozhi.connected ? 'success' : 'default'}>
                {status.xiaozhi.connected ? t('monitor.xiaozhi.online') : t('monitor.xiaozhi.offline')}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Services List */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('monitor.service.status')}</h3>
        </div>
        <div className="p-6">
          {servicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
            </div>
          ) : services?.services && services.services.length > 0 ? (
            <div className="space-y-3">
              {services.services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {service.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate mt-0.5">
                      {service.description || service.id}
                    </p>
                    {service.serverInfo && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                        {service.serverInfo.name} v{service.serverInfo.version}
                      </p>
                    )}
                    {service.error && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {service.error}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={service.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-slate-400 py-8">
              {t('monitor.service.empty')}
            </p>
          )}
        </div>
      </Card>

      {/* Tools List */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('monitor.tool.total')}</h3>
        </div>
        <div className="p-6">
          {toolsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
            </div>
          ) : tools?.tools && tools.tools.length > 0 ? (
            <div className="space-y-2">
              {tools.tools.map((tool, idx) => (
                <div
                  key={`${tool.serviceId}-${tool.name}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-slate-700"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {tool.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                      {tool.description}
                    </p>
                  </div>
                  <Badge variant="default" className="ml-3">
                    {tool.serviceName}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-slate-400 py-8">
              {t('monitor.tool.empty')}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
