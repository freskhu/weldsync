"use client";

interface DeadlineAlert {
  projectId: string;
  projectName: string;
  projectColor: string;
  clientRef: string;
  deadline: string;
  pendingPieces: number;
  daysRemaining: number;
  isOverdue: boolean;
}

interface DeadlineAlertsProps {
  alerts: DeadlineAlert[];
}

export function DeadlineAlerts({ alerts }: DeadlineAlertsProps) {
  return (
    <div>
      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-5">
        Alertas de Prazo
      </h2>
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-slate-400">
          <svg className="w-8 h-8 mb-2 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-medium">Sem alertas</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-[220px] overflow-y-auto">
          {alerts.map((alert) => {
            const isOverdue = alert.isOverdue;
            const isUrgent = alert.daysRemaining <= 3;

            const badgeClass = isOverdue
              ? "bg-red-100 text-red-700"
              : isUrgent
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600";

            const iconColor = isOverdue
              ? "text-red-500"
              : isUrgent
                ? "text-amber-500"
                : "text-slate-400";

            const deadlineDate = new Date(alert.deadline);
            const formattedDeadline = deadlineDate.toLocaleDateString("pt-PT", {
              day: "2-digit",
              month: "short",
            });

            return (
              <div
                key={alert.projectId}
                className="flex items-center justify-between p-3 rounded-[10px] bg-white border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Alert icon */}
                  <div className={`shrink-0 ${iconColor}`}>
                    {isOverdue ? (
                      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  {/* Project info */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {alert.projectName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {alert.clientRef}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-xs text-slate-500">
                    {alert.pendingPieces} peca
                    {alert.pendingPieces !== 1 ? "s" : ""}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}
                  >
                    {isOverdue
                      ? `${Math.abs(alert.daysRemaining)}d atrasado`
                      : alert.daysRemaining === 0
                        ? "Hoje"
                        : `${alert.daysRemaining}d`}
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {formattedDeadline}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
